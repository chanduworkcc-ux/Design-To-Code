import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "../lib/objectStorage";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { setConfig } from "../lib/config";

const LOCAL_UPLOADS_DIR = path.join(__dirname, "../public/uploads");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const RequestUploadUrlBody = z.object({
  name: z.string().min(1),
  size: z.number().positive(),
  contentType: z.string().min(1),
});

// In-memory store for pending local uploads (token → filename + expiry)
const pendingLocalUploads = new Map<string, { filename: string; expires: number }>();

// ─── Direct multipart image upload (admin products) ───────────────────────────
router.post("/storage/uploads/image", authMiddleware, adminMiddleware, upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided." });
    return;
  }
  try {
    const ext = (req.file.mimetype.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const objectId = randomUUID();
    const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "";
    const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";

    if (privateDir) {
      const objectPath = `${privateDir}/uploads/${objectId}.${ext}`;
      const parts = objectPath.startsWith("/") ? objectPath.slice(1).split("/") : objectPath.split("/");
      const bucketName = parts[0];
      const objectName = parts.slice(1).join("/");
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { contentType: req.file.mimetype });
      const servingPath = `/objects/uploads/${objectId}.${ext}`;
      const imageUrl = `${baseUrl}/api/storage${servingPath}`;
      res.json({ imageUrl, objectPath: servingPath });
    } else {
      fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
      const filename = `lu-${objectId}.${ext}`;
      fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, filename), req.file.buffer);
      const imageUrl = `${baseUrl}/api/uploads/${filename}`;
      res.json({ imageUrl, objectPath: filename });
    }
  } catch (error) {
    console.error("Image upload error", error);
    res.status(500).json({ error: "Failed to upload image." });
  }
});

// ─── Request a signed upload URL (support ticket images, logo, etc.) ──────────
router.post("/storage/uploads/request-url", authMiddleware, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;

  // Local fallback when Replit Object Storage is not configured
  if (!process.env.PRIVATE_OBJECT_DIR) {
    try {
      const token = randomUUID();
      const ext = (contentType.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const filename = `lu-${randomUUID()}.${ext}`;
      pendingLocalUploads.set(token, { filename, expires: Date.now() + 15 * 60 * 1000 });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";
      const uploadURL = `${baseUrl}/api/storage/uploads/local/${token}`;
      const objectPath = filename;
      const servingUrl = `${baseUrl}/api/storage/objects/${encodeURIComponent(filename)}`;

      res.json({ uploadURL, objectPath, servingUrl, metadata: { name, size, contentType } });
    } catch (error) {
      console.error("Error generating local upload URL", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("Error generating upload URL", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// ─── Receive local file PUT (fallback when Object Storage not configured) ──────
router.put("/storage/uploads/local/:token", async (req: Request, res: Response) => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const pending = pendingLocalUploads.get(token);
  if (!pending || Date.now() > pending.expires) {
    res.status(404).json({ error: "Upload token not found or expired" });
    return;
  }

  try {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, pending.filename), buffer);
        pendingLocalUploads.delete(token);
        res.status(200).end();
      } catch (writeErr) {
        console.error("Local upload write error", writeErr);
        res.status(500).json({ error: "Failed to save file" });
      }
    });
    req.on("error", () => {
      res.status(500).json({ error: "Upload stream error" });
    });
  } catch (error) {
    console.error("Local upload error", error);
    res.status(500).json({ error: "Failed to save uploaded file" });
  }
});

// ─── Save uploaded logo path to config ────────────────────────────────────────
router.post("/storage/uploads/logo", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { objectPath, variant } = req.body;
  if (!objectPath || typeof objectPath !== "string") {
    res.status(400).json({ error: "objectPath is required" });
    return;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "";

  // Local uploads use /api/uploads/{filename}; GCS objects use /api/storage/objects/{path}
  const logoUrl = objectPath.startsWith("lu-")
    ? `${baseUrl}/api/uploads/${objectPath}`
    : `${baseUrl}/api/storage/objects/${objectPath}`;

  const configKey = variant === "no_bg" ? "logo_url_without_bg" : "logo_url";
  await setConfig(configKey, logoUrl);
  res.json({ logoUrl, variant: configKey });
});

// ─── Serve public objects from Object Storage ──────────────────────────────────
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    const readStream = file.createReadStream();
    Readable.from(readStream).pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    console.error("Error serving public object", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

// ─── Serve objects: local fallback then GCS ────────────────────────────────────
router.get("/storage/objects/*objectPath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.objectPath;
    const objectPath = Array.isArray(raw) ? raw.join("/") : raw;

    // Local file fallback (when Object Storage is not configured)
    if (!process.env.PRIVATE_OBJECT_DIR) {
      // objectPath is a plain filename like "lu-{uuid}.jpg" (no slashes)
      const safeName = path.basename(objectPath);
      const localPath = path.join(LOCAL_UPLOADS_DIR, safeName);
      if (fs.existsSync(localPath)) {
        const ext = path.extname(safeName).slice(1).toLowerCase();
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
          gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
        };
        res.setHeader("Content-Type", mimeMap[ext] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("Access-Control-Allow-Origin", "*");
        fs.createReadStream(localPath).pipe(res);
        return;
      }
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const file = await objectStorageService.getObjectEntityFile(objectPath);
    if (!file) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const readStream = file.createReadStream();
    Readable.from(readStream).pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    console.error("Error serving object", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;

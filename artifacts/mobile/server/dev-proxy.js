/**
 * Dev proxy for Expo Metro bundler.
 * 
 * Replit routes /mobile/ to this service's $PORT. Metro's generated HTML has
 * bundle/asset URLs at absolute paths like /node_modules/... that the browser
 * then requests without the /mobile/ prefix, causing 404s.
 *
 * This proxy:
 *  1. Listens on $PORT (the Replit-assigned port for this artifact)
 *  2. Strips the /mobile prefix before forwarding to Metro (on METRO_PORT)
 *  3. Rewrites HTML responses to prefix asset src/href paths with /mobile
 *     so the browser requests /mobile/node_modules/... which routes back here
 */

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const METRO_PORT = parseInt(process.env.METRO_PORT || "18100", 10);
const BASE_PATH = "/mobile";
const projectRoot = path.resolve(__dirname, "..");

function rewriteHtml(html) {
  return html
    .replace(/\ssrc="(\/[^"]+)"/g, (m, p) => ` src="${BASE_PATH}${p}"`)
    .replace(/\shref="(\/[^"]+)"/g, (m, p) => ` href="${BASE_PATH}${p}"`);
}

function startMetro() {
  const env = {
    ...process.env,
    PORT: String(METRO_PORT),
    EXPO_PACKAGER_PROXY_URL: `https://${process.env.REPLIT_EXPO_DEV_DOMAIN || "localhost"}`,
    EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN || "localhost",
    EXPO_PUBLIC_REPL_ID: process.env.REPL_ID || "",
    REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN || "localhost",
  };

  const metro = spawn(
    "pnpm",
    ["exec", "expo", "start", "--localhost", "--port", String(METRO_PORT)],
    { cwd: projectRoot, env, stdio: "inherit" }
  );

  metro.on("error", (err) => {
    console.error("[proxy] Metro spawn error:", err.message);
    process.exit(1);
  });

  metro.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error("[proxy] Metro exited with code", code);
      process.exit(code ?? 1);
    }
  });

  process.on("SIGTERM", () => { metro.kill("SIGTERM"); process.exit(0); });
  process.on("SIGINT",  () => { metro.kill("SIGINT");  process.exit(0); });

  return metro;
}

function proxyRequest(req, res) {
  let targetPath = req.url || "/";

  if (targetPath.startsWith(BASE_PATH + "/")) {
    targetPath = targetPath.slice(BASE_PATH.length);
  } else if (targetPath === BASE_PATH) {
    targetPath = "/";
  }

  // Health-check endpoint: respond immediately so Replit marks the service
  // as reachable even before Metro has fully warmed up.
  if (targetPath === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // SPA fallback: paths without a file extension are app routes, not static
  // assets. Forward them all to "/" so Metro always returns index.html and
  // lets the client-side Expo Router do the matching — this prevents the
  // "+not-found" flash on hard refresh from any deep link.
  const isAsset = /\.\w{1,6}(\?.*)?$/.test(targetPath.split("?")[0]);
  const isMetroInternal =
    targetPath.startsWith("/_expo") ||
    targetPath.startsWith("/bundle") ||
    targetPath.startsWith("/packages") ||
    targetPath.startsWith("/node_modules") ||
    targetPath.startsWith("/index.bundle") ||
    targetPath.startsWith("/debugger") ||
    targetPath.startsWith("/logs") ||
    targetPath.startsWith("/reload") ||
    targetPath.startsWith("/symbolicate") ||
    targetPath.startsWith("/open-stack-frame") ||
    targetPath.startsWith("/assets");
  if (!isAsset && !isMetroInternal && targetPath !== "/") {
    targetPath = "/";
  }

  const forwardHeaders = { ...req.headers, host: `localhost:${METRO_PORT}` };
  delete forwardHeaders["origin"];
  delete forwardHeaders["referer"];

  const options = {
    hostname: "127.0.0.1",
    port: METRO_PORT,
    path: targetPath,
    method: req.method,
    headers: forwardHeaders,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const contentType = proxyRes.headers["content-type"] || "";
    const isHtml = contentType.includes("text/html");

    if (!isHtml) {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
      return;
    }

    let body = "";
    proxyRes.setEncoding("utf8");
    proxyRes.on("data", (chunk) => { body += chunk; });
    proxyRes.on("end", () => {
      const rewritten = rewriteHtml(body);
      const headers = { ...proxyRes.headers };
      delete headers["content-length"];
      res.writeHead(proxyRes.statusCode, headers);
      res.end(rewritten);
    });
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Upstream error: " + err.message);
    }
  });

  req.pipe(proxyReq);
}

startMetro();

const server = http.createServer(proxyRequest);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[proxy] Listening on port ${PORT} → Metro on port ${METRO_PORT}`);
});

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
const METRO_PORT = parseInt(process.env.METRO_PORT || "18200", 10);
const BASE_PATH = "/mobile";
const projectRoot = path.resolve(__dirname, "..");

function rewriteHtml(html) {
  return html
    .replace(/\ssrc="(\/[^"]+)"/g, (m, p) => ` src="${BASE_PATH}${p}"`)
    .replace(/\shref="(\/[^"]+)"/g, (m, p) => ` href="${BASE_PATH}${p}"`)
    .replace(/<script[^>]*replit[^>]*><\/script>/gi, "")
    .replace(/<script[^>]*src="[^"]*replit[^"]*"[^>]*><\/script>/gi, "")
    .replace('</head>', `<style>
      iframe[src*="replit"],
      div[class*="replit-badge"],div[id*="replit-badge"],
      [data-replit-badge],a[href*="replit.com/badge"] { display:none!important; }
    </style><script>
      (function(){
        function removeBadge(){
          document.querySelectorAll('iframe,div,a').forEach(function(el){
            var src = el.src||el.href||'';
            var cls = el.className||'';
            var id = el.id||'';
            if(src.includes('replit')||cls.includes('replit')||id.includes('replit')||el.getAttribute('data-replit-badge')!=null){
              el.remove();
            }
          });
        }
        var obs = new MutationObserver(removeBadge);
        obs.observe(document.documentElement,{childList:true,subtree:true});
        document.addEventListener('DOMContentLoaded', removeBadge);
        setTimeout(removeBadge, 500);
        setTimeout(removeBadge, 1500);
        setTimeout(removeBadge, 3000);
      })();
    </script></head>`);
}

let metroAvailable = false;

function startMetro() {
  const expoBin = path.resolve(projectRoot, "node_modules/.bin/expo");
  const fs = require("fs");
  if (!fs.existsSync(expoBin)) {
    console.warn("[proxy] expo binary not found at", expoBin);
    console.warn("[proxy] Running in degraded mode — Metro unavailable.");
    console.warn("[proxy] To enable Metro, install mobile dependencies:");
    console.warn("[proxy]   pnpm install --filter @workspace/mobile...");
    return null;
  }

  metroAvailable = true;
  const env = {
    ...process.env,
    PORT: String(METRO_PORT),
    EXPO_PACKAGER_PROXY_URL: `https://${process.env.REPLIT_EXPO_DEV_DOMAIN || "localhost"}`,
    EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN || "localhost",
    EXPO_PUBLIC_REPL_ID: process.env.REPL_ID || "",
    REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN || "localhost",
  };

  const metro = spawn(
    expoBin,
    ["start", "--localhost", "--port", String(METRO_PORT)],
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
    res.end(JSON.stringify({ status: metroAvailable ? "ok" : "degraded" }));
    return;
  }

  // Degraded mode: expo binary missing (e.g. install blocked by package firewall).
  // Serve a plain informational page instead of crashing.
  if (!metroAvailable) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>XyloCart Mobile</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa}
.card{max-width:480px;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center}
h1{color:#1a1a2e;font-size:1.4rem}p{color:#555;line-height:1.6}code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:.875rem}</style>
</head><body><div class="card">
<h1>📱 XyloCart Mobile</h1>
<p>The Expo/Metro dev server is unavailable because <code>expo</code> dependencies could not be installed.</p>
<p>The mobile app requires a physical device or simulator running <strong>Expo Go</strong>. The API server is running and fully functional.</p>
</div></body></html>`);
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

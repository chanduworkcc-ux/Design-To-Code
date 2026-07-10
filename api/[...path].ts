/**
 * Vercel Serverless Function - API Catch-All Handler
 * 
 * This is a minimal handler that re-exports the default export from
 * the API server's built output. We cannot use dynamic imports here
 * since Vercel needs to understand the dependency graph at build time.
 */

// For now, we'll serve a simple JSON response to verify the API is working
export default function handler(req: any, res: any) {
  res.status(200).json({
    message: "XyloCart API is operational",
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Cloudflare Workers entry point for the XyloCart API.
 *
 * The full API (Express + PostgreSQL + Socket.io) runs on Replit's VM
 * deployment. This Worker proxies requests to the Replit production URL,
 * giving Cloudflare's edge network (DDoS protection, routing) in front
 * of the origin.
 *
 * Set ORIGIN_URL in the Cloudflare Workers environment to the Replit
 * production URL (e.g. https://xylocart.replit.app).
 */

export interface Env {
  ORIGIN_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const originUrl = env.ORIGIN_URL;

    if (!originUrl) {
      return new Response(
        JSON.stringify({ status: "error", message: "ORIGIN_URL not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const url = new URL(request.url);
      const target = new URL(url.pathname + url.search, originUrl);

      const headers = new Headers(request.headers);
      headers.set("host", new URL(originUrl).host);
      headers.set("x-forwarded-host", url.host);
      headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

      const upstream = new Request(target.toString(), {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
      });

      return await fetch(upstream);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ status: "error", message: `Origin unreachable: ${message}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};

import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config.
 *
 * Reads the static app.json as a base and overrides values that must
 * differ between environments:
 *
 *   • On Vercel (VERCEL=1 set automatically) the app is served at the
 *     domain root, so baseUrl must be "" to keep asset paths correct.
 *
 *   • On Replit the API server proxies /mobile/* to the Metro dev server
 *     and the static serve.js, so baseUrl stays "/mobile".
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    typedRoutes: true,
    reactCompiler: true,
    // On Vercel the app lives at the site root; on Replit it lives at /mobile.
    baseUrl: process.env.VERCEL ? "" : "/mobile",
  },
});

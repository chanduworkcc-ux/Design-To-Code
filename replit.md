# XyloCart

A full-stack mobile commerce platform (Expo/React Native + Express API) with an admin panel, real-time Socket.io events, and PostgreSQL via Drizzle ORM.

## Architecture

| Layer | Package | Port |
|---|---|---|
| API server | `artifacts/api-server` (`@workspace/api-server`) | 5000 (dev), 8080 (artifact) |
| Mobile/web app | `artifacts/mobile` (`@workspace/mobile`) | 18115 (proxy) → 18200 (Metro) |
| Mockup sandbox | `artifacts/mockup-sandbox` (`@workspace/mockup-sandbox`) | 8081 |
| Shared DB schema | `lib/db` (`@workspace/db`) | — |
| Shared Zod types | `lib/api-zod` (`@workspace/api-zod`) | — |
| API client (React) | `lib/api-client-react` (`@workspace/api-client-react`) | — |

## Running the project

All services start automatically via the configured workflows. The main preview URL (`/mobile/`) proxies to the Expo Metro bundler.

- **API health check:** `GET /health`
- **Admin panel:** `/admin` (login with admin credentials)
- **Mobile web app:** `/mobile/`

## Key workflows

- `Start application` — runs the API server on port 5000 (legacy combined workflow)
- `artifacts/api-server: API Server` — runs the API server as an artifact on port 8080
- `artifacts/mobile: expo` — runs the Expo Metro dev proxy on port 18115
- `artifacts/mockup-sandbox: Component Preview Server` — runs the UI component preview server on port 8081

## Dev start sequence (api-server)

`artifacts/api-server/dev-start.sh` does on every start:
1. Install deps if `node_modules` missing
2. Push DB schema via `drizzle-kit push`
3. Build the server (`esbuild`)
4. Start with `nodemon`-style auto-restart

## Environment secrets

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `SESSION_SECRET` | JWT / session signing (required) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email sending (optional) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `GCS_BUCKET_NAME`, `GOOGLE_APPLICATION_CREDENTIALS` | Cloud Storage for uploads (optional) |

Email sending is silently skipped when SMTP is not configured. Google auth and GCS uploads require their respective secrets.

## User preferences

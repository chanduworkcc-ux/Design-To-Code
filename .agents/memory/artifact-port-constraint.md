---
name: Artifact workflow PORT constraint
description: Replit's artifact runtime for the api-server injects PORT=8080 and waits for that port to open; overriding it causes the workflow to time out.
---

## Rule
Never force `PORT` to a different value in `dev-start.sh` or any dev script for the api-server artifact workflow. Replit's artifact runtime pre-sets `PORT=8080` and watches for that port to open before marking the workflow as RUNNING. Overriding it (e.g., `export PORT=5000`) causes the workflow to time out with "didn't open port 8080".

**Why:** Artifact workflows have a port-readiness check baked in. For `artifacts/api-server`, that check is hardcoded to port 8080. Changing the port the server binds to breaks this check.

**How to apply:**
- In dev, the server runs on **port 8080** (set by the artifact runtime).
- In production (`[deployment].run` in `.replit`), the server runs on **PORT=5000** — that's fine because the artifact wrapper is not involved in production.
- The `.replit` port mapping `localPort = 8080, externalPort = 80` is what makes port 8080 visible in the Replit preview pane.
- Safe default: `export PORT="${PORT:-8080}"` — lets the artifact runtime win, falls back to 8080 if somehow not set.

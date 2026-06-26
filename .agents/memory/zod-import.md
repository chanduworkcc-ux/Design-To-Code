---
name: Zod import in api-server
description: esbuild cannot resolve "zod/v4" — always import from "zod" in the API server
---

Always import zod as `import { z } from "zod"` in api-server routes and middleware, never `"zod/v4"`.

**Why:** esbuild (used to bundle the api-server for production) cannot resolve the `"zod/v4"` package.json exports map — it produces a "Could not resolve" error at build time. The installed version is zod 3.x which exposes the same API from the root `"zod"` import.

**How to apply:** Any time a new route file or middleware needs zod in `artifacts/api-server/src/`, use `import { z } from "zod"`.

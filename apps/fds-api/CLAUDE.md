# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo-root `CLAUDE.md` covers the whole monorepo and the micro-frontend architecture. This file is scoped to the **fds-api** app. Read the root file for how the shell consumes this API.

## Commands

```bash
pnpm --filter fds-api dev    # node server.js — listens on :5006
pnpm --filter fds-api test   # vitest run

# Single test (from this dir)
pnpm vitest run server.test.js
pnpm vitest run -t 'deterministic'   # filter by test name
```

ESM (`"type": "module"`). No build step — `dev` runs `server.js` directly with Node (pinned 26.2.0). Tests use Vitest with `globals: true`, plain Node env (no DOM).

## What this app is

The **FDS Consumer API** — a ~78-line raw `node:http` server (`server.js`), no framework. It is the server-side version resolver for the dashboard: the shell fetches a manifest from here at boot and never sees more than one version per widget.

All version-selection logic lives in `@demo/contracts` (`selectVersion`, `validateManifest`, `djb2`), NOT here. This server only wires HTTP → contracts → HTTP. When changing selection/hashing behavior, edit `packages/contracts`, not this file.

## Request flow (`server.js`)

1. `GET /` → `200 ok` (health check).
2. `GET /microFrontends?token=<t>` → resolve and return manifest. Anything else → 404.
3. `readManifest()` reads + parses the JSON file **on every request** (no caching — intentional, so editing the manifest is picked up live). Path = `ADMIN_MANIFEST_PATH` env var, default `../../apps/shell/public/discovery.local.json`, resolved relative to **process cwd**, not the file.
4. `validateManifest()` from contracts → 400 with `{ error }` if invalid.
5. `resolveManifest()` walks `manifest.microFrontends`, computes a bucket per MFE, calls `selectVersion()`, and replaces each version array with a **single-entry array** `[picked]`.
6. Responds 200 with the resolved manifest as JSON. Any thrown error → 500 `{ error: e.message }`.

## Note

- **Bucket is computed two ways.** `computeBucket()` here special-cases `token === 'default'` → 1 and `token === 'canary'` → 100, otherwise `djb2(token + versions.map(v => v.url).join('|'))`. `selectVersion()` in contracts does its own selection from the same token. These must stay consistent — if you change the special tokens or the djb2 seed string, change both, or the returned `X-Traffic-Bucket` header will disagree with the version actually picked.
- **`lastBucket` is per-loop, not per-MFE.** `resolveManifest` returns one `bucket` (the last MFE iterated) for the whole response. The `X-Traffic-Bucket` header therefore reflects only the last widget. Fine for the demo (kpi is the split widget); know this before adding more split widgets.
- **CORS is hardcoded** to `SHELL_ORIGIN = http://localhost:5000`. Only `/microFrontends` sets CORS headers; it also sets `Access-Control-Expose-Headers: X-Traffic-Bucket` so the browser can read the bucket. Health check and 404s have no CORS.
- **`PORT = 5006` is hardcoded** (no env override). Playwright e2e and the shell both assume :5006.
- The resolved manifest carries `bucket` in the JSON body too (from `resolveManifest`), in addition to the header — leftover/duplicate; the shell reads the header.

## Tests (`server.test.js`)

Currently test `selectVersion` from contracts directly (token → version), not the HTTP layer — they assert the resolution contract the server depends on, not the server's routing/headers. There is no HTTP-level integration test yet; if you change routing, status codes, or header wiring in `server.js`, those paths are uncovered.

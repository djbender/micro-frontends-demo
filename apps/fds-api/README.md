# fds-api

The **FDS Consumer API** for the micro-frontend dashboard. A small `node:http` server that resolves which version of each widget the shell should load, and returns a manifest with a single entry per widget.

## Run

```bash
pnpm --filter fds-api dev    # from the repo root
# or, from this directory:
pnpm dev
```

Listens on **http://localhost:5006**. No build step — it runs `server.js` directly with Node (26.2.0).

## Endpoints

| Method | Path | Response |
|---|---|---|
| `GET` | `/` | `200 ok` — health check |
| `GET` | `/microFrontends?token=<t>` | `200` resolved manifest (JSON) |
| any | anything else | `404 { "error": "Not found" }` |

### `GET /microFrontends`

On each request the server reads the discovery manifest from disk, validates it, then picks one version per widget based on the `token` query param and returns the result.

Special tokens:

- `?token=default` — always selects the majority (default) version
- `?token=canary` — always selects the minority (canary) version
- any other value — hashed deterministically (same token → same version every time)
- omitted — treated as an empty token

The selected traffic bucket is returned in the **`X-Traffic-Bucket`** response header (exposed to the browser via CORS).

```bash
curl -i 'http://localhost:5006/microFrontends?token=canary'
```

Errors: invalid manifest → `400 { error }`; any other failure → `500 { error }`.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ADMIN_MANIFEST_PATH` | `../../apps/shell/public/discovery.local.json` | Path to the discovery manifest (resolved relative to the process working directory) |

Port (`5006`) and the allowed CORS origin (`http://localhost:5000`) are hardcoded in `server.js`.

## Tests

```bash
pnpm test                  # vitest run
pnpm vitest run -t canary  # filter by test name
```

The version-selection logic lives in the `@demo/contracts` package, not here — `server.js` only wires HTTP to those functions. Change selection or hashing behavior in `packages/contracts`.

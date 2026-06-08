# shell

The React 19 host application for the micro-frontend dashboard. It fetches a resolved widget manifest from the Consumer API, filters widgets by the current user's permissions, and mounts each allowed widget into a layout slot at runtime via Module Federation. It contains no widget business logic of its own — it is purely the host.

For the overall architecture (boot contract, traffic splitting, the universal mount contract, the discovery manifest schema), see the repository-root `README.md` and `CLAUDE.md`.

## Run / Build

This app is part of a pnpm workspace. Run it from anywhere in the repo with the `--filter` flag.

```bash
# Dev server (Vite) on http://localhost:5000
pnpm --filter shell dev

# Production build
pnpm --filter shell build

# Serve the build on http://localhost:5000
pnpm --filter shell preview
```

**Prerequisite:** the shell expects the Consumer API (`fds-api`) running on port 5006 and the widget dev servers running on their ports. The simplest way to bring everything up is `pnpm dev` from the repo root, which starts all servers in parallel. Run alone, the shell boots but logs a manifest fetch error.

The dev server port (`5000`) is hardcoded in `vite.config.js`.

## Usage / Interface

Open the dashboard in a browser. Behavior is driven by URL query parameters:

| Parameter | Purpose | Default | Example |
|---|---|---|---|
| `permissions` | Comma-separated permission list for the mocked current user. Widgets are shown only if the user holds **all** of a widget's required permissions. | `dashboard.view` | `?permissions=dashboard.view,dashboard.admin` |
| `token` | User token sent to the Consumer API for version selection (traffic bucketing). `default` forces the majority version, `canary` forces the minority version; any other value is hashed into a bucket. | random UUID per session | `?token=canary` |

Example — open the dashboard as an admin in the canary bucket:

```
http://localhost:5000/?permissions=dashboard.view,dashboard.admin&token=canary
```

The resolved traffic bucket is read from the `X-Traffic-Bucket` response header and shown as a chip in the header. A theme toggle switches `light`/`dark` (via a `data-theme` attribute on `<html>`).

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `VITE_DISCOVERY_URL` | The Consumer API manifest endpoint the shell fetches at boot. Point it at staging/CDN without a rebuild. | `http://localhost:5006/microFrontends` |

Hardcoded values worth noting: the dev/preview port `5000` and the absolute asset base `http://localhost:5000/` (both in `vite.config.js`). `react` and `react-dom` are configured as Module Federation singletons.

`public/discovery.local.json` is the local manifest read by the Consumer API (not by the shell directly) — it defines each widget's versions, traffic split, slots (`extras.slots`, a `{ slot, variant? }` array — a widget may name more than one to mount in multiple places), route, and required permissions.

## Tests

```bash
# Run once
pnpm --filter shell test

# Watch mode
pnpm --filter shell test:watch
```

Tests run under Vitest with the `happy-dom` environment. `src/Shell.test.jsx` covers the boot sequence, permission gating, routing, widget mounting, fallback retry, and traffic-bucket display, with `@module-federation/runtime` mocked. `src/EventLog.test.jsx` covers the event-log panel.

Cross-cutting logic the shell depends on — `validateManifest`, `selectVersion`, and the `TOPICS` event names — lives in the `@demo/contracts` package (`packages/contracts`), not in this app.

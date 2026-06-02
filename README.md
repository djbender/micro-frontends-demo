# MFE Dashboard Demo

A runtime-composed micro-frontend dashboard that visibly proves four things:

1. Independent deploy/versioning — rebuild and redeploy one widget without touching the shell.
2. Cross-framework communication — React, Svelte 5, and a Web Component talk across framework boundaries via a native `EventTarget` bus.
3. Shared look, isolated styles — one consistent theme, no style leakage, no shared dependency.
4. Traffic splitting & canary deploys — deterministic client-side bucketing routes users to widget versions by percentage, with no infrastructure change.

## Requirements

- Node 26.2.0 — use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) to switch
- pnpm — install once: `npm i -g pnpm`

## Setup

```bash
# 1. Clone and enter the repo
git clone <repo-url> mfe-demo && cd mfe-demo

# 2. Use the correct Node version
fnm use   # reads .node-version (26.2.0)
# or: nvm use 26.2.0

# 3. Install all workspace dependencies
pnpm install
```

## Running the demo

```bash
pnpm dev
```

This starts all five apps in parallel:

| App | URL | Framework |
|---|---|---|
| Shell | http://localhost:5000 | React 19 |
| widget-kpi v1.0.0 | http://localhost:5001 | React 19 |
| widget-kpi v1.1.0 | http://localhost:5002 | React 19 (canary) |
| widget-trends | http://localhost:5003 | Svelte 5 |
| widget-filter | http://localhost:5004 | Web Component |
| widget-admin | http://localhost:5005 | React 19 |

Open http://localhost:5000 in your browser.

## What to look at

### `/overview` — the main demo

The shell fetches `discovery.local.json` at runtime, filters by permission, then calls `init()` and `loadRemote()` to mount each widget — no static imports.

- Filter widget (toolbar): Shadow DOM Web Component. Change the date range or segment.
- KPI widget (main area): React. Responds to the filter — watch the numbers update.
- Trends chart (sidebar): Svelte 5. Responds to the same filter — watch the chart redraw. This is cross-framework communication.
- Version badges: each widget shows its own `package.json` version (e.g. `v1.0.0`), not the shell's.
- Theme toggle (🌙 button): flips `data-theme` on `<html>`. All widgets — including the Shadow DOM filter — recolor via CSS custom properties.

### Permission gating (`/admin`)

By default, `currentUser` in `apps/shell/src/main.jsx` has only `dashboard.view`. The admin widget requires `dashboard.admin`, so the nav and route are absent.

To unlock admin:
- **URL parameter** (no code change): open `http://localhost:5000?permissions=dashboard.view,dashboard.admin`
- **Edit the source**: change the default in `apps/shell/src/main.jsx` to:
    ```js
    const currentUser = { permissions: ['dashboard.view', 'dashboard.admin'] };
    ```
    Save — Vite HMR reloads the shell automatically.
- The admin nav button appears; click it to see the gated panel.

No rebuild. No widget change. Only the shell's mock user object changed.

### Traffic splitting (`?token=`)

`widget-kpi` in `discovery.local.json` has two versions: v1.0.0 at 90% traffic and v1.1.0 at 10%. The shell hashes a user token against the active version URLs (djb2, 1–100 bucket) to deterministically select one. The resolved bucket is shown as a chip in the header.

Two special tokens bypass the hash and force a specific cohort:
- `http://localhost:5000?token=default` — bucket 1, always gets **v1.0.0** (the 90% version)
- `http://localhost:5000?token=canary` — bucket 100, always gets **v1.1.0** (the 10% version)

Any other token value is hashed deterministically — the same token always produces the same bucket across page reloads. Omit `?token=` and a random UUID is generated per session.

### Independent deploy

1. Bump the version in any widget's `package.json`, e.g.:
   ```json
   { "version": "1.1.0" }
   ```
2. Rebuild just that widget:
   ```bash
   pnpm --filter widget-kpi build
   ```
3. Update `discovery/discovery.local.json` to point `url` at the built `dist/` and bump `version`.
4. Reload the shell — the badge changes, nothing else moves, shell was never rebuilt.

### Environment swap (no rebuild)

```bash
VITE_DISCOVERY_URL=/discovery.staging.json pnpm --filter shell dev
```

The shell reads a different manifest — no code change, no rebuild.

## Architecture overview

The only shared surface is `packages/contracts` (event names + manifest schema). Everything else is isolated.

```
discovery/
  discovery.local.json    ← runtime manifest (urls → localhost:500X/remoteEntry.js)
  discovery.staging.json  ← same shape, placeholder CDN urls
packages/
  contracts/              ← @demo/contracts: TOPICS + validateManifest()
apps/
  shell/                  ← React host, :5000 — fetches manifest, gates, init, renders slots
  widget-filter/          ← Web Component, :5004 — emits filter events
  widget-kpi/             ← React, :5001 — consumes filter events
  widget-trends/          ← Svelte 5, :5003 — consumes filter events
  widget-admin/           ← React, :5005 — gated by dashboard.admin permission
```

Every widget exposes one Module Federation module (`./mount`) with the contract `mount(target, props) → unmount`. `props.bus` is the `EventTarget` injected by the shell.

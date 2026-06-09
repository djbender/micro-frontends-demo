# MFE Dashboard Demo

A runtime-composed micro-frontend dashboard demonstrating eight micro-frontend patterns:

1. **Runtime Composition via Discovery Manifest** — the shell fetches a JSON manifest at boot and resolves every widget URL at runtime. Nothing is bundled together at build time; swapping a widget's URL in the manifest redeploys it without touching the shell or any other widget.

2. **Universal Mount Contract** — every widget exposes one Module Federation module (`./mount`) with the same signature: `mount(target, props) → unmount`. The shell calls this single function and never knows whether the widget underneath is React, Svelte, or a Web Component. Teams choose their own stack; adding a new framework requires zero changes to the shell.

3. **Event Bus for Cross-Framework Communication** — the shell creates one `EventTarget` and injects it into every widget at mount. Widgets communicate via Custom Events (`dashboard:filter-change`, `dashboard:request-filter`) with no global store, no shared package, and no coupling between implementations.

4. **Late-Mount Handshake (Request/Reply)** — when a consumer mounts after the filter has already emitted its initial state, it fires `dashboard:request-filter` and the filter widget re-emits its current selection. No state is cached on the bus; mount order is irrelevant and widgets can load lazily or in parallel without missing events.

5. **Permission Gating at the Manifest Layer** — the shell filters the manifest by `requiredPermissions` before calling `init()`. A widget the current user cannot access is never registered, never fetched, and never mounted — the route and nav entry simply do not appear.

6. **Traffic Splitting & Canary Deploys** — the manifest carries multiple versions of a widget with a `deployment.traffic` percentage each. The Consumer API selects one version server-side; the shell receives a single-entry manifest and never sees multiple versions. Ship a new widget version to 10% of users with zero infrastructure change — just update the manifest.

7. **Independent Versioning & Zero-Downtime Deploy** — each widget carries its own `package.json` version, exposed at runtime as `import.meta.env.VITE_WIDGET_VERSION` and shown in its version badge. Rebuilding and redeploying one widget — then updating its URL in the manifest — is enough to ship it. The shell and every other widget keep running without a rebuild or restart.

8. **Shared Tokens, Isolated Styles** — design tokens are CSS custom properties on `:root`. Every widget reads the same token names without importing a shared CSS file. The Web Component uses Shadow DOM, yet custom properties pierce the shadow boundary automatically. Consistent theming across all frameworks with zero style leakage.

## Requirements

- Node 26.2.0 — use [fnm](https://github.com/Schniz/fnm) or [nvm](https://nvm-sh.github.io/nvm) to switch
- pnpm — install once: `npm i -g pnpm`

## Setup

```bash
# 1. Clone and enter the repo
git clone <repo-url> micro-frontends-demo && cd micro-frontends-demo

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

This starts all six apps in parallel:

| App | URL | Framework |
|---|---|---|
| Shell | http://localhost:5000 | React 19 |
| widget-kpi v1.0.0 | http://localhost:5001 | React 19 |
| widget-kpi v1.1.0 | http://localhost:5002 | React 19 (canary) |
| widget-trends | http://localhost:5003 | Svelte 5 |
| widget-filter | http://localhost:5004 | Web Component |
| widget-admin | http://localhost:5005 | React 19 |
| fds-api (Consumer API) | http://localhost:5006 | Node.js http |

Open http://localhost:5000 in your browser.

### With Docker Compose

Run the same dev setup in containers (live HMR, source bind-mounted) — no local
Node/pnpm needed:

```bash
# Per-service: one container per app (default, 7 containers)
docker compose up --build

# All-in-one: a single container running all 7 dev servers
docker compose --profile all-in-one up --build all-in-one
```

Both publish ports 5000–5006 to the host, so the browser hits the same
`http://localhost:50XX` URLs as `pnpm dev`. Editing source on the host triggers
HMR in the running containers. Stop with `docker compose down` (add `-v` to also
drop the per-service `node_modules` volumes).

> Note: the all-in-one invocation must name the `all-in-one` service. Running
> `docker compose --profile all-in-one up` alone would also start the 7
> per-service containers and clash on the published ports.

## What to look at

### `/overview` — the main demo

The shell calls the Consumer API at boot to resolve widget versions, filters by permission, then calls `init()` and `loadRemote()` to mount each widget — no static imports.

- Filter widget (toolbar): Shadow DOM Web Component. Change the date range or segment.
- KPI widget (main area): React. Responds to the filter — watch the numbers update.
- Trends chart (sidebar): Svelte 5. Responds to the same filter — watch the chart redraw. This is cross-framework communication.
- Version badges: each widget shows its own `package.json` version (e.g. `v1.0.0`), not the shell's.
- Theme toggle (🌙 button): flips `data-theme` on `<html>`. All widgets — including the Shadow DOM filter — recolor via CSS custom properties.
- Bucket chip (header): shows your current traffic bucket resolved by the Consumer API.

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

`widget-kpi` in `discovery.local.json` has two versions: v1.0.0 at 90% traffic and v1.1.0 at 10%. The Consumer API (running at :5006) selects one version server-side using the `selectVersion()` function from `@demo/contracts`. The shell receives a single-entry manifest and loads whatever URL it is handed.

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
3. Update `discovery.local.json` to point `url` at the built `dist/` and bump `version`.
4. Reload the shell — the badge changes, nothing else moves, shell was never rebuilt.

### Environment swap (no rebuild)

```bash
VITE_DISCOVERY_URL=/discovery.staging.json pnpm --filter shell dev
```

The shell reads a different manifest — no code change, no rebuild.

## Architecture overview

The only shared surface is `packages/contracts` (event names + manifest schema). Everything else is isolated.

```
discovery.local.json    ← multi-version manifest (read by fds-api)
packages/
  contracts/              ← @demo/contracts: TOPICS + validateManifest() + djb2() + selectVersion()
apps/
  shell/                  ← React host, :5000 — calls Consumer API, gates, init, renders slots
  fds-api/                ← Consumer API, :5006 — resolves versions, returns single-entry manifest
  widget-filter/          ← Web Component, :5004 — emits filter events
  widget-kpi/             ← React, :5001 — consumes filter events
  widget-trends/          ← Svelte 5, :5003 — consumes filter events
  widget-admin/           ← React, :5005 — gated by dashboard.admin permission
```

Every widget exposes one Module Federation module (`./mount`) with the contract `mount(target, props) → unmount`. `props.bus` is the `EventTarget` injected by the shell.

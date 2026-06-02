# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start all 5 dev servers in parallel (ports 5000–5005)
pnpm dev

# Build all apps sequentially
pnpm build

# Start all preview servers (after build)
pnpm preview

# Operate on a single app
pnpm --filter shell dev
pnpm --filter widget-kpi build
pnpm --filter widget-trends dev
```

No linter or test suite is configured. There is no TypeScript — the codebase is plain JS + JSDoc throughout.

## Architecture

This is a **runtime-composed micro-frontend dashboard**. The shell fetches a JSON manifest at boot, filters entries by user permissions, calls `init()` once with the allowed remotes, then calls `loadRemote()` per widget. Nothing is bundled together — each app is independently built and served.

### Boot sequence (strictly ordered — RUNTIME-009)

`apps/shell/src/main.jsx` runs this on mount:
1. `fetch(DISCOVERY_URL)` → `validateManifest()` → fallback UI on failure
2. Filter manifest entries by `currentUser.permissions`
3. `await init({ remotes: allowed.map(m => ({ name, entry, type: 'module' })) })` — **must complete before any `loadRemote`**
4. `loadRemote('<name>/mount')` per allowed widget, call `mod.mount(target, { bus })`

`type: 'module'` is required on every remote in `init()` — Vite dev remoteEntry.js files are ESM and will fail with RUNTIME-001 without it.

### Universal mount contract

Every widget exposes `./mount` with the same signature: `mount(target, props) → unmount`. The `props.bus` is an `EventTarget` created by the shell and injected on mount. Framework details are invisible to the shell.

| App | Framework | Port | Mount impl |
|---|---|---|---|
| `shell` | React 19 | 5000 | host only |
| `widget-kpi` | React 19 | 5001 (v1.0.0, `vite.config.v1-0-0.js`), 5002 (v1.1.0, `vite.config.v1-1-0.js`) | `createRoot(target).render(...)` |
| `widget-trends` | Svelte 5 | 5003 | `svelteMount(Component, { target, props })` |
| `widget-filter` | Web Component | 5004 | `customElements.define` guard + `el.bus = props.bus` |
| `widget-admin` | React 19 | 5005 | `createRoot(target).render(...)` (does not use `props.bus`) |

### Cross-widget communication

Via `EventTarget` bus — no global store, no shared package. Three events defined in `packages/contracts/index.js`:

- `dashboard:filter-change` — emitted by `widget-filter` with `{ dateRange, segment }` detail
- `dashboard:request-filter` — emitted by consumers on mount; `widget-filter` re-emits current state in response (late-mount handshake, no state cached on the bus)
- `dashboard:event-consumed` — dispatched by each consumer (`widget-kpi`, `widget-trends`) after handling `filter-change`; detail shape `{ actor: string, topic: string }`. The shell renders a live **EventLog** panel as another bus consumer, making the one-emit → N-consumers fan-out visible in real time.

Widgets MAY import `TOPICS` from `@demo/contracts` or use string literals.

### Discovery manifest

`apps/shell/public/discovery.local.json` is the local dev manifest served by the shell's static file server. Override via `VITE_DISCOVERY_URL` env var (no rebuild needed — swap to staging/CDN). Schema aligns with the [AWS Frontend Discovery Service](https://github.com/awslabs/frontend-discovery-service) (`schema/v1-pre.json`):

- Top level: `schema` (URL string) + `microFrontends` (object keyed by widget name)
- Each key holds an array of version entries; the shell uses traffic splitting to select one (see below)
- Each entry: `url`, optional `fallbackUrl`, `metadata.integrity` (empty string in dev), `metadata.version`, `deployment.{ default, traffic }`
- Project-specific fields (`module`, `slot`, `route`, `requiredPermissions`) live in `extras`

If `fallbackUrl` differs from `url` and `loadRemote` throws, the shell re-inits with the fallback URL and retries.

### Traffic splitting

The shell implements client-side traffic splitting per the FDS spec. Version selection algorithm:

1. Hash `userToken + versionUrls` with djb2 → bucket (1–100)
2. Walk versions in order, accumulate `deployment.traffic` until bucket is covered — that version wins
3. On any error, fall back to the entry where `deployment.default === true`

`userToken` comes from `?token=<value>` URL param (falls back to `crypto.randomUUID()` per session). The resolved bucket is shown as a chip in the shell header. Two special tokens bypass the hash: `token=default` forces bucket 1 (majority version), `token=canary` forces bucket 100 (minority version). All other values are hashed normally. `widget-kpi` in `discovery.local.json` demonstrates a 90/10 split — `?token=default` gets v1.0.0, `?token=canary` gets v1.1.0.

### Permission gating

`currentUser` is mocked in `apps/shell/src/main.jsx` (line 10). Default has `['dashboard.view']` — grants `/overview` widgets, hides `/admin`. Supports `?permissions=dashboard.view,dashboard.admin` URL parameter for testing without editing code. Add `'dashboard.admin'` to the array to expose the admin widget; no code change elsewhere needed.

### Design tokens

CSS custom properties on `:root` in `apps/shell/src/styles.css`. Dark mode via `[data-theme='dark']` override on `<html>`. All widgets read the same token names (no shared CSS file — naming convention only). Shadow DOM widgets get tokens for free because custom properties pierce shadow boundaries.

### Shared dependencies

`react` + `react-dom` are `singleton: true` in shell, widget-kpi, and widget-admin only. `widget-trends` (Svelte) and `widget-filter` (Web Component) must NOT list react in their `shared` config.

### Version badges

Each widget renders its version via `import.meta.env.VITE_WIDGET_VERSION`, which Vite replaces at transform time (unlike `define`, which is skipped when React Fast Refresh runs first). The value is set in each versioned config via `define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify(version) }`.

`widget-kpi` has two versioned configs (`vite.config.v1-0-0.js`, `vite.config.v1-1-0.js`) each hardcoding their port, federation name, and version. This is required because Vite's `define` replacements are applied per-server at transform time — using env var overrides at startup causes the wrong version to appear after HMR re-transforms. The federation `name` must also match the versioned remote name (`widget-kpi_1_0_0` / `widget-kpi_1_1_0`) to prevent the MF runtime from serving a cached module when two versions run simultaneously.

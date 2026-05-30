# Micro Frontend Dashboard Demo — Implementation Plan

## Context

A runtime-composed micro-frontend dashboard that composes independently built,
independently deployable widgets into a single shell, resolved at runtime through
a JSON discovery manifest. The demo must visibly prove three things:

1. **Independent deploy/versioning** — a widget can be rebuilt, redeployed, and
   version-switched without rebuilding *or redeploying* the shell.
2. **Cross-framework communication** — widgets talk across framework boundaries
   without shared global state.
3. **Shared look, isolated styles** — one consistent themeable appearance, no
   style leakage, no forced shared dependency.

The shared surface is kept to *contracts* (event names, design-token names,
discovery schema), never *code*. Discovery is dynamic: the shell fetches a
manifest at runtime and resolves everything from it. Communication is via native
Custom Events over an `EventTarget` the shell injects at mount — no global store.

## Decisions

- **Scope (this build):** `shell + widget-filter + widget-kpi + widget-trends + widget-admin` (5 apps).
- **`widget-feed` = stretch goal, NOT built now.** It is a redundant 2nd React consumer; omitting it still proves every goal (`/overview` = emitter + React consumer + Svelte consumer).
- **Package manager:** pnpm (installed via `npm i -g pnpm`). Chosen for its strict, non-hoisted `node_modules`, which enforces the demo's "no phantom shared deps" thesis, plus `workspace:*` linking and `-r --parallel` dev scripts.
- **Language:** plain JS everywhere; `@demo/contracts` is JS + JSDoc, no TypeScript build step.
- **Trends chart:** hand-rolled, dependency-free SVG (data-driven coordinate math, not freehand art).

### Why 5 apps, not 6
React count is incidental — only `widget-kpi` is needed to prove React integration
(singleton React is already shown because the shell is React too). `widget-trends`
(Svelte) is what makes communication genuinely *cross-framework*. `widget-filter`
(Web Component) is the sole event emitter and the Shadow-DOM style showcase.
`widget-admin` is the only proof of permission gating + runtime route resolution.

## Stack (versions validated against npm registry, May 2026)
- Integration: `@module-federation/vite` `^1.16` (latest 1.16.2). It bundles `@module-federation/runtime` `2.5.0` as a direct dependency — the shell imports `init`/`loadRemote` from `@module-federation/runtime` (pin `^2.5`). **Do NOT add `@module-federation/enhanced`** — not needed for this design.
- Build: Vite `^8` (latest 8.0.14; within the MF plugin's peer range `5–8`). `@vitejs/plugin-react` `^6`, `@sveltejs/vite-plugin-svelte` `^7`.
- Frameworks: React `19` (19.2.6), Svelte `5` (5.56.0), vanilla Web Component.
- Runtime: Node `26.2.0` (latest; pinned via root `engines` + `.node-version`). Box currently has 25.6.1 — install/switch to 26.2.0 before building.
- Workspace: pnpm workspaces, single monorepo (splittable into per-team repos later — the only cross-boundary artifact is the manifest, already an external file).
- Data: per-widget mock JSON, no backend.

## Architecture

| App             | Framework     | Port | Route       | Role |
|-----------------|---------------|------|-------------|------|
| `shell`         | React         | 5000 | —           | Host. Fetches manifest, gates by permission, registers remotes at runtime, lays out slots, owns theme toggle, creates the `EventTarget` bus injected into each widget. |
| `widget-filter` | Web Component | 5004 | `/overview` | Date-range + segment selector. The **driver** — emits filter events. |
| `widget-kpi`    | React         | 5001 | `/overview` | KPI / metric cards. Consumer. |
| `widget-trends` | Svelte 5      | 5003 | `/overview` | Trends chart (hand-rolled SVG). Consumer. |
| `widget-admin`  | React         | 5005 | `/admin`    | Permission-gated panel. Proves gated loading + runtime route resolution. |
| `widget-feed`   | React         | 5002 | `/overview` | **STRETCH** — activity feed list. Second React consumer. |

`/overview` is the rich route (filter + kpi + trends co-resident); `/admin` is a
single gated widget behind a permission the default user lacks. Both nav and
per-route widget sets are derived from the manifest, never hardcoded.

## Module Federation gotchas to design around (verified, current)
1. **RUNTIME-009 "call createInstance/init first."** Shell MUST complete `init()` before any `loadRemote()`. Strict order: fetch manifest → filter by permission → `await init({ remotes: allowed })` → only then `loadRemote`.
2. **Remote chunks resolving from the host's origin.** A remote's lazy chunks can wrongly resolve relative to the host. Give each widget a correct dev `server.origin`/`base` (`http://localhost:500X`) so its `remoteEntry.js` advertises its own absolute public path. Verify chunks load from the widget's own port.
3. **React singleton.** `react` + `react-dom` marked `singleton: true` in shell, kpi, admin only. Svelte and Web Component widgets must NOT list react in `shared`.

## Repo structure (built subset)
```
mfe-demo/
  package.json              # workspace root: dev / build / preview scripts + engines: node 26.2.0
  pnpm-workspace.yaml
  .node-version             # 26.2.0
  .gitignore
  discovery/
    discovery.local.json    # runtime manifest, urls -> localhost:500X/remoteEntry.js
    discovery.staging.json  # same shape, placeholder cdn urls (demonstrates env-swap)
  packages/
    contracts/              # @demo/contracts — TOPICS + manifest JSDoc typedefs + validateManifest()
  apps/
    shell/                  # React, :5000
    widget-kpi/             # React, :5001
    widget-trends/          # Svelte 5, :5003
    widget-filter/          # Web Component, :5004
    widget-admin/           # React, :5005
  # widget-feed/ :5002 — STRETCH, not built; manifest entry omitted until built
```
Deliberately absent: no shared component library, no shared event-bus package, no
shared tokens package. Design tokens are a CSS naming convention, not a dependency.

## The universal mount contract (keystone)
Every widget exposes one MF module `./mount` with an identical signature —
`mount(target, props) -> unmount` — where `props.bus` is the injected `EventTarget`.
The framework underneath is invisible to the shell.

- **React** (`kpi`, `admin`): `createRoot(target)`, render `<Widget bus={props.bus}/>`, return `() => root.unmount()`.
- **Svelte 5** (`trends`): `svelteMount(Trends, { target, props })`, return `() => svelteUnmount(app)`.
- **Web Component** (`filter`): import side-effect module that guards `customElements.define`, create `<filter-widget>`, set `el.bus = props.bus`, append, return `() => el.remove()`.

## Build order

### 0. Tooling
- Install/switch to Node `26.2.0`; `npm i -g pnpm`; `git init`.
- Root `package.json` (private, workspaces, `engines: { node: "26.2.0" }`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `.node-version` (`26.2.0`), `.gitignore` (node_modules, dist).

### 1. `packages/contracts` (only shared code, kept tiny)
- `TOPICS = { FILTER_CHANGE: 'dashboard:filter-change', REQUEST_FILTER: 'dashboard:request-filter' }`.
- JSDoc `@typedef` for the FILTER_CHANGE detail payload and a manifest entry.
- `validateManifest(json)` — light schema check (schemaVersion + required fields per entry) for the shell's graceful degradation.
- Consumed via `workspace:*`; widgets MAY import `TOPICS` or just use literals.

### 2. `apps/shell` (React host, :5000)
- MF config: `federation({ name: 'shell', remotes: {}, shared: { react: { singleton:true }, 'react-dom': { singleton:true } } })` — **no static remotes**.
- Mock `currentUser = { permissions: ['dashboard.view'] }` (no `dashboard.admin` → admin gated out by default).
- One `const bus = new EventTarget()` at startup, injected into every mount.
- Boot sequence (guards gotcha #1):
  1. `fetch(DISCOVERY_URL)` → `validateManifest` (fallback UI on failure/malformed).
  2. `allowed = mfes.filter(m => m.requiredPermissions.every(p => currentUser.permissions.includes(p)))`.
  3. `await init({ name:'shell', remotes: allowed.map(m => ({ name:m.name, entry:m.url })) })`.
  4. `byRoute = Object.groupBy(allowed, m => m.route)`; nav + route contents derived from this.
- `renderRoute(route)`: `teardownCurrent()` → for each mfe, `loadRemote('<name>/mount')`, find `[data-slot="<slot>"]`, `mod.mount(target, { bus })`, track unmount.
- Layout: `[data-slot]` containers `toolbar` / `main` / `side`; client-side switch between `/overview` and `/admin`.
- Theme: `:root` tokens + `[data-theme='dark']` overrides; toggle flips `data-theme` on root.
- `DISCOVERY_URL` from a Vite env var defaulting to the local manifest (env-swap without rebuild).

### 3. Widgets
Each: own `package.json` (real `version` for badge), Vite MF config exposing `./mount`, mock JSON, self-version badge via `define: { __WIDGET_VERSION__: JSON.stringify(pkg.version) }`, styles reading shared tokens.

- **`widget-filter`** (WC, :5004) — driver/emitter. Shadow DOM. Date-range preset + segment selector. On change: dispatch `FILTER_CHANGE` with detail. Answers late-mount handshake: on `REQUEST_FILTER`, re-emit current selection (single source of truth, **no retained state on the bus**). Guard `customElements.define`.
- **`widget-kpi`** (React, :5001) — metric cards, CSS Modules. On mount dispatch `REQUEST_FILTER`; on `FILTER_CHANGE` recompute cards from mock JSON.
- **`widget-trends`** (Svelte 5, :5003) — hand-rolled SVG line chart (scale fn maps data→coords; baseline + axis labels; handles empty/single-point). Svelte-scoped styles. Same request/listen pattern. NOT in react `shared`.
- **`widget-admin`** (React, :5005) — `/admin` only, `requiredPermissions: ['dashboard.admin']`. Minimal panel. Invisible by default; granting the mock permission makes nav item + route appear, no code change.

### 4. Manifests
- `discovery/discovery.local.json` — entries for filter/kpi/trends/admin; `url` → `http://localhost:500X/remoteEntry.js`, `module:'./mount'`, `slot`, `route`, `requiredPermissions`. Overview trio require `dashboard.view`; admin requires `dashboard.admin`.
- `discovery/discovery.staging.json` — same shape, placeholder CDN urls (env-swap demo).

### 5. Root scripts
```jsonc
{ "scripts": {
  "dev": "pnpm -r --parallel run dev",
  "build": "pnpm -r run build",
  "preview": "pnpm -r --parallel run preview"
} }
```

## Critical files
- `packages/contracts/index.js` — TOPICS, typedefs, `validateManifest`.
- `apps/shell/vite.config.js` — MF host, empty remotes.
- `apps/shell/src/main.jsx` — boot sequence (fetch→gate→init→route render), bus, theme, slots.
- `apps/<widget>/vite.config.js` — MF remote exposing `./mount`, version define, correct dev origin/base (gotcha #2).
- `apps/<widget>/src/mount.{jsx,js}` — the universal mount contract per framework.
- `discovery/discovery.local.json` — the runtime manifest driving the whole demo.

## Verification (end-to-end)
1. `pnpm install`, `pnpm dev`; open `http://localhost:5000`.
2. Screenshot the shell: `/overview` shows filter (toolbar) + kpi + trends, consistently themed, each version badge visible.
3. **Cross-framework comms:** change the filter; kpi (React) and trends (Svelte) both react. Reload — a late-mounting consumer fires `REQUEST_FILTER` and gets current state (handshake, no cached bus state).
4. **Network isolation (gotcha #2):** each widget's `remoteEntry.js` + chunks load from its own `:500X`.
5. **Theming:** toggle theme; every widget recolors, including the Shadow-DOM filter (tokens pierce the boundary); no style leakage.
6. **Gating:** default user → `/admin` nav absent, admin never fetched. Add `dashboard.admin` to mock `currentUser`, reload → nav grows, `/admin` mounts. No code change.
7. **Independent deploy:** bump a widget's `package.json` version, rebuild that one widget, point its manifest `url`/`version` at the new build, reload shell (no shell rebuild) — badge changes, nothing else moves.

## Stretch goals (later)
- Build `widget-feed` (React, :5002) as a second `/overview` consumer in a `side` slot; add its manifest entry.
- Per-widget Backend for Frontend (Rails route each) for real data, composed server-side.
- Compute the manifest at the edge per cohort (canary / blue-green from the discovery layer).
- Split the monorepo into per-team repos (manifest is already external).
- A sixth widget in yet another framework to stress-test the mount contract.

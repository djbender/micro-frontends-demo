# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo-root `CLAUDE.md` covers the monorepo and the overall micro-frontend architecture (boot sequence, mount contract, traffic splitting, discovery manifest). This file is scoped to the `shell` app only — see the root file for how this directory fits the whole.

## Commands

```bash
# Dev server on port 5000 (port is hardcoded in vite.config.js)
pnpm --filter shell dev

# Production build (target: esnext)
pnpm --filter shell build

# Preview a build, also on port 5000
pnpm --filter shell preview

# Run the test suite once
pnpm --filter shell test

# Watch mode
pnpm --filter shell test:watch

# Run a single test file
pnpm --filter shell exec vitest run src/EventLog.test.jsx

# Filter by test name
pnpm --filter shell exec vitest run -t "fallback"
```

ESM only (`"type": "module"`); no TypeScript (plain JS + JSDoc). Tests run under Vitest with the `happy-dom` environment and `globals: true` — no per-file `import` of `describe`/`it`/`expect` needed (see `vitest.config.js`, setup in `src/test/setup.js`).

## What this is

The `shell` is the React 19 **host** of the dashboard — it owns no widget business logic. It fetches the resolved manifest from the Consumer API (`fds-api`, port 5006), filters entries by the current user's permissions, calls Module Federation `init()` once, then `loadRemote()` + `mount()` per widget into DOM slots. Widget logic lives in the sibling `widget-*` apps; the bus contract and `validateManifest`/`TOPICS`/`selectVersion` live in `packages/contracts` (`@demo/contracts`). Edit those packages, not the shell, for cross-cutting widget or contract changes.

Source is small: `src/main.jsx` (bootstrap), `src/Shell.jsx` (all host logic — 247 lines), `src/EventLog.jsx` (a bus consumer panel), `src/styles.css` (design tokens + layout).

## Flow

`src/main.jsx`:
1. Parse `?permissions=` (comma-separated, default `['dashboard.view']`) into `currentUser`.
2. Parse `?token=` (default `null`) into `userToken`.
3. `createRoot('#root').render(<Shell currentUser userToken />)`.

`src/Shell.jsx` boot `useEffect` (must run strictly in order — see root CLAUDE.md RUNTIME-009):
1. `token = userToken ?? crypto.randomUUID()`.
2. `fetch(DISCOVERY_URL + '?token=' + encoded)` — `DISCOVERY_URL = import.meta.env.VITE_DISCOVERY_URL ?? 'http://localhost:5006/microFrontends'`.
3. `validateManifest(json)` from `@demo/contracts`; throw on invalid.
4. Read `X-Traffic-Bucket` response header.
5. Filter `manifest.microFrontends`: take `versions[0]`, read `extras.{module,slots,route,requiredPermissions}`, skip the entry unless `requiredPermissions.every(p => currentUser.permissions.includes(p))`. Build `remoteName = \`${name}_${version.replace(/\./g,'_')}\`` and `placements = slots.map(s => ({ slot: s.slot, variant: s.variant ?? 'full' }))`.
6. `await init({ name: 'shell', remotes: allowed.map(m => ({ name: m.remoteName, entry: m.url, type: 'module' })) })`.
7. `Object.groupBy(allowed, m => m.route)` → `byRouteRef`; set nav routes and `trafficInfo`.

Per-route render (`renderRoute`, `useCallback`):
1. Set an `abort = Symbol()` guard, `teardown()` previous mounts.
2. For each mfe on the route: `loadRemote(\`${remoteName}/${module.replace('./','')}\`)`. On throw, if `fallbackUrl` exists and differs from `url`, re-`init()` that one remote with the fallback entry and retry `loadRemote` once.
3. Load the remote **once**, then for each `placement` in `mfe.placements`: find `document.querySelector('[data-slot="<slot>"]')`; `continue` if absent. Append a wrapper div, `mod.mount(wrapper, { bus, variant })`, push `() => { unmount?.(); wrapper.remove() }` onto `unmountsRef`. A widget with multiple placements (e.g. `widget-filter` full + mini) is loaded once and mounted per slot, so module-scope state in the widget is shared across slots — keep `loadRemote` above the placement loop.

## Note

- **Port 5000 is hardcoded** in `vite.config.js` (`server.port`, `server.origin`, `base`) and in the `preview` script — three places to keep in sync.
- **`base: 'http://localhost:5000/'`** is an absolute URL so federated remotes resolve shell assets correctly; do not change to a relative base without understanding the federation impact.
- **`remoteName` is derived, not stored**: `name + '_' + version` with dots → underscores (e.g. `widget-kpi_1_0_0`). This must match each widget's federation `name` in its versioned vite config, or the MF runtime serves a stale cached module.
- **Permission gate is all-or-nothing**: a widget is dropped unless the user has *every* `requiredPermissions` entry. Dropped widgets are never fetched or mounted, and their route disappears from the nav.
- **`type: 'module'` on every remote** in both `init()` calls is mandatory (Vite dev `remoteEntry.js` is ESM) — omitting it fails with RUNTIME-001.
- **Fallback retry only fires** when `fallbackUrl` is truthy *and* `!== url`. In `discovery.local.json` they are currently identical, so the retry path is exercised only by tests.
- **`react`/`react-dom` are `singleton: true`** here (and in widget-kpi/widget-admin only). Svelte/Web-Component widgets must not share react.
- **Bus is per-mount, not cached**: `busRef = useRef(new EventTarget())`. No filter state is stored on the bus — late-mounting consumers use the `dashboard:request-filter` handshake.
- **`trafficInfo.bucket`** is `parseInt(header, 10)` or `null`; the header is only present from the Consumer API, so direct file/CDN manifest sources show no chip.
- The abort `Symbol` guards against a route change mid-`await`; if `renderAbortRef.current !== abort` the loop bails before mounting stale widgets.

## Tests

`src/Shell.test.jsx` (18 cases) mocks `@module-federation/runtime` (`init`/`loadRemote`) and `./styles.css`, and covers: loading/error states, invalid/incomplete manifests, permission gating (admin shown only with `dashboard.admin`), nav route switching, `mount` called with `{ bus }`, missing-slot skip, `loadRemote` error logging, fallback-retry, traffic-bucket chip presence/absence, empty-route render, theme toggle, and version selection via `?token=default` / `?token=canary`.

`src/EventLog.test.jsx` (6 cases) covers empty state, emit/consume lines, newest-first ordering, the 50-entry cap, and listener cleanup on unmount.

Not covered: real Module Federation loading (always mocked), real widget mounting, CSS/layout, and the actual network call to `fds-api`. Lines marked `/* c8 ignore */` in `Shell.jsx` are intentionally excluded from coverage.

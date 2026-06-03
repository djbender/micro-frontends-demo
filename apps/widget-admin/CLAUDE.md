# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo-root `CLAUDE.md` covers the monorepo and the overall micro-frontend architecture (boot sequence, mount contract, traffic splitting, discovery manifest). This file is scoped to the `widget-admin` app only — see the root file for how this directory fits the whole.

## Commands

```bash
# Dev server on port 5005 (hardcoded in vite.config.js)
pnpm --filter widget-admin dev

# Production build (target: esnext)
pnpm --filter widget-admin build

# Preview a build on port 5005
pnpm --filter widget-admin preview

# Run the test suite once
pnpm --filter widget-admin test

# Watch mode
pnpm --filter widget-admin test:watch

# Run a single test file
pnpm --filter widget-admin exec vitest run src/AdminWidget.test.jsx

# Filter by test name
pnpm --filter widget-admin exec vitest run -t "renders 3 user rows"
```

ESM only (`"type": "module"`); no TypeScript (plain JS + JSDoc). Tests run under Vitest with the `happy-dom` environment and `globals: true` — no per-file `import` of `describe`/`it`/`expect` needed (see `vitest.config.js`, setup in `src/test/setup.js`).

## What this is

`widget-admin` is a React 19 micro-frontend that renders a static admin panel (user management table with mock data). It is gated behind the `dashboard.admin` permission — the shell never mounts it for users who lack that permission. All logic lives in this app; it uses no shared behavior from `@demo/contracts` beyond the package's presence in `dependencies`.

## Flow

`src/mount.jsx` (the federation entry — exposed as `./mount`):
1. Receives `(target, _props)` — `props` is accepted but entirely ignored (no bus usage, no `props.bus` access).
2. `createRoot(target).render(<AdminWidget />)`.
3. Returns `() => root.unmount()` as the teardown function.

`src/AdminWidget.jsx`:
1. Renders a `<div>` with a header, a `dashboard.admin` permission note, and a `<table>`.
2. Iterates `MOCK_USERS` (three hardcoded entries: Alice Nakamura/Admin/active, Bob Okonkwo/Editor/active, Carol Singh/Viewer/inactive).
3. Renders version badge via `import.meta.env.VITE_WIDGET_VERSION` (replaced by Vite `define` at transform time — see vite.config.js `define['import.meta.env.VITE_WIDGET_VERSION']`).
4. All styling via CSS Modules (`AdminWidget.module.css`).

`src/dev.jsx` is a standalone dev harness — `index.html` imports it directly so you can open the widget in isolation without the shell.

## Note

- **Port 5005 is hardcoded** in `vite.config.js` (`server.port`, `server.origin`, `base`) and in the `preview` script. Three places must stay in sync.
- **`base: 'http://localhost:5005/'`** is an absolute URL; changing to a relative base will break federation asset resolution.
- **`import.meta.env.VITE_WIDGET_VERSION`** — value comes from `package.json`'s `version` field via `defineConfig`. The vitest config independently defines it as `'test'`. This matches all other widgets (see root CLAUDE.md for rationale).
- **Props are silently ignored**: `mount` accepts `_props` (underscore-prefixed) and never reads `props.bus`. The widget emits no bus events and listens to none. Dispatching bus events after unmount is safe (no listeners registered).
- **`MOCK_USERS` is hardcoded** in `AdminWidget.jsx` — no API call, no state, no data fetching. Any change to the displayed users requires editing that array directly.
- **`react`/`react-dom` are `singleton: true`** in federation `shared` config — required to avoid a duplicate React instance with the shell. Do not remove `singleton` or change `requiredVersion` without coordinating with the shell and widget-kpi.
- **Federation `name` is `'widget-admin'`** (single version, no versioned suffix). The shell derives `remoteName` as `widget-admin_<version>` from the discovery manifest; the manifest's `metadata.version` field must stay in sync with `package.json`.

## Tests

`src/AdminWidget.test.jsx` (7 cases) covers: heading renders, all 3 user rows visible, role column values, active/inactive status counts, `dashboard.admin` permission note, no crash when rendered without props, and version badge renders `vtest`.

`src/test/mount.contract.test.jsx` (4 cases) covers the universal mount contract: `mount` returns a function, content appends to target, `unmount()` clears rendered content, and bus events dispatched after unmount do not throw.

Not covered: the `dev.jsx` harness, CSS Module class application, and real Module Federation loading (no test exercises the federation runtime).

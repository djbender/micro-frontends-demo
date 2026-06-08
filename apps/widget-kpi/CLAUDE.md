# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo-root `CLAUDE.md` covers the monorepo and the overall micro-frontend architecture (boot sequence, mount contract, traffic splitting, discovery manifest). This file is scoped to `widget-kpi` only — see the root file for how this directory fits the whole.

## Commands

```bash
# Dev server — uses plain `vite` (no --config flag), defaults to vite.config.v1-0-0.js implicitly via whichever config Vite finds first; prefer pointing explicitly at a versioned config:
pnpm --filter widget-kpi exec vite --config vite.config.v1-0-0.js   # port 5001
pnpm --filter widget-kpi exec vite --config vite.config.v1-1-0.js   # port 5002

# Build both versions (run sequentially, into dist/v1-0-0 and dist/v1-1-0)
pnpm --filter widget-kpi build

# Build a single version
pnpm --filter widget-kpi build:v1-0-0
pnpm --filter widget-kpi build:v1-1-0

# Preview built artifacts
pnpm --filter widget-kpi preview          # v1.0.0, port 5001
pnpm --filter widget-kpi preview:v1-1-0   # v1.1.0, port 5002

# Run the full test suite once
pnpm --filter widget-kpi test

# Watch mode
pnpm --filter widget-kpi test:watch

# Run a single test file
pnpm --filter widget-kpi exec vitest run src/KpiWidget.test.jsx

# Filter by test name
pnpm --filter widget-kpi exec vitest run -t "FILTER_CHANGE"
```

The `dev` script in `package.json` calls bare `vite` with no `--config` — Vite will pick up whichever config file it discovers first. For dev work on both versions simultaneously, invoke vite directly with an explicit config as shown above.

Build output directories are version-scoped: `dist/v1-0-0/` and `dist/v1-1-0/`. Each directory contains its own `remoteEntry.js`.

## What this is

`widget-kpi` is a React 19 KPI dashboard widget that ships as **two simultaneously running versions** (v1.0.0 on port 5001, v1.1.0 on port 5002), each built from its own versioned Vite config. It exposes `./mount` via Module Federation and follows the universal mount contract: `mount(target, props) → unmount`. The widget listens on `props.bus` for `dashboard:filter-change` events, recomputes four KPI metrics (Revenue, Active Users, Conversion, Retention) via `src/data.js`, and emits `dashboard:event-consumed` acknowledgements. All KPI data is computed from hardcoded base values in `src/data.js` — there is no API call.

## Flow

`src/mount.jsx` (federation entry point):
1. `createRoot(target)` — React 19 concurrent root on the shell-provided DOM node.
2. `.render(<KpiWidget bus={props.bus} />)` — passes bus down; no other props.
3. Returns `() => root.unmount()` — the shell calls this on teardown.

`src/KpiWidget.jsx` (component):
1. `useState({ dateRange: '30d', segment: 'all' })` — initial filter state.
2. `useEffect([bus])`:
   a. Register `onFilter` on `TOPICS.FILTER_CHANGE` (`'dashboard:filter-change'`).
   b. Immediately dispatch `TOPICS.REQUEST_FILTER` (`'dashboard:request-filter'`) — late-mount handshake so `widget-filter` re-emits its current state.
   c. Return cleanup: `bus.removeEventListener(TOPICS.FILTER_CHANGE, onFilter)`.
3. On `FILTER_CHANGE`: `setFilter(e.detail)`, then dispatch `TOPICS.EVENT_CONSUMED` with `{ actor: 'widget-kpi', topic: TOPICS.FILTER_CHANGE, payload: e.detail }`.
4. `computeKpis(filter)` from `src/data.js` — pure function, no side effects.
5. Render four KPI cards (label, formatted value, change % with ▲/▼ indicator) and a version badge from `import.meta.env.VITE_WIDGET_VERSION`.

`src/data.js`:
- `computeKpis({ dateRange, segment })` — multiplies hardcoded `BASE` values by `RANGE_MULTIPLIER` and `SEGMENT_MULTIPLIER`, computes a fixed ~7.53% positive change (`prev = value * 0.93`). Unknown keys fall back to multiplier `1`.
- `formatValue(unit, value)` — formats `$`/`%`/count values; thousands abbreviated as `k`.

`src/dev.jsx` — standalone dev harness: creates an `EventTarget` bus and calls `mount(document.getElementById('root'), { bus })` directly. Used when running the widget in isolation.

## Note

- **Two versioned configs, both must be kept in sync** across: `port`, `origin`, federation `name`, `VITE_WIDGET_VERSION`, and `build.outDir`. The federation `name` is derived as `` `widget-kpi_${version.replace(/\./g, '_')}` `` (e.g., `widget-kpi_1_0_0`). This name **must match** the `remoteName` the shell constructs from `discovery.local.json` — a mismatch causes the MF runtime to serve a stale cached module when both versions run simultaneously.
- **`import.meta.env.VITE_WIDGET_VERSION` not `define` alone** — each config sets `define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify(version) }`. Using `VITE_WIDGET_VERSION` (not a bare `define` key) is required because Vite's `define` replacements are skipped when React Fast Refresh transforms run first; `import.meta.env.*` keys are processed in a separate pass.
- **Ports 5001/5002 are hardcoded** — in `vite.config.v1-0-0.js` (`server.port`, `server.origin`, `base`) and in the `preview`/`preview:v1-1-0` scripts. Three places per version to keep in sync.
- **`base` is an absolute URL** (`http://localhost:5001/` and `http://localhost:5002/`) — this is required so Module Federation asset resolution works correctly when both remote servers run at once. Do not change to a relative base.
- **`react`/`react-dom` are `singleton: true`** in both versioned configs. Singleton sharing requires the shell to also declare them as singletons — which it does. Do not remove this from the widget configs.
- **KPI data is entirely synthetic** — `src/data.js` hardcodes base values and multipliers. The change percentage is always ~7.53% positive (`prev = value * 0.93`) regardless of filter.
- **`vitest.config.js` uses `define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify('test') }`** — consistent with the Vite build configs. The badge renders `widget-kpi: test` in tests and is now asserted.
- **`discovery.local.json` shows a 90/10 traffic split** for this widget — v1.0.0 gets 90%, v1.1.0 gets 10%. Traffic assignment is server-side in `fds-api`; the widget itself has no awareness of versioning at runtime.

## Tests

Three test files run under Vitest with the `happy-dom` environment and `globals: true`:

`src/KpiWidget.test.jsx` (9 cases): renders 4 KPI cards, heading presence, `dashboard:request-filter` dispatch on mount, revenue value update when `dashboard:filter-change` fires (30d→7d: `$482.0k`→`$120.5k`), `dashboard:event-consumed` ack shape (`actor`, `topic`, `payload`), positive ▲ indicators for all 4 KPIs, negative ▼ indicator via mocked `computeKpis`, version badge renders `widget-kpi: test`, and listener removal on unmount.

`src/data.test.js` (18 cases): `computeKpis` shape, key order, change always ~7.53%, range multipliers (7d=0.25×, 90d=2.8×, ytd=9.1×), segment multipliers (enterprise=0.4×, smb=0.38×, consumer=0.22×), unknown key fallbacks, default args. `formatValue` edge cases for `$`/`%`/count units including the 1000 boundary.

`src/test/mount.contract.test.jsx` (4 cases): `mount` returns a function, mounts content into target, unmount clears `target.innerHTML`, post-unmount bus events do not throw.

Not covered: CSS module class names/layout, actual Module Federation loading, and interaction between two simultaneously running instances.

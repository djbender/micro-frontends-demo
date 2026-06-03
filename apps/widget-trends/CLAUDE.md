# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo-root `CLAUDE.md` covers the monorepo and the overall micro-frontend architecture (boot sequence, mount contract, traffic splitting, bus events). This file is scoped to `widget-trends` only — see the root file for how this directory fits the whole.

## Commands

```bash
# Dev server on port 5003 (hardcoded in vite.config.js)
pnpm --filter widget-trends dev

# Production build
pnpm --filter widget-trends build

# Preview a build on port 5003
pnpm --filter widget-trends preview

# Run the full test suite once
pnpm --filter widget-trends test

# Watch mode
pnpm --filter widget-trends test:watch

# Run a single test file
pnpm --filter widget-trends exec vitest run src/data.test.js

# Filter by test name
pnpm --filter widget-trends exec vitest run -t "dispatches dashboard:event-consumed"
```

ESM only (`"type": "module"`). No TypeScript — plain JS + Svelte 5 SFCs. Tests run under Vitest with the `happy-dom` environment and `globals: true` — no per-file import of `describe`/`it`/`expect` needed (configured in `vitest.config.js`, DOM matchers set up in `src/test/setup.js`). The vitest config sets `import.meta.env.VITE_WIDGET_VERSION` to `'test'` via `define` so the badge renders `vtest` in tests.

## What this is

`widget-trends` is a Svelte 5 micro-frontend that renders a line/area trends chart driven by the shared `dashboard:filter-change` bus event. It exposes a single Module Federation remote (`./mount`) consumed by the shell at runtime — nothing is bundled with the host. Chart data is generated entirely client-side from a hardcoded seed array in `src/data.js` (no network requests). The Svelte component tree is `mount.js` → `TrendsWidget.svelte` → `TrendsChart.svelte`. The bus integration and event-consumed acknowledgment live in `TrendsWidget.svelte`; the pure SVG rendering lives in `TrendsChart.svelte`.

## Flow

`src/mount.js` (the Module Federation entry point):
1. Imports `mount as svelteMount` and `unmount as svelteUnmount` from `svelte`.
2. `svelteMount(TrendsWidget, { target, props: { bus: props.bus } })` — mounts the component tree into `target`.
3. Returns `() => svelteUnmount(app)` as the unmount handle back to the shell.

`src/TrendsWidget.svelte` lifecycle:
1. Receives `bus` as a Svelte 5 `$props()` rune.
2. Initializes `filter = $state({ dateRange: '30d', segment: 'all' })`.
3. `data = $derived(generateTrend(filter))` — recomputes chart data reactively on every filter change.
4. `onMount`: adds `TOPICS.FILTER_CHANGE` listener → `onFilterChange`; dispatches `TOPICS.REQUEST_FILTER` for late-mount handshake.
5. `onFilterChange(e)`: sets `filter = e.detail`, then dispatches `TOPICS.EVENT_CONSUMED` with `{ actor: 'widget-trends', topic: TOPICS.FILTER_CHANGE, payload: e.detail }`.
6. `onDestroy`: removes the `TOPICS.FILTER_CHANGE` listener.
7. Passes `{data}` down to `<TrendsChart>`.

`src/TrendsChart.svelte`:
1. Receives `data` (array of `{ i, value }` points).
2. `$derived` chains: `scale(data)` → normalized pixel coords; `toPath(scaled)` → SVG polyline string; `toArea(scaled)` → closed fill path.
3. Renders an inline SVG (320×160 viewBox) with grid lines, area fill, line stroke, and endpoint circles. Falls back to "No data" text when the array is empty.

## Note

- **Port 5003 is hardcoded** in `vite.config.js` (`server.port`, `server.origin`, `base`) and in the `preview` script — three places to keep in sync.
- **`base: 'http://localhost:5003/'`** is an absolute URL so the shell resolves federated assets correctly. Do not change to a relative base without understanding federation asset resolution.
- **`shared: {}`** in the federation config is intentional — `widget-trends` shares no dependencies with the host. React must NOT appear here (see root CLAUDE.md).
- **`import.meta.env.VITE_WIDGET_VERSION`** is set via `define` in `vite.config.js` (sourced from `package.json` version). All four widgets share this interface — see root CLAUDE.md for rationale. The vitest config sets it to `'test'`; the badge renders `vtest` and is now asserted.
- **`90d` and `ytd` date ranges both return 30 points** — `RANGE_POINTS` caps both at 30, which is the SEED array length. There are no actual date calculations; all data is synthetic.
- **`SEGMENT_SCALE` has four known keys** (`all`, `enterprise`, `smb`, `consumer`). Any unrecognized segment falls back to scale `1` (same as `all`) via `?? 1` — it does not throw.
- **`dev.js` is not tested** — it is a thin standalone harness that mounts the widget into `#root` for isolated browser development (`vite` dev server without the shell). It is not referenced in the production federation build.
- **`segmentLabel` derivation has a `/* c8 ignore */` comment**: Svelte compiler artifacts make the ternary branches invisible to v8 coverage even when both paths are exercised by tests.

## Tests

Four test files, all under Vitest + happy-dom + `@testing-library/svelte`:

- **`src/data.test.js`** (12 cases): covers all `dateRange` values (`7d`, `30d`, `90d`, `ytd`, unknown fallback), all `SEGMENT_SCALE` multipliers, point shape `{ i, value }`, index correctness, and unknown-segment fallback.
- **`src/TrendsWidget.test.js`** (9 cases): covers initial render (heading, footer, SVG), `dashboard:request-filter` dispatch on mount, `dashboard:event-consumed` ack shape and detail payload when `FILTER_CHANGE` fires, footer text update after filter change, version badge renders `vtest`, and listener removal on destroy.
- **`src/TrendsChart.test.js`** (5 cases): covers empty state ("No data"), default-prop empty array, single-point rendering (one circle, no paths), multi-point rendering (area + line paths + two endpoint circles).
- **`src/test/mount.contract.test.js`** (4 cases): contract tests for the `mount` export — returns a function, appends content to target, unmount clears the DOM, bus events after unmount do not throw.

Not covered: real Module Federation loading (always tested via `mount.js` directly, not via `loadRemote`), CSS layout/visual output, `dev.js`, and any network I/O (there is none).

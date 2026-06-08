# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo-root `CLAUDE.md` covers the monorepo and the overall micro-frontend architecture (boot sequence, mount contract, traffic splitting, discovery manifest). This file is scoped to the `widget-filter` app only — see the root file for how this directory fits the whole.

## Commands

```bash
# Dev server on port 5004 (port is hardcoded in vite.config.js)
pnpm --filter widget-filter dev

# Production build (target: esnext)
pnpm --filter widget-filter build

# Serve the build on http://localhost:5004
pnpm --filter widget-filter preview

# Run the test suite once
pnpm --filter widget-filter test

# Watch mode
pnpm --filter widget-filter test:watch

# Run a single test file
pnpm --filter widget-filter exec vitest run src/FilterWidget.test.js

# Filter by test name
pnpm --filter widget-filter exec vitest run -t "REQUEST_FILTER"
```

ESM only (`"type": "module"`); no TypeScript (plain JS + JSDoc). Tests run under Vitest with the `happy-dom` environment and `globals: true` via `src/test/setup.js`. `import.meta.env.VITE_WIDGET_VERSION` is replaced with `'test'` by `vitest.config.js` at test time.

## What this is

`widget-filter` is a **Web Component** micro-frontend — a single `<filter-widget>` custom element — that owns the dashboard's filter state. It has no framework dependency (no React, no Svelte). Logic lives in `src/FilterWidget.js` (`FilterWidget` class), the module-scope `src/store.js` singleton, and the thin `src/mount.js` adapter. The bus event topics (`TOPICS.FILTER_CHANGE`, `TOPICS.REQUEST_FILTER`) are imported from `@demo/contracts` (`packages/contracts/index.js`).

This widget is mounted **twice** by the shell from one manifest entry — a `full` interactive bar (`toolbar` slot) and a compact read-only `mini` mirror (`side` slot). Both copies stay in sync through `store.js`, which is shared because the remote is loaded once and `mount()` is called per slot. See the root CLAUDE.md "Single MFE in multiple slots" section.

## Flow

`src/mount.js` (called by the shell once per slot):
1. `import './FilterWidget.js'` — registers `<filter-widget>` via the `customElements.define` guard (only registers once, even if `mount` is called multiple times).
2. `document.createElement('filter-widget')` — creates the element.
3. `el.setAttribute('variant', props.variant ?? 'full')` — `'full'` or `'mini'`, set before connect to avoid a flash.
4. `el.bus = props.bus` — sets the bus via the `bus` setter, which calls `attachBus(bus)` on the store and attaches a `dashboard:request-filter` listener (`#handleRequest`) on the bus.
5. `target.appendChild(el)` — triggers `connectedCallback()`, which subscribes to the store and calls `#render()`.
6. Returns `() => el.remove()` — fires `disconnectedCallback()`, which unsubscribes from the store and removes the `dashboard:request-filter` listener.

`src/store.js` (module-scope singleton, shared across every mount):
- `state = { dateRange:'30d', segment:'all' }`, a `subscribers` Set, and a `bus` ref.
- `setFilter(patch)` — updates state, notifies **all** subscribers (internal self-sync of every copy), then dispatches `FILTER_CHANGE` on the bus **exactly once** (external broadcast to kpi/trends). The single emit point is the structural echo guard — two mounted copies still produce one bus event.
- `emitCurrent()` — re-emits current state without notifying subscribers (the `REQUEST_FILTER` handshake reply).
- `getState()` returns a copy; `subscribe(fn)→unsub`; `__resetStore()` is test-only.

`FilterWidget` class (`src/FilterWidget.js`):
- Private fields: `#bus`, `#shadow` (open shadow root), `#unsub`, `#variant`. **No** filter state — it reads `getState()` and writes via `setFilter()`.
- `#render()` branches on `#variant`: `#renderFull` (date-range buttons `7d/30d/90d/ytd`, segment `<select>`, version badge) or `#renderMini` (read-only "Filter Mirror" panel — a title + version badge header and a `Showing: <range> · <Segment>` chip, no interactive controls or listeners).
- Date-range button click → `setFilter({ dateRange })`. Segment change → `setFilter({ segment })`. The store's subscriber loop re-renders every copy — handlers do **not** call `#render()` directly (that would double-render).
- `#handleRequest` → `emitCurrent()`, replying to a late-mounting consumer with current state.
- `observedAttributes`/`attributeChangedCallback` track `variant` and re-render when connected.

## Note

- **Port 5004 is hardcoded** in `vite.config.js` (`server.port`, `server.origin`, `base`) and in the `preview` script — three places to keep in sync.
- **`shared: {}`** — the federation config intentionally has an empty `shared` object. Do not add `react` or `react-dom` here; this widget has no framework and the shell enforces react as a singleton only in react-based widgets.
- **`customElements.define` guard**: the `if (!customElements.get('filter-widget'))` check at the bottom of `FilterWidget.js` prevents re-registration errors if the module is evaluated more than once. The `/* v8 ignore next 3 */` comment intentionally excludes the `else` branch from coverage.
- **Bus listener is attached in the `bus` setter**, not in `connectedCallback`. The setter fires before `appendChild`, so the element is ready to respond to `dashboard:request-filter` immediately after `el.bus = props.bus`.
- **`disconnectedCallback` unsubscribes from the store and removes the bus listener** via `#bus?.removeEventListener(TOPICS.REQUEST_FILTER, this.#handleRequest)`. The `#handleRequest` field is a class field arrow function (not a method), so the same reference is used for both `addEventListener` and `removeEventListener`. Do not convert it to a regular method — the reference would no longer match.
- **`#render()` is a full innerHTML replace**: every store change re-renders the entire shadow DOM and re-attaches all event handlers. This is intentional (keeps the code simple) but means any focus state is lost on date-range selection.
- **Shared store is the sync mechanism, not the bus.** `store.js` is a module-scope singleton; two mounts of this remote share it because Module Federation evaluates the module once. `setFilter` syncs copies internally and emits on the bus once. Do not move the bus emit into the per-instance subscriber callback — that reintroduces the N-copies-N-emits echo the structural guard prevents.
- **`__resetStore()` in tests.** Because the store persists across test cases, `FilterWidget.test.js` and `test/mount.contract.test.js` call `__resetStore()` in `beforeEach`.
- **Version badge** uses `import.meta.env.VITE_WIDGET_VERSION` (a Vite `define` replacement set from `package.json`'s `version` field). All four widgets share this interface — see root CLAUDE.md for rationale. Both variants render the badge (the `mini` mirror shows it next to its "Filter Mirror" title to make clear it is the same versioned widget).
- **`src/dev.js`** is the standalone dev harness — it creates a bare `EventTarget` bus and mounts the widget into `#root` (defaults to `variant: 'full'`). It is not part of the federation bundle.

## Tests

`src/FilterWidget.test.js` imports `mount` and covers: custom element registration, `mount()` appending to container, unmount function type and removal, shadow DOM structure (4 date-range buttons with correct labels, `30d` initially active), `REQUEST_FILTER` triggering `FILTER_CHANGE` with current state, button click emitting new `dateRange`, segment select emitting new `segment`, and version badge renders `widget-filter: test`. Plus dual-mount/store cases: two copies (full + mini) sync on a single click, one user action emits `FILTER_CHANGE` exactly once across both copies, the `mini` variant is read-only and reflects current store state on late mount, and `__resetStore` restores defaults + clears subscribers.

`src/test/mount.contract.test.js` (4 cases) is a generic mount-contract suite: returns a function, appends content, unmount empties target, bus events after unmount do not throw.

Not covered: `#render()` re-attach path after a date-range click (the re-render itself is exercised but not the handler re-attachment in isolation), dark-mode / design-token rendering (CSS custom properties, no assertions on computed styles), and the `/* v8 ignore */`-marked `customElements.define` guard branch.

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

`widget-filter` is a **Web Component** micro-frontend — a single `<filter-widget>` custom element — that emits filter state changes across the shared `EventTarget` bus. It has no framework dependency (no React, no Svelte). All logic lives in `src/FilterWidget.js` (`FilterWidget` class) and the thin `src/mount.js` adapter. The bus event topics (`TOPICS.FILTER_CHANGE`, `TOPICS.REQUEST_FILTER`) are imported from `@demo/contracts` (`packages/contracts/index.js`).

## Flow

`src/mount.js` (called by the shell on every mount):
1. `import './FilterWidget.js'` — registers `<filter-widget>` via the `customElements.define` guard (only registers once, even if `mount` is called multiple times).
2. `document.createElement('filter-widget')` — creates the element.
3. `el.bus = props.bus` — sets the bus via the `bus` setter, which immediately attaches a `dashboard:request-filter` listener (`#handleRequest`) on the bus.
4. `target.appendChild(el)` — triggers `connectedCallback()`, which calls `#render()`.
5. Returns `() => el.remove()` — calling it removes the element and fires `disconnectedCallback()`, which removes the `dashboard:request-filter` listener from the bus.

`FilterWidget` class (`src/FilterWidget.js`):
- Private state: `#dateRange = '30d'`, `#segment = 'all'`, `#bus`, `#shadow` (open shadow root).
- `#render()` — rebuilds `shadowRoot.innerHTML` with CSS + markup. Date-range buttons (`7d`, `30d`, `90d`, `ytd`) and a segment `<select>` (`all`, `enterprise`, `smb`, `consumer`). Re-attaches click/change handlers after each re-render (full innerHTML replace, not incremental).
- Date-range button click → sets `#dateRange`, re-renders, calls `#emit()`.
- Segment `<select>` change → sets `#segment`, calls `#emit()` (no re-render needed).
- `#emit()` → dispatches `dashboard:filter-change` CustomEvent on `#bus` with `detail: { dateRange, segment }`.
- `#handleRequest` → calls `#emit()`, replying to any late-mounting consumer with the current state immediately.

## Note

- **Port 5004 is hardcoded** in `vite.config.js` (`server.port`, `server.origin`, `base`) and in the `preview` script — three places to keep in sync.
- **`shared: {}`** — the federation config intentionally has an empty `shared` object. Do not add `react` or `react-dom` here; this widget has no framework and the shell enforces react as a singleton only in react-based widgets.
- **`customElements.define` guard**: the `if (!customElements.get('filter-widget'))` check at the bottom of `FilterWidget.js` prevents re-registration errors if the module is evaluated more than once. The `/* v8 ignore next 3 */` comment intentionally excludes the `else` branch from coverage.
- **Bus listener is attached in the `bus` setter**, not in `connectedCallback`. The setter fires before `appendChild`, so the element is ready to respond to `dashboard:request-filter` immediately after `el.bus = props.bus`.
- **`disconnectedCallback` removes the bus listener** via `#bus?.removeEventListener(TOPICS.REQUEST_FILTER, this.#handleRequest)`. The `#handleRequest` field is a class field arrow function (not a method), so the same reference is used for both `addEventListener` and `removeEventListener`. Do not convert it to a regular method — the reference would no longer match.
- **`#render()` is a full innerHTML replace**: every button click re-renders the entire shadow DOM and re-attaches all event handlers. This is intentional (keeps the code simple) but means any focus state is lost on date-range selection.
- **Version badge** uses `import.meta.env.VITE_WIDGET_VERSION` (a Vite `define` replacement set from `package.json`'s `version` field). All four widgets share this interface — see root CLAUDE.md for rationale.
- **`src/dev.js`** is the standalone dev harness — it creates a bare `EventTarget` bus and mounts the widget into `#root`. It is not part of the federation bundle.

## Tests

`src/FilterWidget.test.js` (9 cases) imports `mount` and covers: custom element registration, `mount()` appending to container, unmount function type and removal, shadow DOM structure (4 date-range buttons with correct labels, `30d` initially active), `REQUEST_FILTER` triggering `FILTER_CHANGE` with current state, button click emitting new `dateRange`, segment select emitting new `segment`, and version badge renders `vtest`.

`src/test/mount.contract.test.js` (4 cases) is a generic mount-contract suite: returns a function, appends content, unmount empties target, bus events after unmount do not throw.

Not covered: `#render()` re-attach path after a date-range click (the re-render itself is exercised but not the handler re-attachment in isolation), dark-mode / design-token rendering (CSS custom properties, no assertions on computed styles), and the `/* v8 ignore */`-marked `customElements.define` guard branch.

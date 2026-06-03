# widget-filter

A Web Component micro-frontend that renders a filter bar and broadcasts filter-state changes across the shared event bus. It has no framework dependency — no React, no Svelte — just a native custom element (`<filter-widget>`).

For the overall architecture (boot sequence, mount contract, traffic splitting, discovery manifest schema), see the repository-root `README.md` and `CLAUDE.md`.

## Run / Build

This app is part of a pnpm workspace. Run it from anywhere in the repo with the `--filter` flag.

```bash
# Dev server (Vite) on http://localhost:5004
pnpm --filter widget-filter dev

# Production build
pnpm --filter widget-filter build

# Serve the build on http://localhost:5004
pnpm --filter widget-filter preview
```

The dev server port (`5004`) is hardcoded in `vite.config.js`. When running standalone (`pnpm --filter widget-filter dev`), the widget renders in a bare harness (`src/dev.js`) with no shell and no real bus consumers — filter events are dispatched but nothing reacts to them. To see the full integration, start all services with `pnpm dev` from the repo root.

## Usage / Interface

The widget exposes a `./mount` entry via Module Federation. The shell calls it as:

```js
const mod = await loadRemote('widget-filter/mount');
const unmount = mod.mount(targetElement, { bus });
// later:
unmount(); // removes the element and cleans up bus listeners
```

| Parameter | Type | Purpose |
|---|---|---|
| `target` | `HTMLElement` | DOM node the widget appends `<filter-widget>` into |
| `props.bus` | `EventTarget` | Shared bus for cross-widget communication |

The returned `unmount` function removes the `<filter-widget>` element and detaches the `dashboard:request-filter` listener from the bus.

### Events emitted

| Event | Detail shape | When |
|---|---|---|
| `dashboard:filter-change` | `{ dateRange: string, segment: string }` | User clicks a date-range button or changes the segment select; also in response to `dashboard:request-filter` |

### Events consumed

| Event | Behavior |
|---|---|
| `dashboard:request-filter` | Widget immediately re-emits current state as `dashboard:filter-change` (late-mount handshake for consumers that mount after the widget) |

### Filter values

| Control | Options | Default |
|---|---|---|
| Date range | `7d`, `30d`, `90d`, `ytd` | `30d` |
| Segment | `all`, `enterprise`, `smb`, `consumer` | `all` |

## Configuration

| Item | Value | Location |
|---|---|---|
| Dev / preview port | `5004` (hardcoded) | `vite.config.js` — `server.port`, `server.origin`, `base`; also `package.json` `preview` script |
| Widget version | `1.0.0` (from `package.json`) | Injected via Vite `define` as `import.meta.env.VITE_WIDGET_VERSION`; rendered in the version badge |
| Shared dependencies | none (`shared: {}`) | `vite.config.js` — intentionally empty; do not add `react`/`react-dom` |

There are no runtime environment variables for this widget.

## Tests

```bash
# Run once
pnpm --filter widget-filter test

# Watch mode
pnpm --filter widget-filter test:watch
```

Tests run under Vitest with the `happy-dom` environment. Two test files:

- `src/FilterWidget.test.js` — covers custom element registration, mount/unmount, shadow DOM structure (4 date-range buttons, correct labels, `30d` initially active), the `dashboard:request-filter` → `dashboard:filter-change` handshake, button-click and segment-change emissions.
- `src/test/mount.contract.test.js` — generic mount-contract assertions (returns function, appends content, unmount empties target, post-unmount bus events do not throw).

CSS rendering, computed design-token values, and the `customElements.define` guard branch are not covered by tests.

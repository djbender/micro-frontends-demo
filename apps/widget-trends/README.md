# widget-trends

A Svelte 5 micro-frontend that renders a trends line/area chart, driven by the shared event bus. It is loaded at runtime by the shell via Module Federation and has no build-time coupling to the host.

For overall architecture, the mount contract, traffic splitting, and the discovery manifest, see the repository-root `README.md` and `CLAUDE.md`.

## Run / Build

This app is part of a pnpm workspace. Run it from anywhere in the repo with the `--filter` flag.

```bash
# Dev server (Vite) on http://localhost:5003
pnpm --filter widget-trends dev

# Production build (outputs to dist/)
pnpm --filter widget-trends build

# Serve the build on http://localhost:5003
pnpm --filter widget-trends preview
```

The simplest way to bring the full dashboard up is `pnpm dev` from the repo root, which starts all six servers in parallel. Run alone, the widget dev server works for isolated development — open the browser to `http://localhost:5003` and `src/dev.js` mounts the widget directly into `#root` with a plain `EventTarget` bus.

The dev server port (`5003`) is hardcoded in `vite.config.js`.

## Usage / Interface

The widget exposes a single Module Federation remote. The shell loads it via `loadRemote('widget-trends/mount')` and calls the exported `mount` function:

| Export | Signature | Description |
|---|---|---|
| `mount` | `mount(target: Element, props: { bus: EventTarget }) → () => void` | Mounts the widget into `target`. Returns an unmount function that tears down the Svelte component tree. |

The shell must pass a `bus` (`EventTarget`) in `props`. The widget will not render without it.

Concrete example (what the shell does internally):

```js
import { loadRemote } from '@module-federation/runtime';

const mod = await loadRemote('widget-trends/mount');
const unmount = mod.mount(document.querySelector('[data-slot="trends"]'), { bus });
// later, to tear down:
unmount();
```

### Bus events

| Event | Direction | Detail shape | Description |
|---|---|---|---|
| `dashboard:filter-change` | consumed | `{ dateRange: string, segment: string }` | Widget updates its chart and dispatches the ack below. |
| `dashboard:request-filter` | emitted on mount | — | Handshake so `widget-filter` re-emits current state to late-mounting consumers. |
| `dashboard:event-consumed` | emitted after filter change | `{ actor: 'widget-trends', topic: 'dashboard:filter-change', payload: { dateRange, segment } }` | Acknowledgment dispatched to the bus after handling each filter change. The shell's EventLog panel displays these. |

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `import.meta.env.VITE_WIDGET_VERSION` | Widget version badge shown in the UI, injected by Vite at transform time from `package.json`. | `1.0.0` (from `package.json`) |

There are no runtime environment variables. The following values are hardcoded in `vite.config.js` and must be changed there if the port changes:

- Dev/preview port: `5003`
- `server.origin`: `http://localhost:5003`
- `base`: `http://localhost:5003/`

All chart data is generated client-side from a hardcoded seed array in `src/data.js` — there are no network requests or external data sources.

## Tests

```bash
# Run once
pnpm --filter widget-trends test

# Watch mode
pnpm --filter widget-trends test:watch

# Run a single file
pnpm --filter widget-trends exec vitest run src/TrendsWidget.test.js

# Filter by test name
pnpm --filter widget-trends exec vitest run -t "dispatches dashboard:event-consumed"
```

Tests run under Vitest with the `happy-dom` environment and `@testing-library/svelte`. Four test files:

- `src/data.test.js` — unit tests for `generateTrend`: all date ranges, all segment multipliers, point shape, and fallback behavior.
- `src/TrendsWidget.test.js` — integration tests for the full Svelte component: rendering, bus event handling, filter state updates, and listener cleanup.
- `src/TrendsChart.test.js` — tests for the SVG chart component: empty state, single point, and multi-point rendering.
- `src/test/mount.contract.test.js` — contract tests verifying the `mount` export signature, DOM attachment, teardown, and post-unmount bus safety.

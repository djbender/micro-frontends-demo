# widget-kpi

A React 19 KPI dashboard micro-frontend that ships as two simultaneously running versions (v1.0.0 and v1.1.0), each exposed via Module Federation and loadable by the shell at runtime. It renders four KPI cards — Revenue, Active Users, Conversion, Retention — reacting to filter events from the shared event bus.

For the overall architecture (boot sequence, discovery manifest, traffic splitting, mount contract), see the repository-root `README.md` and `CLAUDE.md`.

## Run / Build

Commands use the pnpm workspace `--filter` flag and can be run from anywhere in the repo.

```bash
# Dev server — explicitly target a versioned config
pnpm --filter widget-kpi exec vite --config vite.config.v1-0-0.js   # http://localhost:5001
pnpm --filter widget-kpi exec vite --config vite.config.v1-1-0.js   # http://localhost:5002

# Build both versions sequentially (output: dist/v1-0-0/ and dist/v1-1-0/)
pnpm --filter widget-kpi build

# Build one version at a time
pnpm --filter widget-kpi build:v1-0-0
pnpm --filter widget-kpi build:v1-1-0

# Preview a production build
pnpm --filter widget-kpi preview          # v1.0.0 on port 5001
pnpm --filter widget-kpi preview:v1-1-0   # v1.1.0 on port 5002
```

The simplest way to bring up all servers at once (shell + all widgets + API) is `pnpm dev` from the repo root.

## Usage / Interface

The widget follows the universal mount contract used by all micro-frontends in this project:

```js
// Called by the shell after Module Federation loadRemote()
const unmount = mount(domTarget, { bus });

// Called by the shell on route change or teardown
unmount();
```

| Parameter | Type | Description |
|---|---|---|
| `target` | `HTMLElement` | DOM node provided by the shell; the widget renders into it |
| `props.bus` | `EventTarget` | Shared event bus injected by the shell |

**Bus events listened to:**

| Event | When | Effect |
|---|---|---|
| `dashboard:filter-change` | `widget-filter` changes date range or segment | Recomputes and re-renders all four KPI cards |

**Bus events emitted:**

| Event | When | Detail shape |
|---|---|---|
| `dashboard:request-filter` | On mount | `{}` — triggers `widget-filter` to re-emit its current state (late-mount handshake) |
| `dashboard:event-consumed` | After each `filter-change` | `{ actor: 'widget-kpi', topic: 'dashboard:filter-change', payload: { dateRange, segment } }` |

**Concrete example** — opening the dashboard in the canary traffic bucket (which resolves v1.1.0):

```
http://localhost:5000/?token=canary
```

The shell hashes `token=canary` to bucket 100, the Consumer API resolves that to the v1.1.0 entry from `discovery.local.json`, and `widget-kpi_1_1_0` is loaded from port 5002. The version badge in the widget header shows `v1.1.0`.

## Configuration

No runtime environment variables are read by the widget itself. All version-specific settings are baked into the Vite config at build time.

| Setting | Where set | v1.0.0 value | v1.1.0 value |
|---|---|---|---|
| Dev/preview port | `vite.config.v1-0-0.js` / `vite.config.v1-1-0.js` | `5001` | `5002` |
| Federation `name` | Same configs | `widget-kpi_1_0_0` | `widget-kpi_1_1_0` |
| `VITE_WIDGET_VERSION` | `define` in each config | `'1.0.0'` | `'1.1.0'` |
| Build output directory | `build.outDir` in each config | `dist/v1-0-0` | `dist/v1-1-0` |

**Hardcoded values worth noting:**

- Ports `5001` and `5002` appear in three places each: `server.port`, `server.origin`, and `base` in the versioned configs, plus the `preview`/`preview:v1-1-0` script entries in `package.json`.
- The `base` URL is absolute (`http://localhost:5001/`, `http://localhost:5002/`) — required for Module Federation asset resolution when both remote servers run simultaneously.
- KPI base values and all segment/range multipliers are hardcoded in `src/data.js`. There is no backend data source.
- The federation `name` (`widget-kpi_1_0_0` / `widget-kpi_1_1_0`) must match the `remoteName` the shell derives from `discovery.local.json` — a mismatch causes the MF runtime to serve a cached module from the wrong version.

## Tests

```bash
# Run all tests once
pnpm --filter widget-kpi test

# Watch mode
pnpm --filter widget-kpi test:watch

# Single file
pnpm --filter widget-kpi exec vitest run src/KpiWidget.test.jsx

# Filter by name
pnpm --filter widget-kpi exec vitest run -t "FILTER_CHANGE"
```

Tests run under Vitest with the `happy-dom` environment and `globals: true` (no per-file imports of `describe`/`it`/`expect` needed). Three test files:

- **`src/KpiWidget.test.jsx`** — component rendering, bus event dispatch/receive, ack shape, ▲/▼ indicators, listener cleanup on unmount.
- **`src/data.test.js`** — `computeKpis` output shape, key order, range and segment multipliers, unknown-key fallbacks. `formatValue` edge cases for all three unit types (`$`, `%`, count) including the 1000 threshold.
- **`src/test/mount.contract.test.jsx`** — universal mount contract: return type, DOM content after mount, `target.innerHTML` cleared after unmount, no throw on post-unmount bus events.

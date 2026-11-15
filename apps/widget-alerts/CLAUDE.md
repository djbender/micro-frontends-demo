# CLAUDE.md

The repo-root `CLAUDE.md` covers the monorepo, the boot sequence, the mount contract and the bus events. This file is scoped to `widget-alerts` only.

## Commands

```bash
pnpm --filter widget-alerts dev      # port 5007 (hardcoded in vite.config.js)
pnpm --filter widget-alerts build
pnpm --filter widget-alerts preview  # port 5007
pnpm --filter widget-alerts test
```

## What it is

A mocked "Recent Alerts" table (Angular 22, standalone, zoneless, signals + RxJS). It is a bus consumer like `widget-kpi` and `widget-trends`:

- listens for `dashboard:filter-change` via `fromEvent(bus, ...)` → `toSignal` (auto-unsubscribes on destroy),
- dispatches `dashboard:event-consumed` with `actor: 'widget-alerts'`,
- dispatches `dashboard:request-filter` on construction (late-mount handshake).

It also has its own local controls (severity select + search, a reactive form; sortable columns). Those never touch the bus.

## Gotchas

- **TypeScript is allowed here only.** Angular's compiler needs decorators. `mount.js` and `data.js` stay plain JS; the component and `bus.token.ts` are TS.
- **TypeScript must stay on 6.0.x.** Angular 22's compiler rejects any other version at build time (`requires TypeScript >=6.0.0 and <6.1.0`). Bump `typescript` and `@angular/*` together.
- **`tsconfig` is passed explicitly** to `angular()` in both `vite.config.js` and `vitest.config.js`. Analog otherwise looks for `tsconfig.app.json`.
- **There is no `<alerts-widget>` element in the DOM.** `mount()` uses `createComponent(..., { hostElement: target })`, so the shell's wrapper div *is* the host. Select the widget via `[data-widget="alerts"]` (set on the root `<section>`), not the component selector.
- **Bootstrap is async, `unmount` is sync.** `mount()` records a teardown that arrives mid-bootstrap and applies it once the app exists (covered in `mount.test.js`).
- **Vitest needs `@angular/compiler`** loaded (`src/test/setup.js`) because Angular libs are partially compiled and only linked by Analog at build time.
- **pnpm install scripts are denied** in the root `pnpm-workspace.yaml` (`allowBuilds: false`) for `@parcel/watcher`, `esbuild`, `lmdb` and `msgpackr-extract`, which arrive via `@angular/build`. Builds work without them; re-check if a build starts failing on a missing native binary.
- Do **not** add react to `shared` in the federation config.

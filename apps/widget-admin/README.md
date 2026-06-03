# widget-admin

A React 19 micro-frontend that renders a permission-gated admin panel with a static user management table. It is mounted by the shell only when the current user holds the `dashboard.admin` permission.

For the overall architecture (boot sequence, mount contract, traffic splitting, discovery manifest), see the repository-root `README.md` and `CLAUDE.md`.

## Run / Build

This app is part of a pnpm workspace. Run it from anywhere in the repo with the `--filter` flag.

```bash
# Dev server (Vite) on http://localhost:5005
pnpm --filter widget-admin dev

# Production build
pnpm --filter widget-admin build

# Serve the build on http://localhost:5005
pnpm --filter widget-admin preview
```

**In isolation:** the app ships a `src/dev.jsx` harness — `index.html` points to it directly, so `pnpm --filter widget-admin dev` opens the widget standalone in the browser without the shell.

**As part of the dashboard:** start everything with `pnpm dev` from the repo root, then open the shell at `http://localhost:5000` with the `dashboard.admin` permission:

```
http://localhost:5000/?permissions=dashboard.view,dashboard.admin
```

The dev server port (`5005`) is hardcoded in `vite.config.js`.

## Usage / Interface

The widget renders a single admin panel component with no interactive controls. It exposes a `mount` function via Module Federation as `./mount`.

| Export | Signature | Notes |
|--------|-----------|-------|
| `./mount` | `mount(target: HTMLElement, props: object) → () => void` | Renders into `target`; returns `root.unmount`. `props` is accepted but unused — no bus wiring. |

`AdminWidget` renders:

| Section | Content |
|---------|---------|
| Header | "Admin Panel" heading + version badge (`import.meta.env.VITE_WIDGET_VERSION` from `package.json`) |
| Subtitle | Permission note showing `dashboard.admin` |
| Table | Three hardcoded users: Alice Nakamura (Admin/active), Bob Okonkwo (Editor/active), Carol Singh (Viewer/inactive) |

Concrete example — mount the widget manually in a browser console after the federation runtime is initialized:

```js
const mod = await loadRemote('widget-admin/mount');
const target = document.querySelector('[data-slot="admin"]');
const unmount = mod.mount(target, { bus: new EventTarget() });
// later:
unmount();
```

## Configuration

| Item | Value | Notes |
|------|-------|-------|
| Dev/preview port | `5005` | Hardcoded in `vite.config.js` (`server.port`, `server.origin`, `base`, `preview` script) |
| Federation name | `widget-admin` | Single version; shell derives remote name as `widget-admin_<version>` from the manifest |
| `react` / `react-dom` | `singleton: true` in federation `shared` | Must match the shell's shared config to avoid duplicate React instances |
| `import.meta.env.VITE_WIDGET_VERSION` | Read from `package.json` `version` at build time via Vite `define` | No env var override — change `package.json` to change the badge |
| User data | `MOCK_USERS` array in `AdminWidget.jsx` | Hardcoded; no API, no props |

No environment variables are read at runtime. The widget does not use `props.bus` and emits no bus events.

## Tests

```bash
# Run once
pnpm --filter widget-admin test

# Watch mode
pnpm --filter widget-admin test:watch

# Single file
pnpm --filter widget-admin exec vitest run src/AdminWidget.test.jsx

# Filter by name
pnpm --filter widget-admin exec vitest run -t "mount contract"
```

Tests run under Vitest with the `happy-dom` environment. Two test files:

- `src/AdminWidget.test.jsx` — renders the component and asserts heading, all three user rows, role values, active/inactive status counts, and the `dashboard.admin` permission note.
- `src/test/mount.contract.test.jsx` — exercises the universal mount contract: `mount` returns an unmount function, content appears in the target, `unmount()` clears `innerHTML`, and bus events dispatched after unmount do not throw.

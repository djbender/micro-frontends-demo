# Demo Compromises & Design Notes

This is a **teaching demo** for runtime-composed micro-frontends. To keep setup
trivial and the patterns legible, it intentionally trades production hardening
for clarity. This doc records what was simplified, why, and what real production
would do instead — so nobody mistakes a deliberate shortcut for a recommended
pattern.

The *patterns* demonstrated are sound: runtime composition, a universal mount
contract, an `EventTarget` bus, a module-scope singleton store, and server-side
version selection. The compromises below are the surrounding plumbing.

---

## 1. Authentication & authorization — entirely faked, client-side

| What | Where | Real production |
|---|---|---|
| Permissions come from a URL param (`?permissions=dashboard.admin`) | `apps/shell/src/main.jsx:7-10` | Identity service; permissions resolved server-side |
| `userToken` accepted but never verified | `apps/fds-api/server.js:50` | Signed token (JWT/HMAC), validated |
| Gating happens only in the shell; widgets get no user context | `apps/shell/src/Shell.jsx:41` | Server-enforced authz; widgets never trust client claims |

Any visitor can grant themselves admin via the URL. This is the single most
"do-not-copy" compromise.

## 2. Supply-chain integrity — disabled

- `metadata.integrity` is `""` for every entry — `apps/shell/public/discovery.local.json` (lines 9, 27, 46, 66, 89). No SRI; remote code loaded unverified.
- The manifest itself is unsigned — only schema-validated (`packages/contracts/index.js` `validateManifest`).

Production: real SRI hashes per `remoteEntry.js`, signed manifest.

## 3. Discovery manifest — a static JSON file

- `apps/shell/public/discovery.local.json` is checked into the repo. `fds-api`
  reads + parses it on **every request** (`server.js:16-18`) — intentional so
  live edits show up, but no caching, no invalidation, no last-good fallback.
- `fallbackUrl === url` on every entry, so the shell's fallback-retry path
  (`Shell.jsx:82-91`) never actually fires outside tests.
- Manifest path is resolved relative to **process cwd**, not the server file
  (`server.js:7`) — breaks if launched from the wrong directory.

## 4. Traffic splitting — toy implementation

- Magic tokens bypass bucketing, unauthenticated: `?token=default` → bucket 1,
  `?token=canary` → bucket 100 (`server.js:10-13`, `contracts/index.js:74-77`).
  Anyone can force the canary version.
- `djb2(token + urls)` hashing only — no cohorts, groups, or sticky identity.
- **Two parallel selection paths**: `computeBucket()` in the server vs
  `selectVersion()` in contracts. They must be kept in sync by hand or the
  `X-Traffic-Bucket` header disagrees with the version actually served.
- `X-Traffic-Bucket` reflects only the **last MFE iterated** (`server.js:23,27`)
  — works only because `widget-kpi` happens to be the split widget. A second
  split widget would make the header lie. The bucket is also duplicated into the
  JSON body (`server.js:32`) as dead/leftover data.

## 5. Data — 100% synthetic

- KPI values hardcoded, change always +7.53% (`prev = value * 0.93`) — `apps/widget-kpi/src/data.js`.
- Trends use a fixed 30-point seed; `90d` and `ytd` return the same series — `apps/widget-trends/src/data.js`.
- Admin shows 3 hardcoded mock users — `apps/widget-admin/src/AdminWidget.jsx:4-8`.

No widget fetches real data.

## 6. Configuration — hardcoded localhost everywhere

- Ports baked as constants (5000–5006); origins/base = `http://localhost:XXXX`
  in every `vite.config*.js` and `server.js:6-8`. `PORT=5006` has no env override.
- Only `VITE_DISCOVERY_URL` and `ADMIN_MANIFEST_PATH` are env-overridable. No
  `.env`/dotenv support.
- CORS in `fds-api` is a single hardcoded origin `http://localhost:5000`
  (`server.js:8`); dev widget servers use `cors: true`.

## 7. widget-kpi dual-config duplication

`apps/widget-kpi/vite.config.v1-0-0.js` and `vite.config.v1-1-0.js` are
near-identical files so two versions can run side-by-side. This is
**documented-necessary**: Vite applies `define` replacements per-server at
transform time, and the federation `name` must match the versioned remote name
(`widget-kpi_1_0_0` / `widget-kpi_1_1_0`) so the MF runtime doesn't serve a
cached module. The cost is version skew risk — build-logic changes must be made
in both files. It's a Vite/HMR workaround, not a clean MFE pattern.

## 8. Shared dependencies — singleton-only

`react`/`react-dom` are `singleton: true, requiredVersion: '^19'`. No
isolated-scope fallback, so one widget's breaking React change breaks all. No
multi-version React coexistence.

## 9. Missing production infrastructure

- No TypeScript (plain JS + JSDoc throughout).
- `lint: oxlint .` is defined but there's **no oxlint config** → defaults only. No prettier config.
- No CI for the app build/lint/typecheck; no pre-commit hooks.
- `fds-api`: no rate limiting, no structured logging (only a startup
  `console.log`), no metrics/tracing, no error monitoring. Errors return a bare
  `500 { error: e.message }` that leaks the internal message.
- Tests cover `selectVersion` (the contract) but **not the HTTP layer** —
  routing, status codes, CORS, and header wiring in `server.js` are uncovered.

## 10. Resilience

- Single fallback retry then catch-and-log (`Shell.jsx:82-91, 106`). On failure
  a widget silently doesn't mount; no UI error shown to the user.
- No circuit breaker / last-good-manifest cache; a corrupt or missing manifest
  makes every request 400/500 with no degradation.

---

## On the `fds-api` itself — is a discovery API "typical" for MFE?

A short architectural note, since it comes up.

**The concept is real and standard at scale, but this specific implementation is
the heavyweight end of a spectrum — not a universal requirement.**

The pattern this demo copies is AWS's
[Frontend Discovery Service](https://github.com/awslabs/frontend-discovery-service)
(the manifest schema points at it). The idea: the shell shouldn't hardcode where
remotes live or which version to load. It asks a service at boot, *"what version
of each widget does this user get?"* That enables:

- Independent deploys — a widget team ships and updates the manifest with no shell rebuild.
- Server-side traffic splitting / canary / gradual rollout.
- Per-user version pinning and kill-switch / rollback without a redeploy.

Those capabilities genuinely require a server, because the decision must be
**centralized and dynamic** — it can't be baked into a static shell bundle. That
one piece (dynamic, per-user, server-decided versioning) is the reason this demo
stands up a dedicated API: it's the flashy MFE capability worth showing, and the
only part that can't be static.

**But plenty of perfectly good MFE apps have no such API:**

- **Build-time integration** — Module Federation with versions pinned at shell build, or a monorepo. No runtime discovery. The most common case in practice.
- **Static manifest on a CDN** — the shell fetches `manifest.json` directly, no API in front. The lightweight middle ground; arguably more common than a full service.
- **Edge/CDN resolution** — traffic split at the CDN / edge-worker layer, not an app server.
- **import-maps / native ESM** — "discovery" is a static import map.

**Takeaway:** decoupling the shell from remote locations via a manifest is core
to runtime MFE and very typical. A *dedicated Consumer API service* is one valid
implementation of that, justified when you actually need dynamic per-user
versioning and traffic control — and overkill for many teams, who get ~90% of
the value from a static CDN manifest with zero server to operate. Its presence
here is a deliberate choice to demonstrate the traffic-splitting capability, not
a sign every MFE app needs one.

---

*This demo trades prod hardening (auth, integrity, real discovery, observability,
dynamic config) for setup simplicity and pedagogical clarity. Treat every item
above as "intentionally omitted," not "recommended."*

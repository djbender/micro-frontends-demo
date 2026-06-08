# @demo/contracts

Shared contracts, event topics, and type-level definitions for the micro-frontend dashboard. Zero dependencies — a pure ESM module consumed by the shell and all widget runtimes.

## Exports

### `TOPICS`

Event name constants used for cross-widget communication via the `EventTarget` bus:

```js
import { TOPICS } from '@demo/contracts';
```

| Key              | Value                      | Emitted By                    | Consumed By                   |
|------------------|----------------------------|-------------------------------|-------------------------------|
| `FILTER_CHANGE`  | `dashboard:filter-change`  | `widget-filter`               | `widget-kpi`, `widget-trends` |
| `REQUEST_FILTER` | `dashboard:request-filter` | Consumers on mount            | `widget-filter`               |
| `EVENT_CONSUMED` | `dashboard:event-consumed` | `widget-kpi`, `widget-trends` | Shell EventLog                |

### `validateManifest(json)`

Validates a discovery manifest against the expected schema. Returns `{ valid: boolean, error?: string }`.

Checks performed:

- `schema` is a non-empty string
- `microFrontends` is an object (not array)
- Each widget has a non-empty array of entries
- Every entry has `url`, `metadata.integrity`, `metadata.version`, `extras.slots` (non-empty array of `{ slot, variant? }`), `extras.route`, `extras.requiredPermissions` (array), `deployment.traffic` (number), `deployment.default` (boolean)
- Multi-version widgets: traffic percentages sum to exactly 100

```js
import { validateManifest } from '@demo/contracts';

const result = validateManifest(json);
if (!result.valid) console.error(result.error);
```

### `selectVersion(versions, userToken)`

Deterministic server-side traffic splitting. Given an array of version entries and a `userToken`, returns the single resolved version:

1. `token === 'default'` → bucket 1 (always the majority version)
2. `token === 'canary'` → bucket 100 (always the minority version)
3. Otherwise → `djb2(userToken + urls)` → bucket (1–100), walk versions by cumulative `deployment.traffic` until the bucket is covered
4. Fallback: entry with `deployment.default === true`, then `versions[0]`

```js
import { selectVersion } from '@demo/contracts';

const version = selectVersion(versions, userToken);
```

### `djb2(str)`

Internal djb2 hash function, returns a value between 1 and 100. Used by `selectVersion` for deterministic bucket assignment.

## JSDoc Types

The following types are available via JSDoc (no TypeScript dependency):

- `FilterDetail` — `{ dateRange: string, segment: string }`
- `ConsumedDetail` — `{ actor: string, topic: string, payload: FilterDetail }`
- `ManifestEntry` — A single versioned MFE entry with `url`, `metadata`, `deployment`, and `extras`
- `Manifest` — Top-level discovery object: `{ schema, microFrontends }`

## Testing

```bash
pnpm test
```

Runs Vitest. Two test suites: `validateManifest` (comprehensive field-level checks) and `selectVersion` / `djb2` (traffic-splitting logic).

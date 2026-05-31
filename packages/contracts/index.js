export const TOPICS = {
  FILTER_CHANGE: 'dashboard:filter-change',
  REQUEST_FILTER: 'dashboard:request-filter',
};

/**
 * @typedef {{ dateRange: string, segment: string }} FilterDetail
 * @typedef {{ name: string, url: string, module: string, slot: string, route: string, requiredPermissions: string[], version: string }} ManifestEntry
 * @typedef {{ schemaVersion: string, mfes: ManifestEntry[] }} Manifest
 */

/**
 * @param {unknown} json
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateManifest(json) {
  if (!json || typeof json !== 'object')
    return { valid: false, error: 'Not an object' };
  if (!json.schemaVersion)
    return { valid: false, error: 'Missing schemaVersion' };
  if (!Array.isArray(json.mfes))
    return { valid: false, error: 'Missing mfes array' };
  for (const entry of json.mfes) {
    for (const field of ['name', 'url', 'module', 'slot', 'route']) {
      if (!entry[field])
        return { valid: false, error: `Entry missing field: ${field}` };
    }
    if (!Array.isArray(entry.requiredPermissions)) {
      return { valid: false, error: `Entry ${entry.name} missing requiredPermissions array` };
    }
  }
  return { valid: true };
}

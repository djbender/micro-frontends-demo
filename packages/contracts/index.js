export const TOPICS = {
  FILTER_CHANGE: 'dashboard:filter-change',
  REQUEST_FILTER: 'dashboard:request-filter',
  EVENT_CONSUMED: 'dashboard:event-consumed',
};

/**
 * @typedef {{ dateRange: string, segment: string }} FilterDetail
 * @typedef {{ actor: string, topic: string, payload: FilterDetail }} ConsumedDetail
 * @typedef {{
 *   url: string,
 *   fallbackUrl?: string,
 *   metadata: { integrity: string, version: string },
 *   deployment: { default: boolean, traffic: number },
 *   extras: { module: string, slots: { slot: string, variant?: string }[], route: string, requiredPermissions: string[] }
 * }} ManifestEntry
 * @typedef {{ schema: string, microFrontends: Record<string, ManifestEntry[]> }} Manifest
 */

/**
 * @param {unknown} json
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateManifest(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json))
    return { valid: false, error: 'Not an object' };
  if (!json.schema || typeof json.schema !== 'string')
    return { valid: false, error: 'Missing schema' };
  if (!json.microFrontends || typeof json.microFrontends !== 'object' || Array.isArray(json.microFrontends))
    return { valid: false, error: 'Missing microFrontends object' };
  for (const [name, versions] of Object.entries(json.microFrontends)) {
    if (!Array.isArray(versions) || versions.length === 0)
      return { valid: false, error: `microFrontends["${name}"] must be a non-empty array` };
    for (const entry of versions) {
      if (!entry.url || typeof entry.url !== 'string')
        return { valid: false, error: `Entry in "${name}" missing url` };
      if (!entry.metadata || typeof entry.metadata.integrity !== 'string')
        return { valid: false, error: `Entry in "${name}" missing metadata.integrity` };
      if (!entry.metadata.version || typeof entry.metadata.version !== 'string')
        return { valid: false, error: `Entry in "${name}" missing metadata.version` };
      if (!Array.isArray(entry.extras?.slots) || entry.extras.slots.length === 0)
        return { valid: false, error: `Entry in "${name}" missing extras.slots array` };
      for (const placement of entry.extras.slots) {
        if (!placement || typeof placement.slot !== 'string')
          return { valid: false, error: `Entry in "${name}" extras.slots[].slot must be a string` };
      }
      if (!entry.extras?.route)
        return { valid: false, error: `Entry in "${name}" missing extras.route` };
      if (!Array.isArray(entry.extras?.requiredPermissions))
        return { valid: false, error: `Entry in "${name}" missing extras.requiredPermissions array` };
      if (typeof entry.deployment?.traffic !== 'number')
        return { valid: false, error: `Entry in "${name}" missing deployment.traffic` };
      if (typeof entry.deployment?.default !== 'boolean')
        return { valid: false, error: `Entry in "${name}" missing deployment.default` };
    }
    if (versions.length > 1) {
      const total = versions.reduce((sum, v) => sum + v.deployment.traffic, 0);
      if (total !== 100)
        return { valid: false, error: `microFrontends["${name}"] traffic percentages must sum to 100 (got ${total})` };
    }
  }
  return { valid: true };
}

export function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++)
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  return (hash >>> 0) % 100 + 1;
}

export function selectVersion(versions, userToken) {
  let bucket;
  if (userToken === 'default') {
    bucket = 1;
  } else if (userToken === 'canary') {
    bucket = 100;
  } else {
    bucket = djb2(userToken + versions.map(v => v.url).join('|'));
  }
  let cumulative = 0;
  for (const v of versions) {
    cumulative += v.deployment.traffic;
    if (bucket <= cumulative) return v;
  }
  for (const v of versions) {
    /* c8 ignore next -- v8 doesn't track branches of `if` inside `for...of` loops that follow another `for...of` */
    if (v.deployment.default) return v;
  }
  return versions[0];
}

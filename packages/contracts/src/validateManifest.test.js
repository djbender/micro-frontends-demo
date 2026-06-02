import { describe, it, expect } from 'vitest';
import { validateManifest } from './index.js';

const validEntry = {
  url: 'http://localhost:5001/remoteEntry.js',
  fallbackUrl: 'http://localhost:5001/remoteEntry.js',
  metadata: { integrity: '', version: '1.0.0' },
  deployment: { default: true, traffic: 100 },
  extras: {
    module: './mount',
    slot: 'main',
    route: '/overview',
    requiredPermissions: ['dashboard.view'],
  },
};

const validManifest = {
  schema: 'https://raw.githubusercontent.com/awslabs/frontend-discovery/main/schema/v1-pre.json',
  microFrontends: {
    'widget-kpi': [validEntry],
  },
};

describe('validateManifest', () => {
  describe('top-level type checks', () => {
    it.each([[null], [42], ['string'], [true]])('returns invalid for %s', (value) => {
      expect(validateManifest(value)).toEqual({ valid: false, error: 'Not an object' });
    });

    it('returns invalid for an array (passes object check, fails schema)', () => {
      expect(validateManifest([])).toMatchObject({ valid: false });
    });

    it('returns invalid for undefined', () => {
      expect(validateManifest(undefined)).toEqual({ valid: false, error: 'Not an object' });
    });

    it('returns invalid for missing schema', () => {
      expect(validateManifest({ microFrontends: {} })).toEqual({ valid: false, error: 'Missing schema' });
    });

    it('returns invalid for falsy schema', () => {
      expect(validateManifest({ schema: '', microFrontends: {} })).toEqual({ valid: false, error: 'Missing schema' });
    });

    it('returns invalid when microFrontends is missing', () => {
      expect(validateManifest({ schema: 'https://example.com/schema' }))
        .toEqual({ valid: false, error: 'Missing microFrontends object' });
    });

    it('returns invalid when microFrontends is an array', () => {
      expect(validateManifest({ schema: 'https://example.com/schema', microFrontends: [] }))
        .toEqual({ valid: false, error: 'Missing microFrontends object' });
    });
  });

  describe('entry array validation', () => {
    it('returns invalid when a widget versions array is empty', () => {
      const result = validateManifest({ schema: 'https://example.com/schema', microFrontends: { 'widget-kpi': [] } });
      expect(result).toEqual({ valid: false, error: 'microFrontends["widget-kpi"] must be a non-empty array' });
    });

    it('returns invalid when a widget key is not an array', () => {
      const result = validateManifest({ schema: 'https://example.com/schema', microFrontends: { 'widget-kpi': validEntry } });
      expect(result).toEqual({ valid: false, error: 'microFrontends["widget-kpi"] must be a non-empty array' });
    });
  });

  describe('entry field validation', () => {
    it('returns invalid when entry is missing url', () => {
      const entry = { ...validEntry, url: undefined };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing url' });
    });

    it('returns invalid when entry url is not a string', () => {
      const entry = { ...validEntry, url: 42 };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing url' });
    });

    it('returns invalid when metadata.integrity is missing', () => {
      const entry = { ...validEntry, metadata: { version: '1.0.0' } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing metadata.integrity' });
    });

    it('returns invalid when metadata.version is missing', () => {
      const entry = { ...validEntry, metadata: { integrity: '' } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing metadata.version' });
    });

    it('returns invalid when extras.slot is missing', () => {
      const entry = { ...validEntry, extras: { ...validEntry.extras, slot: undefined } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing extras.slot' });
    });

    it('returns invalid when extras.route is missing', () => {
      const entry = { ...validEntry, extras: { ...validEntry.extras, route: undefined } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing extras.route' });
    });

    it('returns invalid when extras.requiredPermissions is not an array', () => {
      const entry = { ...validEntry, extras: { ...validEntry.extras, requiredPermissions: 'dashboard.view' } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing extras.requiredPermissions array' });
    });

    it('returns invalid when extras.requiredPermissions is missing', () => {
      const { requiredPermissions: _, ...extrasWithout } = validEntry.extras;
      const entry = { ...validEntry, extras: extrasWithout };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing extras.requiredPermissions array' });
    });

    it('returns invalid when deployment is missing', () => {
      const { deployment: _, ...entryWithout } = validEntry;
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entryWithout] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing deployment.traffic' });
    });

    it('returns invalid when deployment.traffic is missing', () => {
      const entry = { ...validEntry, deployment: { default: true } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing deployment.traffic' });
    });

    it('returns invalid when deployment.default is missing', () => {
      const entry = { ...validEntry, deployment: { traffic: 100 } };
      const result = validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } });
      expect(result).toEqual({ valid: false, error: 'Entry in "widget-kpi" missing deployment.default' });
    });
  });

  describe('traffic percentage validation', () => {
    const v1 = { ...validEntry, deployment: { default: true,  traffic: 90 } };
    const v2 = { ...validEntry, metadata: { ...validEntry.metadata, version: '1.1.0' }, deployment: { default: false, traffic: 10 } };

    it('returns valid when multiple versions sum to 100', () => {
      expect(validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [v1, v2] } })).toEqual({ valid: true });
    });

    it('returns invalid when multiple versions sum to less than 100', () => {
      const under = { ...v2, deployment: { default: false, traffic: 5 } };
      expect(validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [v1, under] } }))
        .toEqual({ valid: false, error: 'microFrontends["widget-kpi"] traffic percentages must sum to 100 (got 95)' });
    });

    it('returns invalid when multiple versions sum to more than 100', () => {
      const over = { ...v2, deployment: { default: false, traffic: 20 } };
      expect(validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [v1, over] } }))
        .toEqual({ valid: false, error: 'microFrontends["widget-kpi"] traffic percentages must sum to 100 (got 110)' });
    });

    it('skips traffic sum check for single-version widgets', () => {
      const single = { ...validEntry, deployment: { default: true, traffic: 50 } };
      expect(validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [single] } })).toEqual({ valid: true });
    });
  });

  describe('valid manifests', () => {
    it('returns valid for a manifest with zero widgets', () => {
      expect(validateManifest({ schema: 'https://example.com/schema', microFrontends: {} })).toEqual({ valid: true });
    });

    it('returns valid for a well-formed single-widget manifest', () => {
      expect(validateManifest(validManifest)).toEqual({ valid: true });
    });

    it('returns valid for a manifest with multiple widgets', () => {
      const adminEntry = { ...validEntry, extras: { ...validEntry.extras, route: '/admin', requiredPermissions: ['dashboard.admin'] } };
      expect(validateManifest({
        ...validManifest,
        microFrontends: { 'widget-kpi': [validEntry], 'widget-admin': [adminEntry] },
      })).toEqual({ valid: true });
    });

    it('accepts an empty requiredPermissions array', () => {
      const entry = { ...validEntry, extras: { ...validEntry.extras, requiredPermissions: [] } };
      expect(validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [entry] } })).toEqual({ valid: true });
    });

    it('accepts an empty string integrity (valid for local dev)', () => {
      expect(validateManifest(validManifest)).toEqual({ valid: true });
    });

    it('accepts entries without optional fallbackUrl', () => {
      const { fallbackUrl: _, ...minimalEntry } = validEntry;
      expect(validateManifest({ ...validManifest, microFrontends: { 'widget-kpi': [minimalEntry] } })).toEqual({ valid: true });
    });
  });
});

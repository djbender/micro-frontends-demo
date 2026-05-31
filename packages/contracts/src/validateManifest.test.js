import { describe, it, expect } from 'vitest';
import { validateManifest } from './index.js';

const validEntry = {
  name: 'widget-kpi',
  url: 'http://localhost:5001/remoteEntry.js',
  module: './mount',
  slot: 'main',
  route: '/overview',
  requiredPermissions: ['dashboard.view'],
  version: '1.0.0',
};

const validManifest = {
  schemaVersion: '1',
  mfes: [validEntry],
};

describe('validateManifest', () => {
  describe('top-level type checks', () => {
    it.each([[null], [42], ['string'], [true]])('returns invalid for %s', (value) => {
      expect(validateManifest(value)).toEqual({ valid: false, error: 'Not an object' });
    });

    it('returns invalid for an empty array (passes object check, fails schemaVersion)', () => {
      expect(validateManifest([])).toMatchObject({ valid: false });
    });

    it('returns invalid for undefined', () => {
      expect(validateManifest(undefined)).toEqual({ valid: false, error: 'Not an object' });
    });

    it('returns invalid for missing schemaVersion', () => {
      expect(validateManifest({ mfes: [] })).toEqual({ valid: false, error: 'Missing schemaVersion' });
    });

    it('returns invalid for falsy schemaVersion', () => {
      expect(validateManifest({ schemaVersion: '', mfes: [] })).toEqual({ valid: false, error: 'Missing schemaVersion' });
    });

    it('returns invalid when mfes is not an array', () => {
      expect(validateManifest({ schemaVersion: '1', mfes: {} })).toEqual({ valid: false, error: 'Missing mfes array' });
    });

    it('returns invalid when mfes is missing', () => {
      expect(validateManifest({ schemaVersion: '1' })).toEqual({ valid: false, error: 'Missing mfes array' });
    });
  });

  describe('entry field validation', () => {
    it.each(['name', 'url', 'module', 'slot', 'route'])('returns invalid when entry is missing %s', (field) => {
      const entry = { ...validEntry };
      delete entry[field];
      const result = validateManifest({ schemaVersion: '1', mfes: [entry] });
      expect(result).toEqual({ valid: false, error: `Entry missing field: ${field}` });
    });

    it('returns invalid when requiredPermissions is not an array', () => {
      const entry = { ...validEntry, requiredPermissions: 'dashboard.view' };
      const result = validateManifest({ schemaVersion: '1', mfes: [entry] });
      expect(result).toEqual({ valid: false, error: `Entry ${validEntry.name} missing requiredPermissions array` });
    });

    it('returns invalid when requiredPermissions is missing', () => {
      const entry = { ...validEntry };
      delete entry.requiredPermissions;
      const result = validateManifest({ schemaVersion: '1', mfes: [entry] });
      expect(result).toEqual({ valid: false, error: `Entry ${validEntry.name} missing requiredPermissions array` });
    });
  });

  describe('valid manifests', () => {
    it('returns valid for a manifest with zero MFEs', () => {
      expect(validateManifest({ schemaVersion: '1', mfes: [] })).toEqual({ valid: true });
    });

    it('returns valid for a well-formed single-entry manifest', () => {
      expect(validateManifest(validManifest)).toEqual({ valid: true });
    });

    it('returns valid for a manifest with multiple entries', () => {
      const second = { ...validEntry, name: 'widget-admin', route: '/admin', requiredPermissions: ['dashboard.admin'] };
      expect(validateManifest({ schemaVersion: '1', mfes: [validEntry, second] })).toEqual({ valid: true });
    });

    it('accepts an empty requiredPermissions array', () => {
      const entry = { ...validEntry, requiredPermissions: [] };
      expect(validateManifest({ schemaVersion: '1', mfes: [entry] })).toEqual({ valid: true });
    });
  });
});

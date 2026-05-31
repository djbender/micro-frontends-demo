import { describe, it, expect } from 'vitest';
import { mount } from '../mount.js';

describe('widget-trends mount contract', () => {
  it('returns a function', () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    const unmount = mount(target, { bus });
    expect(typeof unmount).toBe('function');
    unmount();
  });

  it('appends content to target', () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    mount(target, { bus });
    expect(target.childNodes.length).toBeGreaterThan(0);
  });

  it('unmount removes rendered content', () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    const unmount = mount(target, { bus });
    unmount();
    expect(target.childNodes.length).toBe(0);
  });

  it('bus events after unmount do not throw', () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    const unmount = mount(target, { bus });
    unmount();
    expect(() => {
      bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
        detail: { dateRange: '7d', segment: 'all' },
      }));
    }).not.toThrow();
  });
});

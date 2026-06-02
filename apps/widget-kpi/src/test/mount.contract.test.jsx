import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { mount } from '../mount.jsx';

describe('widget-kpi mount contract', () => {
  it('returns a function', async () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    let unmount;
    await act(async () => { unmount = mount(target, { bus }); });
    expect(typeof unmount).toBe('function');
    await act(async () => { unmount(); });
  });

  it('appends content to target after render', async () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    await act(async () => { mount(target, { bus }); });
    expect(target.childNodes.length).toBeGreaterThan(0);
  });

  it('unmount clears rendered content', async () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    let unmount;
    await act(async () => { unmount = mount(target, { bus }); });
    await act(async () => { unmount(); });
    expect(target.innerHTML).toBe('');
  });

  it('bus events after unmount do not throw', async () => {
    const target = document.createElement('div');
    const bus = new EventTarget();
    let unmount;
    await act(async () => { unmount = mount(target, { bus }); });
    await act(async () => { unmount(); });
    expect(() => {
      bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
        detail: { dateRange: '7d', segment: 'all' },
      }));
    }).not.toThrow();
  });
});

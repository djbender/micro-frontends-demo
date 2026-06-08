import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from './mount.js';
import { __resetStore, getState, setFilter, subscribe } from './store.js';

function makeBus() {
  return new EventTarget();
}

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

// The store is a module-scope singleton shared across mounts — reset it between
// cases so state and subscribers don't leak from one test to the next.
beforeEach(() => {
  __resetStore();
});

describe('FilterWidget custom element', () => {
  it('is registered as filter-widget', () => {
    expect(customElements.get('filter-widget')).toBeDefined();
  });
});

describe('mount()', () => {
  let container;
  beforeEach(() => {
    container = makeContainer();
  });

  it('appends a filter-widget element to the container', () => {
    const bus = makeBus();
    mount(container, { bus });
    expect(container.querySelector('filter-widget')).toBeInTheDocument();
  });

  it('returns an unmount function', () => {
    const bus = makeBus();
    const unmount = mount(container, { bus });
    expect(typeof unmount).toBe('function');
  });

  it('unmount removes the element from the container', () => {
    const bus = makeBus();
    const unmount = mount(container, { bus });
    unmount();
    expect(container.querySelector('filter-widget')).not.toBeInTheDocument();
  });

  it('shadow DOM contains 4 date-range buttons', () => {
    const bus = makeBus();
    mount(container, { bus });
    const el = container.querySelector('filter-widget');
    const buttons = el.shadowRoot.querySelectorAll('[data-range]');
    expect(buttons).toHaveLength(4);
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toEqual(['7d', '30d', '90d', 'ytd']);
  });

  it('30d button is initially active', () => {
    const bus = makeBus();
    mount(container, { bus });
    const el = container.querySelector('filter-widget');
    const active = el.shadowRoot.querySelector('button.active');
    expect(active.dataset.range).toBe('30d');
  });

  it('responds to REQUEST_FILTER by emitting FILTER_CHANGE with current state', () => {
    const bus = makeBus();
    mount(container, { bus });

    const received = [];
    bus.addEventListener('dashboard:filter-change', (e) => received.push(e.detail));
    bus.dispatchEvent(new CustomEvent('dashboard:request-filter'));

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ dateRange: '30d', segment: 'all' });
  });

  it('clicking 7d button emits FILTER_CHANGE with dateRange:7d', () => {
    const bus = makeBus();
    mount(container, { bus });
    const el = container.querySelector('filter-widget');

    const received = [];
    bus.addEventListener('dashboard:filter-change', (e) => received.push(e.detail));

    const btn7d = el.shadowRoot.querySelector('[data-range="7d"]');
    btn7d.click();

    expect(received).toHaveLength(1);
    expect(received[0].dateRange).toBe('7d');
    expect(received[0].segment).toBe('all');
  });

  it('renders version badge with injected version', () => {
    const bus = makeBus();
    mount(container, { bus });
    const badge = container.querySelector('filter-widget').shadowRoot.querySelector('.version-badge');
    expect(badge.textContent).toBe('widget-filter: test');
  });

  it('changing segment select emits FILTER_CHANGE with new segment', () => {
    const bus = makeBus();
    mount(container, { bus });
    const el = container.querySelector('filter-widget');

    const received = [];
    bus.addEventListener('dashboard:filter-change', (e) => received.push(e.detail));

    const select = el.shadowRoot.querySelector('#segment');
    select.value = 'enterprise';
    select.dispatchEvent(new Event('change'));

    expect(received).toHaveLength(1);
    expect(received[0].segment).toBe('enterprise');
    expect(received[0].dateRange).toBe('30d');
  });
});

describe('shared store across two mounts', () => {
  let full, mini;
  beforeEach(() => {
    full = makeContainer();
    mini = makeContainer();
  });

  function fullEl() { return full.querySelector('filter-widget'); }
  function miniEl() { return mini.querySelector('filter-widget'); }

  it('changing one copy updates the other (module-scope sync)', () => {
    const bus = makeBus();
    mount(full, { bus, variant: 'full' });
    mount(mini, { bus, variant: 'mini' });

    fullEl().shadowRoot.querySelector('[data-range="7d"]').click();

    // the mini copy re-rendered from the shared store
    expect(miniEl().shadowRoot.querySelector('.mini-value').textContent).toContain('7d');
    // and the full copy reflects the active state too
    expect(fullEl().shadowRoot.querySelector('button.active').dataset.range).toBe('7d');
  });

  it('one user action emits FILTER_CHANGE exactly once across both copies', () => {
    const bus = makeBus();
    mount(full, { bus, variant: 'full' });
    mount(mini, { bus, variant: 'mini' });

    const received = [];
    bus.addEventListener('dashboard:filter-change', (e) => received.push(e.detail));

    fullEl().shadowRoot.querySelector('[data-range="90d"]').click();

    expect(received).toHaveLength(1);
    expect(received[0].dateRange).toBe('90d');
  });
});

describe('mini variant', () => {
  let container;
  beforeEach(() => {
    container = makeContainer();
  });

  it('is read-only (no buttons, no select) but shows a title and version badge', () => {
    const bus = makeBus();
    mount(container, { bus, variant: 'mini' });
    const sr = container.querySelector('filter-widget').shadowRoot;
    expect(sr.querySelectorAll('[data-range]')).toHaveLength(0);
    expect(sr.querySelector('#segment')).toBeNull();
    expect(sr.querySelector('.mini-title').textContent).toBe('Filter Mirror');
    expect(sr.querySelector('.version-badge').textContent).toBe('widget-filter: test');
    expect(sr.querySelector('.mini-value').textContent).toBe('30d · All');
  });

  it('reflects current store state on late mount', () => {
    const bus = makeBus();
    // a full copy mounts first and attaches the bus, then state changes
    mount(makeContainer(), { bus, variant: 'full' });
    setFilter({ dateRange: '90d', segment: 'enterprise' });

    mount(container, { bus, variant: 'mini' });
    expect(container.querySelector('filter-widget').shadowRoot.querySelector('.mini-value').textContent)
      .toBe('90d · Enterprise');
  });
});

describe('store singleton', () => {
  it('__resetStore restores defaults and clears subscribers', () => {
    let calls = 0;
    subscribe(() => { calls += 1; });
    setFilter({ dateRange: '7d' });
    expect(calls).toBe(1);

    __resetStore();
    expect(getState()).toEqual({ dateRange: '30d', segment: 'all' });

    setFilter({ dateRange: '90d' });
    expect(calls).toBe(1); // old subscriber was cleared
  });
});

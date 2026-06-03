import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from './mount.js';

function makeBus() {
  return new EventTarget();
}

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

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
    expect(badge.textContent).toBe('vtest');
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

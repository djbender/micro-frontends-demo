import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOPICS } from '@demo/contracts';
import { mount } from './mount.js';

const settle = () => new Promise(r => setTimeout(r, 50));

describe('mount', () => {
  let target, bus;
  beforeEach(() => {
    document.body.innerHTML = '<div id="t"></div>';
    target = document.getElementById('t');
    bus = new EventTarget();
  });

  it('renders the widget with a version badge and requests the current filter', async () => {
    const requested = vi.fn();
    bus.addEventListener(TOPICS.REQUEST_FILTER, requested);
    mount(target, { bus });
    await settle();
    expect(target.textContent).toContain('Recent Alerts');
    expect(target.textContent).toContain('widget-alerts: test');
    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('re-filters on dashboard:filter-change and reports event-consumed', async () => {
    const consumed = vi.fn();
    bus.addEventListener(TOPICS.EVENT_CONSUMED, e => consumed(e.detail));
    mount(target, { bus });
    await settle();
    const before = target.querySelectorAll('tbody tr').length;

    const detail = { dateRange: '7d', segment: 'consumer' };
    bus.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, { detail }));
    await settle();

    expect(target.querySelectorAll('tbody tr').length).toBeLessThan(before);
    expect(target.textContent).toContain('Consumer · 7d');
    expect(consumed).toHaveBeenCalledWith({ actor: 'widget-alerts', topic: TOPICS.FILTER_CHANGE, payload: detail });
  });

  it('stops listening to the bus after unmount', async () => {
    const consumed = vi.fn();
    bus.addEventListener(TOPICS.EVENT_CONSUMED, consumed);
    const unmount = mount(target, { bus });
    await settle();
    unmount();
    bus.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, { detail: { dateRange: '7d', segment: 'all' } }));
    await settle();
    expect(consumed).not.toHaveBeenCalled();
  });

  it('survives unmount called before Angular finishes bootstrapping', async () => {
    const requested = vi.fn();
    bus.addEventListener(TOPICS.REQUEST_FILTER, requested);
    const unmount = mount(target, { bus });
    unmount(); // synchronously, mid-bootstrap
    await settle();
    expect(target.textContent).not.toContain('Recent Alerts');
    expect(requested).not.toHaveBeenCalled();
  });
});

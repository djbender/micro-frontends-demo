import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOPICS } from '@demo/contracts';
import { mount } from './mount.js';

// Angular renders asynchronously; poll for the outcome instead of sleeping a fixed time.
const until = assertion => vi.waitFor(assertion, { interval: 2, timeout: 2000 });
const rendered = target => until(() => expect(target.querySelector('table')).not.toBeNull());

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
    await rendered(target);
    expect(target.textContent).toContain('Recent Alerts');
    expect(target.textContent).toContain('widget-alerts: test');
    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('re-filters on dashboard:filter-change and reports event-consumed', async () => {
    const consumed = vi.fn();
    bus.addEventListener(TOPICS.EVENT_CONSUMED, e => consumed(e.detail));
    mount(target, { bus });
    await rendered(target);
    const before = target.querySelectorAll('tbody tr').length;

    const detail = { dateRange: '7d', segment: 'consumer' };
    bus.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, { detail }));

    await until(() => expect(target.textContent).toContain('Consumer · 7d'));
    expect(target.querySelectorAll('tbody tr').length).toBeLessThan(before);
    expect(consumed).toHaveBeenCalledWith({ actor: 'widget-alerts', topic: TOPICS.FILTER_CHANGE, payload: detail });
  });

  it('stops listening to the bus after unmount', async () => {
    const consumed = vi.fn();
    bus.addEventListener(TOPICS.EVENT_CONSUMED, consumed);
    const unmount = mount(target, { bus });
    await rendered(target);
    unmount();
    // The bus listener is removed synchronously on destroy, so no wait is needed.
    bus.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, { detail: { dateRange: '7d', segment: 'all' } }));
    expect(consumed).not.toHaveBeenCalled();
  });

  it('survives unmount called before Angular finishes bootstrapping', async () => {
    const requested = vi.fn();
    bus.addEventListener(TOPICS.REQUEST_FILTER, requested);
    const unmount = mount(target, { bus });
    unmount(); // synchronously, mid-bootstrap
    // Nothing should ever render, so there is no condition to poll for. Wait long
    // enough for bootstrap to have completed in the other tests, then assert absence.
    await new Promise(r => setTimeout(r, 50));
    expect(target.textContent).not.toContain('Recent Alerts');
    expect(requested).not.toHaveBeenCalled();
  });
});

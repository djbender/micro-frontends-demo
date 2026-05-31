import { render, screen } from '@testing-library/svelte';
import TrendsWidget from './TrendsWidget.svelte';

function makeBus() {
  return new EventTarget();
}

describe('TrendsWidget', () => {
  it('renders "Trends" heading', () => {
    const bus = makeBus();
    render(TrendsWidget, { props: { bus } });
    expect(screen.getByText('Trends')).toBeInTheDocument();
  });

  it('dispatches dashboard:request-filter on mount', () => {
    const bus = makeBus();
    const spy = vi.spyOn(bus, 'dispatchEvent');
    render(TrendsWidget, { props: { bus } });
    const dispatched = spy.mock.calls.map(([e]) => e.type);
    expect(dispatched).toContain('dashboard:request-filter');
  });

  it('shows default footer: All segments · 30d', () => {
    const bus = makeBus();
    render(TrendsWidget, { props: { bus } });
    expect(screen.getByText('All segments · 30d')).toBeInTheDocument();
  });

  it('dispatches dashboard:event-consumed ack when FILTER_CHANGE fires', async () => {
    const bus = makeBus();
    render(TrendsWidget, { props: { bus } });

    const spy = vi.spyOn(bus, 'dispatchEvent');
    await new Promise(r => setTimeout(r, 0));
    bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
      detail: { dateRange: '7d', segment: 'all' },
    }));
    await new Promise(r => setTimeout(r, 0));

    const ack = spy.mock.calls.map(([e]) => e).find(e => e.type === 'dashboard:event-consumed');
    expect(ack).toBeDefined();
    expect(ack.detail).toEqual({ actor: 'widget-trends', topic: 'dashboard:filter-change', payload: { dateRange: '7d', segment: 'all' } });
  });

  it('updates footer when FILTER_CHANGE fires with enterprise/7d', async () => {
    const bus = makeBus();
    render(TrendsWidget, { props: { bus } });

    await new Promise(r => setTimeout(r, 0));
    bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
      detail: { dateRange: '7d', segment: 'enterprise' },
    }));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('Enterprise · 7d')).toBeInTheDocument();
  });

  it('updates footer dateRange when FILTER_CHANGE fires 7d/all', async () => {
    const bus = makeBus();
    render(TrendsWidget, { props: { bus } });

    await new Promise(r => setTimeout(r, 0));
    bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
      detail: { dateRange: '7d', segment: 'all' },
    }));
    await new Promise(r => setTimeout(r, 0));

    expect(screen.getByText('All segments · 7d')).toBeInTheDocument();
  });

  it('renders an SVG chart', () => {
    const bus = makeBus();
    render(TrendsWidget, { props: { bus } });
    expect(document.querySelector('svg[aria-label="Trends chart"]')).toBeInTheDocument();
  });

  it('removes FILTER_CHANGE listener on destroy', () => {
    const bus = makeBus();
    const spy = vi.spyOn(bus, 'removeEventListener');
    const { unmount } = render(TrendsWidget, { props: { bus } });
    unmount();
    const removedTopics = spy.mock.calls.map(([topic]) => topic);
    expect(removedTopics).toContain('dashboard:filter-change');
  });
});

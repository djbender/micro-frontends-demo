import { render, screen, act } from '@testing-library/react';
import EventLog from './EventLog.jsx';

function makeBus() {
  return new EventTarget();
}

describe('EventLog', () => {
  it('renders with waiting message when no events have fired', () => {
    const bus = makeBus();
    render(<EventLog bus={bus} />);
    expect(screen.getByText('waiting for events…')).toBeInTheDocument();
  });

  it('shows an emit line when FILTER_CHANGE fires', async () => {
    const bus = makeBus();
    render(<EventLog bus={bus} />);

    await act(async () => {
      bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
        detail: { dateRange: '7d', segment: 'all' },
      }));
    });

    expect(screen.getByText('widget-filter → emit filter-change')).toBeInTheDocument();
  });

  it('shows a consume line when EVENT_CONSUMED fires', async () => {
    const bus = makeBus();
    render(<EventLog bus={bus} />);

    await act(async () => {
      bus.dispatchEvent(new CustomEvent('dashboard:event-consumed', {
        detail: { actor: 'widget-kpi', topic: 'dashboard:filter-change' },
      }));
    });

    expect(screen.getByText('widget-kpi ← consume filter-change')).toBeInTheDocument();
  });

  it('renders newest entry first', async () => {
    const bus = makeBus();
    render(<EventLog bus={bus} />);

    await act(async () => {
      bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
        detail: { dateRange: '30d', segment: 'all' },
      }));
    });
    await act(async () => {
      bus.dispatchEvent(new CustomEvent('dashboard:event-consumed', {
        detail: { actor: 'widget-kpi', topic: 'dashboard:filter-change' },
      }));
    });

    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('widget-kpi ← consume');
    expect(items[1].textContent).toContain('widget-filter → emit');
  });

  it('caps entries at 50', async () => {
    const bus = makeBus();
    render(<EventLog bus={bus} />);

    await act(async () => {
      for (let i = 0; i < 60; i++) {
        bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
          detail: { dateRange: '30d', segment: 'all' },
        }));
      }
    });

    expect(screen.getAllByRole('listitem').length).toBe(50);
  });

  it('removes listeners on unmount', () => {
    const bus = makeBus();
    const spy = vi.spyOn(bus, 'removeEventListener');
    const { unmount } = render(<EventLog bus={bus} />);
    unmount();
    const removed = spy.mock.calls.map(([topic]) => topic);
    expect(removed).toContain('dashboard:filter-change');
    expect(removed).toContain('dashboard:event-consumed');
  });
});

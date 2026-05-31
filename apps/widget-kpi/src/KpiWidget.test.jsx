import { render, screen, act } from '@testing-library/react';
import KpiWidget from './KpiWidget.jsx';

function makeBus() {
  return new EventTarget();
}

describe('KpiWidget', () => {
  it('renders 4 KPI cards', () => {
    const bus = makeBus();
    render(<KpiWidget bus={bus} />);
    // Revenue, Active Users, Conversion, Retention labels
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Conversion')).toBeInTheDocument();
    expect(screen.getByText('Retention')).toBeInTheDocument();
  });

  it('shows the KPI Summary heading', () => {
    const bus = makeBus();
    render(<KpiWidget bus={bus} />);
    expect(screen.getByText('KPI Summary')).toBeInTheDocument();
  });

  it('dispatches dashboard:request-filter on mount', () => {
    const bus = makeBus();
    const spy = vi.spyOn(bus, 'dispatchEvent');
    render(<KpiWidget bus={bus} />);
    const calls = spy.mock.calls.map(([e]) => e.type);
    expect(calls).toContain('dashboard:request-filter');
  });

  it('updates revenue value when FILTER_CHANGE fires with 7d', async () => {
    const bus = makeBus();
    render(<KpiWidget bus={bus} />);

    // Default: 30d/all — revenue = $482.0k
    expect(screen.getByText('$482.0k')).toBeInTheDocument();

    // Fire filter change for 7d (25% of 482k = 120.5k)
    await act(async () => {
      bus.dispatchEvent(new CustomEvent('dashboard:filter-change', {
        detail: { dateRange: '7d', segment: 'all' },
      }));
    });

    expect(screen.getByText('$120.5k')).toBeInTheDocument();
  });

  it('shows positive change indicator (▲) for all KPIs', () => {
    const bus = makeBus();
    render(<KpiWidget bus={bus} />);
    const ups = screen.getAllByText(/▲/);
    expect(ups.length).toBe(4);
  });

  it('removes FILTER_CHANGE listener on unmount', () => {
    const bus = makeBus();
    const spy = vi.spyOn(bus, 'removeEventListener');
    const { unmount } = render(<KpiWidget bus={bus} />);
    unmount();
    const removedTopics = spy.mock.calls.map(([topic]) => topic);
    expect(removedTopics).toContain('dashboard:filter-change');
  });
});

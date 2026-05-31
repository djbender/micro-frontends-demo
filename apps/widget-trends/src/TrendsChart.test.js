import { render, screen } from '@testing-library/svelte';
import TrendsChart from './TrendsChart.svelte';

describe('TrendsChart', () => {
  it('renders "No data" when data is empty', () => {
    render(TrendsChart, { props: { data: [] } });
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders an SVG with aria-label "Trends chart"', () => {
    render(TrendsChart, { props: { data: [] } });
    expect(document.querySelector('svg[aria-label="Trends chart"]')).toBeInTheDocument();
  });

  it('renders a single circle for one data point (no line path)', () => {
    render(TrendsChart, { props: { data: [{ i: 0, value: 1000 }] } });
    const circles = document.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    // No filled path (area/line) for a single point
    const paths = document.querySelectorAll('path');
    expect(paths).toHaveLength(0);
  });

  it('renders line and area paths for multiple data points', () => {
    const data = [{ i: 0, value: 1000 }, { i: 1, value: 2000 }, { i: 2, value: 1500 }];
    render(TrendsChart, { props: { data } });
    const paths = document.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2); // area + line
  });

  it('renders start and end circles for multiple data points', () => {
    const data = [{ i: 0, value: 1000 }, { i: 1, value: 2000 }];
    render(TrendsChart, { props: { data } });
    const circles = document.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
  });
});

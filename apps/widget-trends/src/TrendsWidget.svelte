<script>
  import { onMount, onDestroy } from 'svelte';
  import { TOPICS } from '@demo/contracts';
  import { generateTrend } from './data.js';
  import TrendsChart from './TrendsChart.svelte';

  let { bus } = $props();

  let filter = $state({ dateRange: '30d', segment: 'all' });
  let data = $derived(generateTrend(filter));

  function onFilterChange(e) {
    filter = e.detail;
  }

  onMount(() => {
    bus.addEventListener(TOPICS.FILTER_CHANGE, onFilterChange);
    bus.dispatchEvent(new CustomEvent(TOPICS.REQUEST_FILTER, { bubbles: false }));
  });

  onDestroy(() => {
    bus.removeEventListener(TOPICS.FILTER_CHANGE, onFilterChange);
  });
</script>

<div class="widget">
  <div class="header">
    <h2 class="title">Trends</h2>
    <span class="badge">v{__WIDGET_VERSION__}</span>
  </div>
  <div class="chart-wrap">
    <TrendsChart {data} />
  </div>
  <div class="footer">
    {filter.segment !== 'all' ? filter.segment.charAt(0).toUpperCase() + filter.segment.slice(1) : 'All segments'} · {filter.dateRange}
  </div>
</div>

<style>
  .widget {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius, 8px);
    padding: 16px;
    box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,0.1));
  }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .title { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0; }
  .badge {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px 6px;
  }
  .chart-wrap { width: 100%; aspect-ratio: 2 / 1; }
  .footer { font-size: 0.75rem; color: var(--color-text-muted); text-align: right; margin-top: 8px; }
</style>

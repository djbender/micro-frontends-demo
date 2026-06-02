<script>
  let { data = [] } = $props();

  const W = 320, H = 160, PAD = { top: 12, right: 12, bottom: 24, left: 40 };

  function scale(points) {
    if (!points.length) return [];
    const xs = points.map(p => p.i);
    const ys = points.map(p => p.value);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    return points.map(p => ({
      x: PAD.left + ((p.i - minX) / rangeX) * chartW,
      y: PAD.top + chartH - ((p.value - minY) / rangeY) * chartH,
      value: p.value,
    }));
  }

  function toPath(pts) {
    /* c8 ignore next -- Svelte compiler artifact: branch not visible to v8 despite test coverage */
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  function toArea(pts) {
    /* c8 ignore next -- Svelte compiler artifact: branch not visible to v8 despite test coverage */
    if (!pts.length) return '';
    const baseline = H - PAD.bottom;
    const line = toPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L${last.x.toFixed(1)},${baseline} L${first.x.toFixed(1)},${baseline} Z`;
  }

  let scaled = $derived(scale(data));
  let linePath = $derived(toPath(scaled));
  let areaPath = $derived(toArea(scaled));

  let minVal = $derived(data.length ? Math.min(...data.map(p => p.value)) : 0);
  let maxVal = $derived(data.length ? Math.max(...data.map(p => p.value)) : 0);

  function fmtK(v) {
    return v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString();
  }
</script>

<svg viewBox="0 0 {W} {H}" width="100%" height="100%" aria-label="Trends chart">
  <!-- grid lines -->
  {#each [0.25, 0.5, 0.75, 1] as frac}
    {@const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - frac)}
    <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--color-border, #e2e8f0)" stroke-width="1" />
    <text x={PAD.left - 4} y={y + 4} text-anchor="end" font-size="9" fill="var(--color-text-muted, #718096)">
      {fmtK(Math.round(minVal + (maxVal - minVal) * frac))}
    </text>
  {/each}

  <!-- baseline -->
  <line
    x1={PAD.left} y1={H - PAD.bottom}
    x2={W - PAD.right} y2={H - PAD.bottom}
    stroke="var(--color-border, #e2e8f0)" stroke-width="1"
  />

  {#if scaled.length > 1}
    <!-- area fill -->
    <path d={areaPath} fill="var(--color-primary, #4f46e5)" fill-opacity="0.12" />
    <!-- line -->
    <path d={linePath} fill="none" stroke="var(--color-primary, #4f46e5)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    <!-- endpoints -->
    <circle cx={scaled[0].x} cy={scaled[0].y} r="3" fill="var(--color-primary, #4f46e5)" />
    <circle cx={scaled[scaled.length-1].x} cy={scaled[scaled.length-1].y} r="4" fill="var(--color-primary, #4f46e5)" stroke="var(--color-surface, #fff)" stroke-width="1.5" />
  {:else if scaled.length === 1}
    <circle cx={scaled[0].x} cy={scaled[0].y} r="4" fill="var(--color-primary, #4f46e5)" />
  {:else}
    <text x={W/2} y={H/2} text-anchor="middle" fill="var(--color-text-muted, #718096)" font-size="12">No data</text>
  {/if}
</svg>

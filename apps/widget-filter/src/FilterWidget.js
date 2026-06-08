import { TOPICS } from '@demo/contracts';
import { attachBus, getState, subscribe, setFilter, emitCurrent } from './store.js';

const RANGES = ['7d', '30d', '90d', 'ytd'];
const SEGMENTS = ['all', 'enterprise', 'smb', 'consumer'];

const STYLES = `
  :host {
    display: block;
    width: 100%;
  }
  .widget {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: var(--radius, 8px);
    padding: 16px;
    box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,0.1));
  }
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .filter-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-muted, #718096);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .filter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .filter-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #1a202c);
    margin: 0;
  }
  .btn-group { display: flex; gap: 4px; }
  button {
    padding: 5px 12px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    background: transparent;
    color: var(--color-text, #1a202c);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.15s;
  }
  button:hover { background: var(--color-primary, #4f46e5); color: #fff; border-color: var(--color-primary, #4f46e5); }
  button.active { background: var(--color-primary, #4f46e5); color: #fff; border-color: var(--color-primary, #4f46e5); }
  select {
    padding: 5px 10px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    background: var(--color-surface, #fff);
    color: var(--color-text, #1a202c);
    font-size: 0.85rem;
    cursor: pointer;
  }
  .version-badge {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--color-text-muted, #718096);
    background: var(--color-bg, #f5f6fa);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 4px;
    padding: 2px 6px;
  }
`;

const MINI_STYLES = `
  :host {
    display: block;
    width: 100%;
  }
  .mini {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: var(--radius, 8px);
    padding: 12px 14px;
    box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,0.1));
  }
  .mini-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .mini-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text, #1a202c);
    margin: 0;
  }
  .version-badge {
    font-size: 0.7rem;
    color: var(--color-text-muted, #718096);
    background: var(--color-bg, #f5f6fa);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 4px;
    padding: 2px 6px;
  }
  .mini-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--color-text, #1a202c);
  }
  .mini-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-muted, #718096);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .mini-value { font-weight: 600; }
`;

class FilterWidget extends HTMLElement {
  #bus = null;
  #shadow;
  #unsub = null;
  #variant = 'full';

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['variant'];
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'variant') {
      this.#variant = value === 'mini' ? 'mini' : 'full';
      if (this.isConnected) this.#render();
    }
  }

  set bus(value) {
    this.#bus = value;
    attachBus(value);
    value.addEventListener(TOPICS.REQUEST_FILTER, this.#handleRequest);
  }

  connectedCallback() {
    // Re-render whenever any copy of the widget updates the shared store.
    this.#unsub = subscribe(() => this.#render());
    this.#render();
  }

  disconnectedCallback() {
    this.#unsub?.();
    this.#unsub = null;
    this.#bus?.removeEventListener(TOPICS.REQUEST_FILTER, this.#handleRequest);
  }

  #handleRequest = () => {
    emitCurrent();
  };

  #render() {
    const { dateRange, segment } = getState();
    if (this.#variant === 'mini') {
      this.#renderMini(dateRange, segment);
    } else {
      this.#renderFull(dateRange, segment);
    }
  }

  #renderFull(dateRange, segment) {
    this.#shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="widget">
        <div class="filter-header">
          <h2 class="filter-title">Filters</h2>
          <span class="version-badge">widget-filter: ${import.meta.env.VITE_WIDGET_VERSION}</span>
        </div>
        <div class="filter-bar">
          <span class="filter-label">Date Range</span>
          <div class="btn-group">
            ${RANGES.map(r => `<button data-range="${r}" class="${r === dateRange ? 'active' : ''}">${r}</button>`).join('')}
          </div>
          <span class="filter-label">Segment</span>
          <select id="segment">
            ${SEGMENTS.map(s => `<option value="${s}" ${s === segment ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
    `;

    // Writes go to the shared store; the subscriber above re-renders every copy.
    this.#shadow.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        setFilter({ dateRange: btn.dataset.range });
      });
    });

    this.#shadow.querySelector('#segment').addEventListener('change', (e) => {
      setFilter({ segment: e.target.value });
    });
  }

  #renderMini(dateRange, segment) {
    const segLabel = segment.charAt(0).toUpperCase() + segment.slice(1);
    this.#shadow.innerHTML = `
      <style>${MINI_STYLES}</style>
      <div class="mini">
        <div class="mini-header">
          <h2 class="mini-title">Filter Mirror</h2>
          <span class="version-badge">widget-filter: ${import.meta.env.VITE_WIDGET_VERSION}</span>
        </div>
        <div class="mini-chip">
          <span class="mini-label">Showing</span>
          <span class="mini-value">${dateRange} · ${segLabel}</span>
        </div>
      </div>
    `;
  }
}

/* v8 ignore next 3 */
if (!customElements.get('filter-widget')) {
  customElements.define('filter-widget', FilterWidget);
}

export { FilterWidget };

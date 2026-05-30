import { TOPICS } from '@demo/contracts';

const RANGES = ['7d', '30d', '90d', 'ytd'];
const SEGMENTS = ['all', 'enterprise', 'smb', 'consumer'];

const STYLES = `
  :host {
    display: block;
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: var(--radius, 8px);
    padding: 12px 16px;
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

class FilterWidget extends HTMLElement {
  #bus = null;
  #dateRange = '30d';
  #segment = 'all';
  #shadow;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  set bus(value) {
    this.#bus = value;
    value.addEventListener(TOPICS.REQUEST_FILTER, this.#handleRequest);
  }

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    this.#bus?.removeEventListener(TOPICS.REQUEST_FILTER, this.#handleRequest);
  }

  #handleRequest = () => {
    this.#emit();
  };

  #emit() {
    this.#bus?.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, {
      detail: { dateRange: this.#dateRange, segment: this.#segment },
      bubbles: false,
    }));
  }

  #render() {
    this.#shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="filter-bar">
        <span class="filter-label">Date Range</span>
        <div class="btn-group">
          ${RANGES.map(r => `<button data-range="${r}" class="${r === this.#dateRange ? 'active' : ''}">${r}</button>`).join('')}
        </div>
        <span class="filter-label">Segment</span>
        <select id="segment">
          ${SEGMENTS.map(s => `<option value="${s}" ${s === this.#segment ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <span class="version-badge">v${__WIDGET_VERSION__}</span>
      </div>
    `;

    this.#shadow.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.#dateRange = btn.dataset.range;
        this.#render();
        this.#emit();
      });
    });

    this.#shadow.querySelector('#segment').addEventListener('change', (e) => {
      this.#segment = e.target.value;
      this.#emit();
    });
  }
}

if (!customElements.get('filter-widget')) {
  customElements.define('filter-widget', FilterWidget);
}

export { FilterWidget };

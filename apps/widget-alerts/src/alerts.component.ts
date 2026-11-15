import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { fromEvent, map, startWith, tap } from 'rxjs';
import { TOPICS } from '@demo/contracts';
import { BUS } from './bus.token';
import { queryAlerts } from './data.js';

type SortKey = 'severity' | 'metric' | 'segment' | 'daysAgo' | 'status';
interface Filter { dateRange: string; segment: string }

@Component({
  selector: 'alerts-widget',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="widget" data-widget="alerts">
      <div class="header">
        <h2 class="title">Recent Alerts</h2>
        <span class="badge">widget-alerts: {{ version }}</span>
      </div>

      <form class="controls" [formGroup]="form">
        <select formControlName="severity" aria-label="Severity">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <input formControlName="query" type="search" placeholder="Search metric…" aria-label="Search alerts" />
      </form>

      <table>
        <thead>
          <tr>
            @for (col of columns; track col.key) {
              <th [attr.aria-sort]="ariaSort(col.key)">
                <button type="button" (click)="sortBy(col.key)">
                  {{ col.label }}
                  @if (sortKey() === col.key) { <span aria-hidden="true">{{ sortDir() === 'asc' ? '▲' : '▼' }}</span> }
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr>
              <td><span class="pill" [class]="'pill ' + row.severity">{{ row.severity }}</span></td>
              <td>{{ row.metric }}</td>
              <td class="cap">{{ row.segment }}</td>
              <td>{{ row.daysAgo }}d ago</td>
              <td class="cap">{{ row.status }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">No alerts match the current filters.</td></tr>
          }
        </tbody>
      </table>

      <div class="footer">{{ segmentLabel() }} · {{ filter().dateRange }} · {{ rows().length }} {{ rows().length === 1 ? 'alert' : 'alerts' }}</div>
    </section>
  `,
  styles: `
    .widget {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius, 8px);
      padding: 16px;
      box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,0.1));
      color: var(--color-text);
    }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .title { font-size: 1rem; font-weight: 600; margin: 0; }
    .badge {
      font-size: 0.7rem; color: var(--color-text-muted); background: var(--color-bg);
      border: 1px solid var(--color-border); border-radius: 4px; padding: 2px 6px;
    }
    .controls { display: flex; gap: 8px; margin-bottom: 12px; }
    .controls select, .controls input {
      font: inherit; font-size: 0.8rem; padding: 4px 8px; color: var(--color-text);
      background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px;
    }
    .controls input { flex: 1; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--color-border); }
    th button {
      all: unset; cursor: pointer; font-weight: 600; color: var(--color-text-muted);
    }
    th button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    .cap { text-transform: capitalize; }
    .pill { font-size: 0.7rem; padding: 1px 6px; border-radius: 999px; text-transform: capitalize; border: 1px solid currentColor; }
    .pill.critical { color: #c0392b; }
    .pill.warning { color: #b9770e; }
    .pill.info { color: #2471a3; }
    .empty { text-align: center; color: var(--color-text-muted); padding: 16px; }
    .footer { font-size: 0.75rem; color: var(--color-text-muted); text-align: right; margin-top: 8px; }
  `,
})
export class AlertsComponent {
  private readonly bus = inject(BUS);

  protected readonly version = import.meta.env.VITE_WIDGET_VERSION;
  protected readonly columns: { key: SortKey; label: string }[] = [
    { key: 'severity', label: 'Severity' },
    { key: 'metric', label: 'Metric' },
    { key: 'segment', label: 'Segment' },
    { key: 'daysAgo', label: 'When' },
    { key: 'status', label: 'Status' },
  ];

  protected readonly form = new FormGroup({
    severity: new FormControl('all', { nonNullable: true }),
    query: new FormControl('', { nonNullable: true }),
  });
  private readonly view = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly sortKey = signal<SortKey>('daysAgo');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');

  // Subscribing happens here (toSignal), before REQUEST_FILTER is sent below, so the
  // filter widget's synchronous re-emit is not missed. Unsubscribes on destroy.
  protected readonly filter = toSignal(
    fromEvent<CustomEvent<Filter>>(this.bus, TOPICS.FILTER_CHANGE).pipe(
      map(e => e.detail),
      tap(detail =>
        this.bus.dispatchEvent(new CustomEvent(TOPICS.EVENT_CONSUMED, {
          detail: { actor: 'widget-alerts', topic: TOPICS.FILTER_CHANGE, payload: detail },
        })),
      ),
    ),
    { initialValue: { dateRange: '30d', segment: 'all' } as Filter },
  );

  protected readonly rows = computed(() =>
    queryAlerts(this.filter(), { ...this.view(), sortKey: this.sortKey(), sortDir: this.sortDir() }),
  );
  protected readonly segmentLabel = computed(() => {
    const s = this.filter().segment;
    return s !== 'all' ? s.charAt(0).toUpperCase() + s.slice(1) : 'All segments';
  });

  constructor() {
    this.bus.dispatchEvent(new CustomEvent(TOPICS.REQUEST_FILTER, { bubbles: false }));
  }

  protected sortBy(key: SortKey) {
    if (this.sortKey() === key) this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    else { this.sortKey.set(key); this.sortDir.set('asc'); }
  }

  protected ariaSort(key: SortKey) {
    return this.sortKey() !== key ? null : this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }
}

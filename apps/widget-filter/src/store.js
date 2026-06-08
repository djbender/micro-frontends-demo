import { TOPICS } from '@demo/contracts';

/**
 * Module-scope filter store shared across every mount of this remote.
 *
 * Module Federation evaluates the `./mount` module graph once per remote, so
 * this singleton is shared by every `<filter-widget>` the shell mounts. That is
 * what keeps multiple copies of the widget in sync without the event bus:
 *
 * - INTERNAL self-sync — `setFilter` notifies every subscribed copy so all of
 *   them re-render from the same state.
 * - EXTERNAL broadcast — `setFilter` also emits `FILTER_CHANGE` on the bus once
 *   per change, so the other MFEs (kpi, trends) keep working unchanged.
 *
 * The echo guard is structural: the bus is dispatched only here, never inside a
 * per-instance subscriber callback, so two copies still produce one emit.
 */

const state = { dateRange: '30d', segment: 'all' };
const subscribers = new Set();
let bus = null;

/** Shell injects the same EventTarget on every mount (last-writer-wins, harmless). */
export function attachBus(b) {
  bus = b;
}

/** @returns {{ dateRange: string, segment: string }} a copy, so callers can't mutate the singleton */
export function getState() {
  return { ...state };
}

/** @param {(state: { dateRange: string, segment: string }) => void} fn @returns {() => void} unsubscribe */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/** Update state, sync every copy, then broadcast on the bus exactly once. */
export function setFilter(patch) {
  Object.assign(state, patch);
  for (const fn of subscribers) fn(getState());
  bus?.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, {
    detail: getState(),
    bubbles: false,
  }));
}

/** Re-emit current state on the bus without notifying subscribers (REQUEST_FILTER reply). */
export function emitCurrent() {
  bus?.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, {
    detail: getState(),
    bubbles: false,
  }));
}

/** Test-only: reset the singleton between cases. */
export function __resetStore() {
  state.dateRange = '30d';
  state.segment = 'all';
  subscribers.clear();
  bus = null;
}

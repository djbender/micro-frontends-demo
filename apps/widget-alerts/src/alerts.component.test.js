import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOPICS } from '@demo/contracts';
import { mount } from './mount.js';

describe('AlertsComponent', () => {
  let target, bus;

  const header = label => [...target.querySelectorAll('th')].find(th => th.textContent.includes(label));
  const click = label => header(label).querySelector('button').click();
  const column = i => [...target.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent.trim());
  const setControl = (selector, value, type) => {
    const el = target.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new Event(type));
  };
  const filter = detail => bus.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, { detail }));
  // Angular renders asynchronously; poll for the outcome instead of sleeping a fixed time.
  const until = assertion => vi.waitFor(assertion, { interval: 2, timeout: 2000 });

  beforeEach(async () => {
    document.body.innerHTML = '<div id="t"></div>';
    target = document.getElementById('t');
    bus = new EventTarget();
    mount(target, { bus });
    await until(() => expect(target.querySelector('table')).not.toBeNull());
  });

  describe('sorting', () => {
    it('starts sorted by "When" ascending, with aria-sort only on that column', () => {
      expect(header('When').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Metric').hasAttribute('aria-sort')).toBe(false);
      const days = column(3).map(s => parseInt(s, 10));
      expect(days).toEqual(days.toSorted((a, b) => a - b));
    });

    it('clicking the active column toggles direction and the indicator', async () => {
      click('When');
      await until(() => {
        expect(header('When').getAttribute('aria-sort')).toBe('descending');
        expect(header('When').textContent).toContain('▼');
      });
      const days = column(3).map(s => parseInt(s, 10));
      expect(days).toEqual(days.toSorted((a, b) => b - a));

      click('When');
      await until(() => {
        expect(header('When').getAttribute('aria-sort')).toBe('ascending');
        expect(header('When').textContent).toContain('▲');
      });
    });

    it('clicking a different column switches to it, ascending', async () => {
      click('When'); // leave "When" descending
      await until(() => expect(header('When').getAttribute('aria-sort')).toBe('descending'));
      click('Metric');
      await until(() => expect(header('Metric').getAttribute('aria-sort')).toBe('ascending'));
      expect(header('When').hasAttribute('aria-sort')).toBe(false);
      const metrics = column(1);
      expect(metrics).toEqual(metrics.toSorted());
    });

    it('sorts severity by rank, critical first when descending', async () => {
      click('Severity'); // ascending: info first
      await until(() => expect(column(0)[0]).toBe('info'));
      click('Severity');
      await until(() => expect(column(0)[0]).toBe('critical'));
    });
  });

  describe('local form controls', () => {
    it('severity select narrows rows', async () => {
      setControl('select', 'critical', 'change');
      await until(() => {
        expect(column(0).length).toBeGreaterThan(0);
        expect(column(0).every(s => s === 'critical')).toBe(true);
      });
    });

    it('search narrows rows and uses the singular label for one result', async () => {
      setControl('input[type="search"]', 'checkout', 'input');
      await until(() => expect(column(1)).toEqual(['Checkout error rate']));
      expect(target.textContent).toContain('· 1 alert');
      expect(target.textContent).not.toContain('1 alerts');
    });

    it('shows the empty state when nothing matches', async () => {
      setControl('input[type="search"]', 'zzz-no-match', 'input');
      await until(() => expect(target.querySelector('.empty')).not.toBeNull());
      expect(target.querySelectorAll('tbody tr')).toHaveLength(1);
      expect(target.querySelector('.empty').textContent).toContain('No alerts match');
      expect(target.textContent).toContain('0 alerts');
    });

    it('keeps local controls applied when the bus filter changes', async () => {
      setControl('select', 'critical', 'change');
      await until(() => expect(column(0).every(s => s === 'critical')).toBe(true));
      filter({ dateRange: 'ytd', segment: 'all' });
      // 30d has 3 critical alerts; ytd has 4. Seeing 4 proves the bus filter applied
      // and the local severity control still does too.
      await until(() => expect(column(0)).toHaveLength(4));
      expect(column(0).every(s => s === 'critical')).toBe(true);
    });
  });

  describe('bus filter', () => {
    it('capitalises the segment label and shows the date range in the footer', async () => {
      filter({ dateRange: '90d', segment: 'smb' });
      await until(() => expect(target.querySelector('.footer').textContent).toContain('Smb · 90d'));
    });

    it('shows "All segments" by default', () => {
      expect(target.querySelector('.footer').textContent).toContain('All segments · 30d');
    });
  });
});

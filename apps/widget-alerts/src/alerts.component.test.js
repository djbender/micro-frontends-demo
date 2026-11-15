import { describe, it, expect, beforeEach } from 'vitest';
import { TOPICS } from '@demo/contracts';
import { mount } from './mount.js';

const settle = () => new Promise(r => setTimeout(r, 50));

describe('AlertsComponent', () => {
  let target, bus;

  const header = label => [...target.querySelectorAll('th')].find(th => th.textContent.includes(label));
  const click = async label => { header(label).querySelector('button').click(); await settle(); };
  const column = i => [...target.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent.trim());
  const setControl = async (selector, value, type) => {
    const el = target.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new Event(type));
    await settle();
  };
  const filter = detail => {
    bus.dispatchEvent(new CustomEvent(TOPICS.FILTER_CHANGE, { detail }));
    return settle();
  };

  beforeEach(async () => {
    document.body.innerHTML = '<div id="t"></div>';
    target = document.getElementById('t');
    bus = new EventTarget();
    mount(target, { bus });
    await settle();
  });

  describe('sorting', () => {
    it('starts sorted by "When" ascending, with aria-sort only on that column', () => {
      expect(header('When').getAttribute('aria-sort')).toBe('ascending');
      expect(header('Metric').hasAttribute('aria-sort')).toBe(false);
      const days = column(3).map(s => parseInt(s, 10));
      expect(days).toEqual(days.toSorted((a, b) => a - b));
    });

    it('clicking the active column toggles direction and the indicator', async () => {
      await click('When');
      expect(header('When').getAttribute('aria-sort')).toBe('descending');
      expect(header('When').textContent).toContain('▼');
      const days = column(3).map(s => parseInt(s, 10));
      expect(days).toEqual(days.toSorted((a, b) => b - a));

      await click('When');
      expect(header('When').getAttribute('aria-sort')).toBe('ascending');
      expect(header('When').textContent).toContain('▲');
    });

    it('clicking a different column switches to it, ascending', async () => {
      await click('When');            // leave "When" descending
      await click('Metric');
      expect(header('Metric').getAttribute('aria-sort')).toBe('ascending');
      expect(header('When').hasAttribute('aria-sort')).toBe(false);
      const metrics = column(1);
      expect(metrics).toEqual(metrics.toSorted());
    });

    it('sorts severity by rank, critical first when descending', async () => {
      await click('Severity');         // ascending: info first
      expect(column(0)[0]).toBe('info');
      await click('Severity');
      expect(column(0)[0]).toBe('critical');
    });
  });

  describe('local form controls', () => {
    it('severity select narrows rows', async () => {
      await setControl('select', 'critical', 'change');
      expect(column(0).length).toBeGreaterThan(0);
      expect(column(0).every(s => s === 'critical')).toBe(true);
    });

    it('search narrows rows and uses the singular label for one result', async () => {
      await setControl('input[type="search"]', 'checkout', 'input');
      expect(column(1)).toEqual(['Checkout error rate']);
      expect(target.textContent).toContain('· 1 alert');
      expect(target.textContent).not.toContain('1 alerts');
    });

    it('shows the empty state when nothing matches', async () => {
      await setControl('input[type="search"]', 'zzz-no-match', 'input');
      expect(target.querySelectorAll('tbody tr')).toHaveLength(1);
      expect(target.querySelector('.empty').textContent).toContain('No alerts match');
      expect(target.textContent).toContain('0 alerts');
    });

    it('keeps local controls applied when the bus filter changes', async () => {
      await setControl('select', 'critical', 'change');
      await filter({ dateRange: 'ytd', segment: 'all' });
      expect(column(0).every(s => s === 'critical')).toBe(true);
      expect(column(0).length).toBeGreaterThan(1);
    });
  });

  describe('bus filter', () => {
    it('capitalises the segment label and shows the date range in the footer', async () => {
      await filter({ dateRange: '90d', segment: 'smb' });
      expect(target.querySelector('.footer').textContent).toContain('Smb · 90d');
    });

    it('shows "All segments" by default', () => {
      expect(target.querySelector('.footer').textContent).toContain('All segments · 30d');
    });
  });
});

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { init, loadRemote } from '@module-federation/runtime';
import { validateManifest } from '@demo/contracts';
import EventLog from './EventLog.jsx';

const DISCOVERY_URL = import.meta.env.VITE_DISCOVERY_URL ?? '/discovery.local.json';

export default function Shell({ currentUser = { permissions: ['dashboard.view'] } }) {
  const [route, setRoute] = useState('/overview');
  const [theme, setTheme] = useState('light');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [navRoutes, setNavRoutes] = useState([]);

  const busRef = useRef(new EventTarget());
  const byRouteRef = useRef({});
  const unmountsRef = useRef([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    async function boot() {
      let manifest;
      try {
        const res = await fetch(DISCOVERY_URL);
        const json = await res.json();
        const { valid, error: err } = validateManifest(json);
        if (!valid) throw new Error(`Invalid manifest: ${err}`);
        manifest = json;
      } catch (e) {
        setError(e.message);
        setStatus('error');
        return;
      }

      const allowed = manifest.mfes.filter(m =>
        m.requiredPermissions.every(p => currentUser.permissions.includes(p))
      );

      await init({
        name: 'shell',
        remotes: allowed.map(m => ({ name: m.name, entry: m.url, type: 'module' })),
      });

      byRouteRef.current = Object.groupBy(allowed, m => m.route);
      setNavRoutes(Object.keys(byRouteRef.current));
      setStatus('ready');
    }
    boot();
  }, [currentUser]);

  const teardown = useCallback(() => {
    unmountsRef.current.forEach(fn => fn?.());
    unmountsRef.current = [];
  }, []);

  const renderRoute = useCallback(async (r) => {
    teardown();
    const mfes = byRouteRef.current[r] ?? [];
    const bus = busRef.current;
    for (const mfe of mfes) {
      try {
        const mod = await loadRemote(`${mfe.name}/${mfe.module.replace('./', '')}`);
        const slot = document.querySelector(`[data-slot="${mfe.slot}"]`);
        if (!slot) continue;
        const wrapper = document.createElement('div');
        slot.appendChild(wrapper);
        const unmount = mod.mount(wrapper, { bus });
        unmountsRef.current.push(() => { unmount?.(); wrapper.remove(); });
      } catch (e) {
        console.error(`Failed to load ${mfe.name}:`, e);
      }
    }
  }, [teardown]);

  useEffect(() => {
    if (status === 'ready') renderRoute(route);
  }, [status, route, renderRoute]);

  if (status === 'loading') return <div className="shell-status">Loading dashboard…</div>;
  if (status === 'error') return <div className="shell-status shell-error">Manifest error: {error}</div>;

  return (
    <div className="shell">
      <header className="shell-header">
        <span className="shell-title">MFE Dashboard</span>
        <nav className="shell-nav">
          {navRoutes.map(r => (
            <button
              key={r}
              className={`nav-btn${route === r ? ' active' : ''}`}
              onClick={() => setRoute(r)}
            >
              {r === '/overview' ? 'Overview' : r.replace('/', '').replace('-', ' ')}
            </button>
          ))}
        </nav>
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>
      <main className="shell-body">
        <div className="slot-toolbar" data-slot="toolbar"></div>
        <div className="slot-main" data-slot="main"></div>
        <div className="slot-side" data-slot="side"></div>
      </main>
      <EventLog bus={busRef.current} />
      <footer className="mfe-explainer">
        <details className="mfe-explainer__details">
        <summary className="mfe-explainer__summary">
          <h2 className="mfe-explainer__heading">Micro-Frontend Patterns in This Demo</h2>
          <span className="mfe-explainer__chevron" aria-hidden="true">▸</span>
        </summary>
        <ol className="mfe-explainer__columns">
          <li className="mfe-explainer__section">
            <h3>Runtime Composition via Discovery Manifest</h3>
            <p>
              The shell fetches a JSON manifest at boot and resolves every widget URL at runtime —
              nothing is bundled together at build time. Swapping a widget's URL in the manifest
              (or pointing <code>VITE_DISCOVERY_URL</code> at a different file) redeploys it
              without touching the shell or any other widget.{' '}
              <em>Teams ship independently on their own cadence with zero coordination overhead.</em>
            </p>
          </li>

          <li className="mfe-explainer__section">
            <h3>Universal Mount Contract</h3>
            <p>
              Every widget — regardless of framework — exposes one Module Federation module{' '}
              <code>./mount</code> with the same signature:{' '}
              <code>mount(target, props) → unmount</code>. The shell calls this single function
              and never knows whether the widget underneath is React, Svelte, or a Web Component.{' '}
              <em>Teams choose their own stack; adding a new framework requires zero changes to the shell.</em>
            </p>
          </li>

          <li className="mfe-explainer__section">
            <h3>Event Bus for Cross-Framework Communication</h3>
            <p>
              The shell creates one <code>EventTarget</code> and injects it into every widget at
              mount. Widgets communicate via Custom Events (<code>dashboard:filter-change</code>,{' '}
              <code>dashboard:request-filter</code>) — no global store, no shared package, no
              coupling between implementations.{' '}
              <em>A React widget and a Svelte widget react to the same filter with no shared runtime dependency.</em>
            </p>
          </li>

          <li className="mfe-explainer__section">
            <h3>Late-Mount Handshake (Request/Reply)</h3>
            <p>
              When a consumer mounts after the filter has already emitted its initial state, it
              fires <code>dashboard:request-filter</code>. The filter widget hears this and
              re-emits its current selection — no state is cached on the bus, making the filter
              the single source of truth.{' '}
              <em>Mount order is irrelevant; widgets can load lazily or in parallel without missing events.</em>
            </p>
          </li>

          <li className="mfe-explainer__section">
            <h3>Permission Gating at the Manifest Layer</h3>
            <p>
              The shell filters the manifest by <code>requiredPermissions</code> before calling{' '}
              <code>init()</code>. A widget the current user cannot access is never registered,
              never fetched, and never mounted — the route and nav entry simply do not appear.{' '}
              <em>Access control lives in one place and is enforced before any remote code executes.</em>{' '}
              Try <code>?permissions=dashboard.view,dashboard.admin</code> to unlock the admin route.
            </p>
          </li>

          <li className="mfe-explainer__section">
            <h3>Independent Versioning &amp; Zero-Downtime Deploy</h3>
            <p>
              Each widget carries its own <code>package.json</code> version, exposed at runtime
              as <code>__WIDGET_VERSION__</code> and shown in its version badge. Rebuilding and
              redeploying one widget — then updating its URL in the manifest — is enough to ship
              it. The shell and every other widget keep running without a rebuild or restart.{' '}
              <em>Teams release on their own schedule; a single widget deploy never risks the rest of the dashboard.</em>
            </p>
          </li>

          <li className="mfe-explainer__section">
            <h3>Shared Tokens, Isolated Styles</h3>
            <p>
              Design tokens are CSS custom properties on <code>:root</code>. Every widget reads
              the same token names without importing a shared CSS file — it is a naming
              convention, not a dependency. The Web Component uses Shadow DOM, yet custom
              properties pierce the shadow boundary automatically.{' '}
              <em>Consistent theming across all frameworks with zero style leakage. Toggle dark mode above to see it.</em>
            </p>
          </li>
        </ol>
        </details>
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { init, loadRemote } from '@module-federation/runtime';
import { validateManifest } from '@demo/contracts';

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
  const initializedRef = useRef(false);

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

      initializedRef.current = true;
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
    if (!initializedRef.current) return;
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
    </div>
  );
}

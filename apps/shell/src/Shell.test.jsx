import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@module-federation/runtime', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  loadRemote: vi.fn().mockResolvedValue({ mount: vi.fn().mockReturnValue(vi.fn()) }),
}));

vi.mock('./styles.css', () => ({}));

import Shell from './Shell.jsx';
import { loadRemote } from '@module-federation/runtime';

const SCHEMA = 'https://raw.githubusercontent.com/awslabs/frontend-discovery/main/schema/v1-pre.json';

function makeEntry(url, { module: mod = './mount', slot, route, requiredPermissions, version = '1.0.0' } = {}) {
  return { url, metadata: { integrity: '', version }, deployment: { default: true, traffic: 100 }, extras: { module: mod, slot, route, requiredPermissions } };
}

const BASE_MANIFEST = {
  schema: SCHEMA,
  microFrontends: {
    'widget-filter': [makeEntry('http://localhost:5004/remoteEntry.js', { slot: 'toolbar', route: '/overview', requiredPermissions: ['dashboard.view'] })],
    'widget-kpi':    [makeEntry('http://localhost:5001/remoteEntry.js', { slot: 'main',    route: '/overview', requiredPermissions: ['dashboard.view'] })],
    'widget-trends': [makeEntry('http://localhost:5003/remoteEntry.js', { slot: 'side',    route: '/overview', requiredPermissions: ['dashboard.view'] })],
    'widget-admin':  [makeEntry('http://localhost:5005/remoteEntry.js', { slot: 'main',    route: '/admin',    requiredPermissions: ['dashboard.view', 'dashboard.admin'] })],
  },
};

const NO_OVERVIEW_MANIFEST = {
  schema: SCHEMA,
  microFrontends: {
    'widget-report': [makeEntry('http://localhost:5006/remoteEntry.js', { slot: 'main', route: '/reports', requiredPermissions: ['dashboard.view'] })],
  },
};

const GHOST_SLOT_MANIFEST = {
  schema: SCHEMA,
  microFrontends: {
    'widget-real':  [makeEntry('http://localhost:5007/remoteEntry.js', { slot: 'main',  route: '/overview', requiredPermissions: ['dashboard.view'] })],
    'widget-ghost': [makeEntry('http://localhost:5008/remoteEntry.js', { slot: 'ghost', route: '/overview', requiredPermissions: ['dashboard.view'] })],
  },
};

function mockFetch(manifest, bucket = 42) {
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(manifest),
    headers: new Map([['X-Traffic-Bucket', String(bucket)]]),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply implementations cleared by clearAllMocks
  loadRemote.mockResolvedValue({ mount: vi.fn().mockReturnValue(vi.fn()) });
});

describe('Shell', () => {
  it('shows loading state before fetch resolves', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<Shell />);
    expect(screen.getByText('Loading dashboard…')).toBeInTheDocument();
  });

  it('shows error state when fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));
    await act(async () => { render(<Shell />); });
    expect(screen.getByText(/Manifest error:/)).toBeInTheDocument();
  });

  it('shows error state when manifest is invalid', async () => {
    mockFetch({ schema: SCHEMA }); // missing microFrontends
    await act(async () => { render(<Shell />); });
    expect(screen.getByText(/Manifest error:/)).toBeInTheDocument();
  });

  it('shows error state when manifest entry is missing deployment field', async () => {
    const { deployment: _, ...entryWithoutDeployment } = BASE_MANIFEST.microFrontends['widget-kpi'][0];
    const manifest = {
      schema: SCHEMA,
      microFrontends: { 'widget-kpi': [entryWithoutDeployment] },
    };
    mockFetch(manifest);
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    expect(screen.getByText(/Manifest error:/)).toBeInTheDocument();
  });

  it('loads kpi/filter/trends but not admin for dashboard.view-only user', async () => {
    mockFetch(BASE_MANIFEST);
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    screen.getByText('Overview');
    const loaded = loadRemote.mock.calls.map(([name]) => name);
    expect(loaded.some(n => n.startsWith('widget-filter'))).toBe(true);
    expect(loaded.some(n => n.startsWith('widget-kpi'))).toBe(true);
    expect(loaded.some(n => n.startsWith('widget-trends'))).toBe(true);
    expect(loaded.some(n => n.startsWith('widget-admin'))).toBe(false);
  });

  it('does not show admin route button for non-admin user', async () => {
    mockFetch(BASE_MANIFEST);
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    screen.getByText('Overview');
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });

  it('shows admin route button for admin user', async () => {
    mockFetch(BASE_MANIFEST);
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view', 'dashboard.admin'] }} />); });
    screen.getByText('Overview');
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('clicking a nav button changes the active route', async () => {
    mockFetch(BASE_MANIFEST);
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view', 'dashboard.admin'] }} />); });
    const adminBtn = screen.getByText('admin');
    await act(async () => { fireEvent.click(adminBtn); });
    expect(adminBtn.className).toMatch(/active/);
  });

  it('logs error when loadRemote throws for a widget', async () => {
    mockFetch(BASE_MANIFEST);
    loadRemote.mockRejectedValue(new Error('chunk load failed'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    screen.getByText('Overview');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toMatch(/Failed to load/);
    spy.mockRestore();
  });

  it('toggles data-theme attribute on theme button click and back', async () => {
    mockFetch(BASE_MANIFEST);
    await act(async () => { render(<Shell />); });
    const toggle = screen.getByLabelText('Toggle theme');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('calls mount on widget modules after slots are available', async () => {
    mockFetch(BASE_MANIFEST);
    const mountFn = vi.fn().mockReturnValue(vi.fn());
    loadRemote.mockResolvedValue({ mount: mountFn });
    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    screen.getByText('Overview');
    expect(mountFn).toHaveBeenCalled();
    expect(mountFn).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ bus: expect.any(EventTarget) }));
  });

  it('renders nothing for the initial route when no mfes are registered for it (?? [] fallback)', async () => {
    mockFetch(NO_OVERVIEW_MANIFEST);
    const mountFn = vi.fn().mockReturnValue(vi.fn());
    loadRemote.mockResolvedValue({ mount: mountFn });

    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });

    screen.getByText('reports'); // boot done; /reports is the only navRoute
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(loadRemote).not.toHaveBeenCalled();
    expect(mountFn).not.toHaveBeenCalled();
  });

  it('retries loadRemote with fallbackUrl when primary loadRemote throws and fallback differs', async () => {
    const fallbackUrl = 'http://cdn.example.com/widget-kpi/remoteEntry.js';
    const manifest = {
      schema: SCHEMA,
      microFrontends: {
        'widget-kpi': [{
          url: 'http://localhost:5001/remoteEntry.js',
          fallbackUrl,
          metadata: { integrity: '', version: '1.0.0' },
          deployment: { default: true, traffic: 100 },
          extras: { module: './mount', slot: 'main', route: '/overview', requiredPermissions: ['dashboard.view'] },
        }],
      },
    };
    mockFetch(manifest);

    const { init: mockInit } = await import('@module-federation/runtime');
    const mountFn = vi.fn().mockReturnValue(vi.fn());
    loadRemote
      .mockRejectedValueOnce(new Error('chunk load failed'))
      .mockResolvedValueOnce({ mount: mountFn });

    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    screen.getByText('Overview');

    const fallbackInitCall = mockInit.mock.calls.find(
      ([cfg]) => cfg.remotes?.[0]?.entry === fallbackUrl
    );
    expect(fallbackInitCall).toBeDefined();
    expect(loadRemote).toHaveBeenCalledTimes(2);
    expect(mountFn).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ bus: expect.any(EventTarget) }));
  });

  it('shows a bucket chip in the header after boot', async () => {
    mockFetch(BASE_MANIFEST);
    const { unmount } = await act(async () => render(<Shell currentUser={{ permissions: ['dashboard.view'] }} userToken="alice" />));
    expect(screen.getAllByText(/bucket \d+/)[0]).toBeInTheDocument();
    unmount();
  });

  it('loads the same remote when the server returns the same entry', async () => {
    const singleManifest = {
      schema: SCHEMA,
      microFrontends: {
        'widget-kpi': [
          { ...makeEntry('http://localhost:5001/remoteEntry.js', { slot: 'main', route: '/overview', requiredPermissions: ['dashboard.view'], version: '1.0.0' }), deployment: { default: true, traffic: 90 } },
        ],
      },
    };
    for (let i = 0; i < 2; i++) {
      vi.clearAllMocks();
      loadRemote.mockResolvedValue({ mount: vi.fn().mockReturnValue(vi.fn()) });
      mockFetch(singleManifest);
      const { unmount } = await act(async () => render(<Shell currentUser={{ permissions: ['dashboard.view'] }} userToken="alice" />));
      screen.getByText('Overview');
      unmount();
    }
    const calls = loadRemote.mock.calls.map(([name]) => name);
    expect(calls).toEqual(['widget-kpi_1_0_0/mount']);
  });

  it('loads the remote the server resolves for the given token', async () => {
    const v1Url = 'http://localhost:5001/v1/remoteEntry.js';
    const v2Url = 'http://localhost:5001/v2/remoteEntry.js';
    const canaryManifest = {
      schema: SCHEMA,
      microFrontends: {
        'widget-kpi': [
          { url: v2Url, fallbackUrl: v2Url, metadata: { integrity: '', version: '1.1.0' }, deployment: { default: false, traffic: 10 }, extras: { module: './mount', slot: 'main', route: '/overview', requiredPermissions: ['dashboard.view'] } },
        ],
      },
    };
    const defaultManifest = {
      schema: SCHEMA,
      microFrontends: {
        'widget-kpi': [
          { url: v1Url, fallbackUrl: v1Url, metadata: { integrity: '', version: '1.0.0' }, deployment: { default: true, traffic: 90 }, extras: { module: './mount', slot: 'main', route: '/overview', requiredPermissions: ['dashboard.view'] } }],
      },
    };
    const { init: mockInit } = await import('@module-federation/runtime');

    mockFetch(canaryManifest, 100);
    const { unmount: unmount1 } = await act(async () => render(<Shell currentUser={{ permissions: ['dashboard.view'] }} userToken="canary" />));
    screen.getByText('Overview');
    expect(mockInit.mock.calls.some(([cfg]) => cfg.remotes?.some(r => r.entry === v2Url))).toBe(true);
    unmount1();

    vi.clearAllMocks();
    loadRemote.mockResolvedValue({ mount: vi.fn().mockReturnValue(vi.fn()) });
    mockFetch(defaultManifest, 1);
    const { unmount: unmount2 } = await act(async () => render(<Shell currentUser={{ permissions: ['dashboard.view'] }} userToken="default" />));
    screen.getByText('Overview');
    expect(mockInit.mock.calls.some(([cfg]) => cfg.remotes?.some(r => r.entry === v1Url))).toBe(true);
    unmount2();
  });

  it('skips a widget whose slot does not exist in the DOM (!slot continue)', async () => {
    mockFetch(GHOST_SLOT_MANIFEST);
    const mountFn = vi.fn().mockReturnValue(vi.fn());
    loadRemote.mockResolvedValue({ mount: mountFn });

    await act(async () => { render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />); });
    screen.getByText('Overview');

    const loaded = loadRemote.mock.calls.map(([name]) => name);
    expect(loaded.some(n => n.startsWith('widget-real'))).toBe(true);
    expect(loaded.some(n => n.startsWith('widget-ghost'))).toBe(true);

    expect(mountFn).toHaveBeenCalledTimes(1); // only the real-slot widget mounts; ghost hit `continue`
    expect(mountFn).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ bus: expect.any(EventTarget) }),
    );
  });
});

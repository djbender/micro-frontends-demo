import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@module-federation/runtime', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  loadRemote: vi.fn().mockResolvedValue({ mount: vi.fn().mockReturnValue(vi.fn()) }),
}));

vi.mock('./styles.css', () => ({}));

import Shell from './Shell.jsx';
import { loadRemote } from '@module-federation/runtime';

const BASE_MANIFEST = {
  schemaVersion: '1',
  mfes: [
    { name: 'widget-filter', url: 'http://localhost:5004/remoteEntry.js', module: './mount', slot: 'toolbar', route: '/overview', requiredPermissions: ['dashboard.view'], version: '1.0.0' },
    { name: 'widget-kpi', url: 'http://localhost:5001/remoteEntry.js', module: './mount', slot: 'main', route: '/overview', requiredPermissions: ['dashboard.view'], version: '1.0.0' },
    { name: 'widget-trends', url: 'http://localhost:5003/remoteEntry.js', module: './mount', slot: 'side', route: '/overview', requiredPermissions: ['dashboard.view'], version: '1.0.0' },
    { name: 'widget-admin', url: 'http://localhost:5005/remoteEntry.js', module: './mount', slot: 'main', route: '/admin', requiredPermissions: ['dashboard.view', 'dashboard.admin'], version: '1.0.0' },
  ],
};

const NO_OVERVIEW_MANIFEST = {
  schemaVersion: '1',
  mfes: [
    { name: 'widget-report', url: 'http://localhost:5006/remoteEntry.js', module: './mount', slot: 'main', route: '/reports', requiredPermissions: ['dashboard.view'], version: '1.0.0' },
  ],
};

const GHOST_SLOT_MANIFEST = {
  schemaVersion: '1',
  mfes: [
    { name: 'widget-real',  url: 'http://localhost:5007/remoteEntry.js', module: './mount', slot: 'main',  route: '/overview', requiredPermissions: ['dashboard.view'], version: '1.0.0' },
    { name: 'widget-ghost', url: 'http://localhost:5008/remoteEntry.js', module: './mount', slot: 'ghost', route: '/overview', requiredPermissions: ['dashboard.view'], version: '1.0.0' },
  ],
};

function mockFetch(manifest) {
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(manifest),
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
    render(<Shell />);
    await screen.findByText(/Manifest error:/);
    expect(screen.getByText(/Manifest error:/)).toBeInTheDocument();
  });

  it('shows error state when manifest is invalid', async () => {
    mockFetch({ schemaVersion: '1' }); // missing mfes
    render(<Shell />);
    await screen.findByText(/Manifest error:/);
    expect(screen.getByText(/Manifest error:/)).toBeInTheDocument();
  });

  it('loads kpi/filter/trends but not admin for dashboard.view-only user', async () => {
    mockFetch(BASE_MANIFEST);
    render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />);
    // Wait for boot to complete (nav shows up)
    await screen.findByText('Overview');
    await waitFor(() => expect(loadRemote).toHaveBeenCalled());
    const loaded = loadRemote.mock.calls.map(([name]) => name);
    expect(loaded).toContain('widget-filter/mount');
    expect(loaded).toContain('widget-kpi/mount');
    expect(loaded).toContain('widget-trends/mount');
    expect(loaded).not.toContain('widget-admin/mount');
  });

  it('does not show admin route button for non-admin user', async () => {
    mockFetch(BASE_MANIFEST);
    render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />);
    await screen.findByText('Overview');
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
  });

  it('shows admin route button for admin user', async () => {
    mockFetch(BASE_MANIFEST);
    render(<Shell currentUser={{ permissions: ['dashboard.view', 'dashboard.admin'] }} />);
    await screen.findByText('Overview');
    await screen.findByText('admin');
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('clicking a nav button changes the active route', async () => {
    mockFetch(BASE_MANIFEST);
    render(<Shell currentUser={{ permissions: ['dashboard.view', 'dashboard.admin'] }} />);
    await screen.findByText('Overview');
    const adminBtn = await screen.findByText('admin');
    fireEvent.click(adminBtn);
    await waitFor(() => expect(adminBtn.className).toMatch(/active/));
  });

  it('logs error when loadRemote throws for a widget', async () => {
    mockFetch(BASE_MANIFEST);
    loadRemote.mockRejectedValue(new Error('chunk load failed'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />);
    await screen.findByText('Overview');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toMatch(/Failed to load/);
    spy.mockRestore();
  });

  it('toggles data-theme attribute on theme button click and back', async () => {
    mockFetch(BASE_MANIFEST);
    render(<Shell />);
    const toggle = await screen.findByLabelText('Toggle theme');
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
    render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />);
    await screen.findByText('Overview');
    await waitFor(() => expect(mountFn).toHaveBeenCalled(), { timeout: 2000 });
    expect(mountFn).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ bus: expect.any(EventTarget) }));
  });

  it('renders nothing for the initial route when no mfes are registered for it (?? [] fallback)', async () => {
    mockFetch(NO_OVERVIEW_MANIFEST);
    const mountFn = vi.fn().mockReturnValue(vi.fn());
    loadRemote.mockResolvedValue({ mount: mountFn });

    render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />);

    await screen.findByText('reports'); // boot done; /reports is the only navRoute
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(loadRemote).not.toHaveBeenCalled();
    expect(mountFn).not.toHaveBeenCalled();
  });

  it('skips a widget whose slot does not exist in the DOM (!slot continue)', async () => {
    mockFetch(GHOST_SLOT_MANIFEST);
    const mountFn = vi.fn().mockReturnValue(vi.fn());
    loadRemote.mockResolvedValue({ mount: mountFn });

    render(<Shell currentUser={{ permissions: ['dashboard.view'] }} />);
    await screen.findByText('Overview');

    await waitFor(() => {
      const loaded = loadRemote.mock.calls.map(([name]) => name);
      expect(loaded).toContain('widget-real/mount');
      expect(loaded).toContain('widget-ghost/mount');
    });

    expect(mountFn).toHaveBeenCalledTimes(1); // only the real-slot widget mounts; ghost hit `continue`
    expect(mountFn).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ bus: expect.any(EventTarget) }),
    );
  });
});

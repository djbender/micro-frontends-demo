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

  it('toggles data-theme attribute on theme button click', async () => {
    mockFetch(BASE_MANIFEST);
    render(<Shell />);
    const toggle = await screen.findByLabelText('Toggle theme');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

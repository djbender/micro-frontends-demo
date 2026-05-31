import { render, screen } from '@testing-library/react';
import AdminWidget from './AdminWidget.jsx';

describe('AdminWidget', () => {
  it('renders "Admin Panel" heading', () => {
    render(<AdminWidget />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders 3 user rows', () => {
    render(<AdminWidget />);
    expect(screen.getByText('Alice Nakamura')).toBeInTheDocument();
    expect(screen.getByText('Bob Okonkwo')).toBeInTheDocument();
    expect(screen.getByText('Carol Singh')).toBeInTheDocument();
  });

  it('shows role column values', () => {
    render(<AdminWidget />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('shows 2 active and 1 inactive status', () => {
    render(<AdminWidget />);
    const actives = screen.getAllByText('active');
    expect(actives).toHaveLength(2);
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('shows dashboard.admin permission note', () => {
    render(<AdminWidget />);
    expect(screen.getByText('dashboard.admin')).toBeInTheDocument();
  });

  it('does not crash when rendered without props', () => {
    expect(() => render(<AdminWidget />)).not.toThrow();
  });
});

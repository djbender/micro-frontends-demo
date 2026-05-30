import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminWidget from './AdminWidget.jsx';

export function mount(target, _props) {
  const root = createRoot(target);
  root.render(<AdminWidget />);
  return () => root.unmount();
}

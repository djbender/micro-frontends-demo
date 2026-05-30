import React from 'react';
import { createRoot } from 'react-dom/client';
import KpiWidget from './KpiWidget.jsx';

export function mount(target, props) {
  const root = createRoot(target);
  root.render(<KpiWidget bus={props.bus} />);
  return () => root.unmount();
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './Shell.jsx';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const permParam = params.get('permissions');
const currentUser = permParam
  ? { permissions: permParam.split(',').map(p => p.trim()) }
  : { permissions: ['dashboard.view'] };

createRoot(document.getElementById('root')).render(<Shell currentUser={currentUser} />);

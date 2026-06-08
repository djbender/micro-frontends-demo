import React from 'react';
import styles from './AdminWidget.module.css';

const MOCK_USERS = [
  { id: 1, name: 'Alice Nakamura', role: 'Admin', status: 'active' },
  { id: 2, name: 'Bob Okonkwo', role: 'Editor', status: 'active' },
  { id: 3, name: 'Carol Singh', role: 'Viewer', status: 'inactive' },
];

export default function AdminWidget() {
  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h2 className={styles.title}>Admin Panel</h2>
        <span className={styles.badge}>widget-admin: {import.meta.env.VITE_WIDGET_VERSION}</span>
      </div>
      <p className={styles.subtitle}>Permission: <code>dashboard.admin</code></p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_USERS.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.role}</td>
              <td>
                <span className={`${styles.status} ${u.status === 'active' ? styles.active : styles.inactive}`}>
                  {u.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

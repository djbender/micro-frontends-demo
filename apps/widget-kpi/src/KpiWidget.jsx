import React, { useState, useEffect } from 'react';
import { TOPICS } from '@demo/contracts';
import { computeKpis, formatValue } from './data.js';
import styles from './KpiWidget.module.css';

export default function KpiWidget({ bus }) {
  const [filter, setFilter] = useState({ dateRange: '30d', segment: 'all' });

  useEffect(() => {
    const onFilter = (e) => setFilter(e.detail);
    bus.addEventListener(TOPICS.FILTER_CHANGE, onFilter);
    bus.dispatchEvent(new CustomEvent(TOPICS.REQUEST_FILTER, { bubbles: false }));
    return () => bus.removeEventListener(TOPICS.FILTER_CHANGE, onFilter);
  }, [bus]);

  const kpis = computeKpis(filter);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h2 className={styles.title}>KPI Summary</h2>
        <span className={styles.badge}>v{__WIDGET_VERSION__}</span>
      </div>
      <div className={styles.grid}>
        {kpis.map(({ key, label, unit, value, change }) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardLabel}>{label}</div>
            <div className={styles.cardValue}>{formatValue(unit, value)}</div>
            <div className={`${styles.cardChange} ${change >= 0 ? styles.pos : styles.neg}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { TOPICS } from '@demo/contracts';

const MAX_ENTRIES = 50;
let nextId = 1;

export default function EventLog({ bus }) {
  const [entries, setEntries] = useState([]);
  const idRef = useRef(nextId);

  useEffect(() => {
    if (!bus) return;

    const onEmit = (e) => {
      const seq = idRef.current++;
      setEntries(prev => [
        { id: seq, seq, actor: 'widget-filter', kind: 'emit', topic: 'filter-change', payload: e.detail },
        ...prev,
      ].slice(0, MAX_ENTRIES));
    };

    const onConsume = (e) => {
      const seq = idRef.current++;
      const topic = e.detail.topic.replace('dashboard:', '');
      setEntries(prev => [
        { id: seq, seq, actor: e.detail.actor, kind: 'consume', topic, payload: e.detail.payload },
        ...prev,
      ].slice(0, MAX_ENTRIES));
    };

    bus.addEventListener(TOPICS.FILTER_CHANGE, onEmit);
    bus.addEventListener(TOPICS.EVENT_CONSUMED, onConsume);
    return () => {
      bus.removeEventListener(TOPICS.FILTER_CHANGE, onEmit);
      bus.removeEventListener(TOPICS.EVENT_CONSUMED, onConsume);
    };
  }, [bus]);

  return (
    <section className="event-log">
      <div className="event-log__header">
        <span className="event-log__title">Bus Events</span>
        {entries.length === 0 && (
          <span className="event-log__empty">waiting for events…</span>
        )}
      </div>
      <ul className="event-log__list" aria-label="Event log">
        {entries.map(e => (
          <li key={e.id} className={`event-log__entry event-log__entry--${e.kind}`}>
            <span className="event-log__seq">#{e.seq}</span>
            {e.kind === 'emit'
              ? `${e.actor} → emit ${e.topic}`
              : `${e.actor} ← consume ${e.topic}`}
            {e.payload && (
              <span className="event-log__payload">
                {e.payload.dateRange} · {e.payload.segment}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

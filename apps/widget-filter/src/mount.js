import './FilterWidget.js';

export function mount(target, props) {
  const el = document.createElement('filter-widget');
  el.bus = props.bus;
  target.appendChild(el);
  return () => el.remove();
}

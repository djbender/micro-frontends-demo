import './FilterWidget.js';

export function mount(target, props) {
  const el = document.createElement('filter-widget');
  el.setAttribute('variant', props.variant ?? 'full');
  el.bus = props.bus;
  target.appendChild(el);
  return () => el.remove();
}

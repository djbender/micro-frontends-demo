import { mount as svelteMount, unmount as svelteUnmount } from 'svelte';
import TrendsWidget from './TrendsWidget.svelte';

export function mount(target, props) {
  const app = svelteMount(TrendsWidget, { target, props: { bus: props.bus } });
  return () => svelteUnmount(app);
}

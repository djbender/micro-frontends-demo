import { mount } from './mount.js';

const bus = new EventTarget();
mount(document.getElementById('root'), { bus });

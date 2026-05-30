import { mount } from './mount.jsx';

const bus = new EventTarget();
mount(document.getElementById('root'), { bus });

import { InjectionToken } from '@angular/core';

/** The shell-owned EventTarget, injected by `mount()` via `props.bus`. */
export const BUS = new InjectionToken<EventTarget>('dashboard-bus');

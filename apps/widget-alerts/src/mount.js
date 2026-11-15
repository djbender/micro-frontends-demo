import { createApplication } from '@angular/platform-browser';
import { createComponent, provideZonelessChangeDetection } from '@angular/core';
import { AlertsComponent } from './alerts.component';
import { BUS } from './bus.token';

/**
 * Universal mount contract: mount(target, props) → unmount.
 * Angular bootstraps asynchronously but the shell expects a synchronous
 * unmount function, so a teardown that arrives mid-bootstrap is remembered
 * and applied as soon as the app exists.
 */
export function mount(target, props) {
  let disposed = false;
  let teardown = null;

  createApplication({
    providers: [provideZonelessChangeDetection(), { provide: BUS, useValue: props.bus }],
  }).then(app => {
    if (disposed) return app.destroy();
    const ref = createComponent(AlertsComponent, { hostElement: target, environmentInjector: app.injector });
    app.attachView(ref.hostView);
    teardown = () => { ref.destroy(); app.destroy(); };
  });

  return () => {
    disposed = true;
    teardown?.();
    teardown = null;
  };
}

// Vitest loads Angular's partially-compiled libs unlinked; the JIT compiler is the fallback.
// Production builds are linked/AOT-compiled by @analogjs/vite-plugin-angular and don't need this.
import '@angular/compiler';

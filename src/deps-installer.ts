import 'zx/globals';

import type { LibData } from './defs.js';

export default async function depsInstaller(libData: LibData) {
  if (libData.deps) {
    if (libData.deps.linux && process.platform === 'linux') {
      await $`sudo apt-get install -yyq ${libData.deps.linux}`;
    }
  }
}

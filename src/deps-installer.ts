import 'zx/globals';

import type { PackageContext } from './defs.js';

export default async function depsInstaller(ctx: PackageContext) {
  if (ctx.libData.deps) {
    if (ctx.libData.deps.linux && process.platform === 'linux') {
      await $`sudo apt-get install -yyq ${ctx.libData.deps.linux}`;
    }

    if (ctx.libData.deps.darwin && process.platform === 'darwin') {
      await $`brew install ${ctx.libData.deps.linux}`;
    }
  }
}

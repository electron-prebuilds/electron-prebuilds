import 'zx/globals';

import type { PackageContext } from './defs.js';

export default async function test(ctx: PackageContext) {
  if (!ctx.libData.test) return;

  cd(ctx.path);

  await $`node -e ${ctx.libData.test}`;
}

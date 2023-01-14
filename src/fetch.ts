import 'zx/globals';

import tar from 'tar';

import type { PackageContext } from './defs.js';

export default async function fetch(ctx: PackageContext) {
  if (!ctx.input.version) throw new Error('version is undefined');

  await $`rm -rf ${ctx.path}`;

  const fileName = `${ctx.githubAssetName}.tgz`;

  await $`npm pack ${ctx.libData.npmName}@${ctx.input.version}`;

  await tar.extract({ file: fileName });

  await $`rm -f ${fileName}`;
}

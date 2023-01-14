/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */

import 'zx/globals';

import { ELECTRON_VERSIONS, NODE_VERSIONS } from './defs.js';

import type { PackageContext } from './defs.js';

export default async function build(ctx: PackageContext) {
  if (ctx.libData.os && !ctx.libData.os.includes(process.platform)) return;

  cd(ctx.path);

  const archs = new Set<string>();

  if (process.platform !== 'darwin') {
    archs.add('x64');
  } else if (ctx.libData.universal) {
    archs.add('x64+arm64');
  } else {
    archs.add('x64');
    archs.add('arm64');
  }

  // TODO: enable later
  // if (process.platform === 'linux') {
  //   archs.add('arm64');
  // }

  if (await fs.pathExists(path.join(ctx.path, 'yarn.lock'))) {
    await $`yarn install --ignore-scripts`;
  } else {
    await $`npm install --ignore-scripts`;
  }

  for (const arch of archs) {
    if (ctx.isNan) {
      await $`npx prebuildify --strip --arch=${arch} ${NODE_VERSIONS.map(v => ['-t', `node@${v}`]).flat()} ${ELECTRON_VERSIONS.map(v => ['-t', `electron@${v}`]).flat()}`;
    } else {
      await $`npx prebuildify --strip --arch=${arch} --napi`;
    }
  }
}

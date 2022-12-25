/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */

import 'zx/globals';

import type { LibData } from './defs.js';

const ARCHS = process.platform === 'win32' ? ['x64'] : ['x64', 'arm64'];

const NODE_VERSIONS = ['14.0.0', '16.0.0', '17.0.1', '18.0.0'];
const ELECTRON_VERSIONS = ['18.0.0', '19.0.0', '20.0.0', '21.0.0', '22.0.0'];

export default async function build(libData: LibData) {
  cd(libData.targetPath);

  if (await fs.pathExists(path.join(libData.targetPath, 'yarn.lock'))) {
    await $`yarn install --ignore-scripts`;
  } else {
    await $`npm install --ignore-scripts`;
  }

  for (const arch of ARCHS) {
    if (libData.nan) {
      await $`npx prebuildify --strip --arch=${arch} ${NODE_VERSIONS.map(v => ['-t', `node@${v}`]).flat()} ${ELECTRON_VERSIONS.map(v => ['-t', `electron@${v}`]).flat()}`;
    } else {
      await $`npx prebuildify --strip --arch=${arch} --napi`;
    }
  }
}

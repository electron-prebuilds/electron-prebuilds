/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */

import 'zx/globals';

import type { PackageJson } from 'type-fest';

import type { PackageContext } from './defs.js';

const NODE_VERSIONS: string[] = ['16.0.0']; // ['14.0.0', '16.0.0', '17.0.1', '18.0.0'];
const ELECTRON_VERSIONS: string[] = ['19.0.0', '20.0.0'];

export default async function build(ctx: PackageContext) {
  cd(ctx.path);

  const packageJSONPath = path.join(ctx.path, 'package.json');
  const packageJSON: PackageJson = JSON.parse(await fs.readFile(packageJSONPath, 'utf-8'));

  const archs = new Set(['x64']);

  if (process.platform === 'darwin') {
    if (ctx.libData.universal) {
      archs.delete('x64');
      archs.add('x64+arm64');
    } else {
      archs.add('arm64');
    }
  }
  if (process.platform === 'linux') {
    archs.add('arm64');
  }

  if (!packageJSON.os || packageJSON.os.includes(process.platform)) {
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
  } else {
    console.log('skipping build');
  }
}

import 'zx/globals';

import tar from 'tar';

import type { PackageContext } from './defs.js';

const BASE_IGNORE_LIST = ['/prebuilds/', '/build/', '.npmrc'];

export default async function prepare(ctx: PackageContext) {
  cd(ctx.path);

  await fs.appendFile(
    path.join(ctx.path, '.npmignore'),
    `\n\n${BASE_IGNORE_LIST.join('\n')}}`,
    { encoding: 'utf-8' },
  );

  const prebuildsPath = path.join(ctx.path, 'prebuilds');

  const arch = `${process.platform}-${process.arch}`;

  if (process.platform !== 'darwin') {
    await tar.create(
      {
        file: path.join(prebuildsPath, `${ctx.packageName}-${arch}.tgz`),
        gzip: true,
      },
      [path.join('prebuilds', arch)],
    );
  } else if (ctx.libData.universal) {
    const pathCommon = path.join(prebuildsPath, `${ctx.packageName}-darwin-x64+arm64.tgz`);
    const pathX64 = path.join(prebuildsPath, `${ctx.packageName}-darwin-x64.tgz`);
    const pathArm64 = path.join(prebuildsPath, `${ctx.packageName}-darwin-arm64.tgz`);

    await tar.create(
      {
        file: pathCommon,
        gzip: true,
      },
      [path.join('prebuilds', 'darwin-x64+arm64')],
    );

    await fs.copy(pathCommon, pathX64);
    await fs.copy(pathCommon, pathArm64);
  } else {
    const pathCommon = path.join(prebuildsPath, 'darwin-x64+arm64');

    await fs.remove(pathCommon);
    await fs.copy(path.join(prebuildsPath, 'darwin-x64'), pathCommon);

    await tar.create(
      {
        file: path.join(prebuildsPath, `${ctx.packageName}-darwin-x64.tgz`),
        gzip: true,
      },
      [path.join('prebuilds', 'darwin-x64+arm64'), path.join('prebuilds', 'darwin-x64')],
    );

    await fs.remove(pathCommon);
    await fs.copy(path.join(prebuildsPath, 'darwin-arm64'), pathCommon);

    await tar.create(
      {
        file: path.join(prebuildsPath, `${ctx.packageName}-darwin-arm64.tgz`),
        gzip: true,
      },
      [path.join('prebuilds', 'darwin-x64+arm64'), path.join('prebuilds', 'darwin-arm64')],
    );
  }
}

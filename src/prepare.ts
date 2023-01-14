import 'zx/globals';

import tar from 'tar';

import type { PackageContext } from './defs.js';

export default async function prepare(ctx: PackageContext) {
  if (ctx.libData.os && !ctx.libData.os.includes(process.platform)) return;

  cd(ctx.path);

  const prebuildsPath = path.join(ctx.path, 'prebuilds');

  const platformString = `${process.platform}-${process.arch}`;
  if (process.platform !== 'darwin') {
    await tar.create(
      {
        file: path.join(prebuildsPath, `${ctx.githubAssetPrefix}-${platformString}.tgz`),
        gzip: true,
      },
      [path.join('prebuilds', platformString)],
    );
  } else if (ctx.libData.universal) {
    const pathCommon = path.join(prebuildsPath, `${ctx.githubAssetPrefix}-darwin-x64+arm64.tgz`);
    const pathX64 = path.join(prebuildsPath, `${ctx.githubAssetPrefix}-darwin-x64.tgz`);
    const pathArm64 = path.join(prebuildsPath, `${ctx.githubAssetPrefix}-darwin-arm64.tgz`);

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
    const copyAndPack = async (currentArch: string) => {
      const pathCommon = path.join(prebuildsPath, 'darwin-x64+arm64');

      await fs.remove(pathCommon);
      await fs.copy(path.join(prebuildsPath, `darwin-${currentArch}`), pathCommon);

      await tar.create(
        {
          file: path.join(prebuildsPath, `${ctx.githubAssetPrefix}-darwin-${currentArch}.tgz`),
          gzip: true,
        },
        [path.join('prebuilds', 'darwin-x64+arm64'), path.join('prebuilds', `darwin-${currentArch}`)],
      );
    };

    const archs = process.arch === 'x64' ? ['arm64', 'x64'] : ['x64', 'arm64'];
    for (const arch of archs) {
      // eslint-disable-next-line no-await-in-loop
      await copyAndPack(arch);
    }
  }
}

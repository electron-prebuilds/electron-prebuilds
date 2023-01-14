import 'zx/globals';

import tar from 'tar';

import type { PackageContext } from './defs';

export default async function prepublish(ctx: PackageContext) {
  cd(ctx.path);

  const prebuildsPath = path.join(ctx.path, 'prebuilds');
  const platforms = await fs.readdir(prebuildsPath, { withFileTypes: true });

  await Promise.all(
    platforms
      .filter(platform => platform.isDirectory())
      .map(async (platform) => {
        await tar.create(
          {
            file: path.join(prebuildsPath, `${ctx.nameWithVersion}-${platform.name}.tgz`),
            gzip: true,
          },
          [path.join('prebuilds', platform.name)],
        );
      }),
  );

  if (process.platform === 'darwin') {
    const darwinPath = path.join(prebuildsPath, `${ctx.nameWithVersion}-darwin-x64+arm64.tgz`);

    if (await fs.pathExists(darwinPath)) {
      const copyPath1 = path.join(prebuildsPath, `${ctx.nameWithVersion}-darwin-x64.tgz`);
      const copyPath2 = path.join(prebuildsPath, `${ctx.nameWithVersion}-darwin-arm64.tgz`);

      if (!(await fs.pathExists(copyPath1))) {
        await fs.copy(darwinPath, copyPath1);
      }

      if (!(await fs.pathExists(copyPath2))) {
        await fs.copy(darwinPath, copyPath2);
      }
    }
  }
}

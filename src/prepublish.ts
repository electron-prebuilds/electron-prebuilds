import 'zx/globals';

import tar from 'tar';

import type { PackageContext } from './defs';

export default async function prepublish(ctx: PackageContext) {
  cd(ctx.path);

  const prebuildsPath = path.join(ctx.path, 'prebuilds');
  const platforms = await fs.readdir(prebuildsPath);

  await Promise.all(platforms.map(async (platform) => {
    await tar.create(
      {
        file: path.join(prebuildsPath, `${platform}.tgz`),
        gzip: true,
      },
      [path.join('prebuilds', platform)],
    );
  }));
}

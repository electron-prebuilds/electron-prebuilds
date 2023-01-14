/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'zx/globals';

import { GITHUB_ORG, GITHUB_REPO } from './defs.js';
import { gh, ghAuth } from './utils.js';

import type { PackageContext } from './defs.js';

export default async function upload(ctx: PackageContext) {
  if (ctx.libData.os && !ctx.libData.os.includes(process.platform)) return;
  // await ctx.initPackageJSON();

  cd(ctx.path);

  const prebuildsPath = path.join(ctx.path, 'prebuilds');
  const platforms = await fs.readdir(prebuildsPath);
  const files = platforms.filter(p => p.endsWith('.tgz')).map(p => path.join(prebuildsPath, p));

  const tag = ctx.githubReleaseName;
  const ref = `tags/${tag}`;

  if (process.env.DRY_RUN === 'false') {
    await gh.uploadAssetsAsync(ghAuth, GITHUB_ORG, GITHUB_REPO, ref, files);
  } else {
    echo('uploading files to', GITHUB_ORG, GITHUB_REPO, ref, files);
  }
}

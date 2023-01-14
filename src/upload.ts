/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'zx/globals';

import { GITHUB_ORG, GITHUB_REPO } from './defs.js';
import { gh } from './utils.js';

import type { PackageContext } from './defs.js';

export default async function publish(ctx: PackageContext) {
  if (process.env.DRY_RUN === 'false') {
    cd(ctx.path);

    const auth = {
      user: 'x-oauth',
      token: process.env.GITHUB_TOKEN,
    };

    const prebuildsPath = path.join(ctx.path, 'prebuilds');
    const platforms = await fs.readdir(prebuildsPath);
    const files = platforms.filter(p => p.endsWith('.tgz')).map(p => path.join(prebuildsPath, p));

    const tag = ctx.githubReleaseName;
    const ref = `tags/${tag}`;

    try {
      await gh.getByTagAsync(auth, GITHUB_ORG, GITHUB_REPO, tag);
    } catch {
      await gh.createAsync(auth, GITHUB_ORG, GITHUB_REPO, { tag_name: tag });
    }

    await gh.uploadAssetsAsync(auth, GITHUB_ORG, GITHUB_REPO, ref, files);
  }
}

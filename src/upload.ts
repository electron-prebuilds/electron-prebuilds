/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'zx/globals';

import util from 'util';
import gh from 'ghreleases';

import { GITHUB_ORG, GITHUB_REPO } from './defs.js';

import type { PackageContext } from './defs.js';

gh.createAsync = util.promisify(gh.create.bind(gh));
gh.uploadAssetsAsync = util.promisify(gh.uploadAssets.bind(gh));
gh.getByTagAsync = util.promisify(gh.getByTag.bind(gh));

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

    const tag = ctx.releaseName;
    const ref = `tags/${tag}`;

    try {
      await gh.getByTagAsync(auth, GITHUB_ORG, GITHUB_REPO, tag);
    } catch {
      await gh.createAsync(auth, GITHUB_ORG, GITHUB_REPO, { tag_name: tag });
    }

    await gh.uploadAssetsAsync(auth, GITHUB_ORG, GITHUB_REPO, ref, files);
  }
}

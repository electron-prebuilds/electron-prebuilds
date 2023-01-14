/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'zx/globals';

import semver from 'semver';

import { GITHUB_ORG, GITHUB_REPO, PackageContext } from './defs.js';
import { gh, ghAuth } from './utils.js';

export async function getNPMVersions(packageName: string, acceptString: string) {
  try {
    const { stdout } = await $`npm show ${packageName} time --json`;

    const result = JSON.parse(stdout);

    const versions = Object.keys(result)
      .filter(k => k !== 'modified' && k !== 'created')
      .filter(k => !k.includes('-'))
      .filter(k => semver.satisfies(k, acceptString))
      .sort((a, b) => (result[a] > result[b] ? 1 : -1));

    return versions;
  } catch {} // eslint-disable-line no-empty

  return [];
}

export default async function scan(ctx: PackageContext) {
  if (!ctx.libData.accept) return;

  const versions = await getNPMVersions(ctx.libData.npmName, ctx.libData.accept);

  for (const version of versions) {
    const newCtx = new PackageContext({ ...ctx.input, version });
    await newCtx.init();

    if (newCtx.prebuildVersion === 1 || process.env.FORCE_CREATE_RELEASE === 'true') {
      if (process.env.DRY_RUN === 'false') {
        await gh.createAsync(ghAuth, GITHUB_ORG, GITHUB_REPO, { tag_name: newCtx.githubReleaseName, prerelease: true });

        await sleep(3000);
      } else {
        echo('release', newCtx.githubReleaseName, 'will be created');
      }
    }
  }
}

/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'zx/globals';

import semver from 'semver';

import { GITHUB_ORG, GITHUB_REPO } from './defs.js';
import { gh } from './utils.js';

import type { PackageContext } from './defs.js';

async function getVersions(packageName: string, acceptString: string) {
  try {
    const { stdout } = await $`npm show ${packageName} time --json`;

    const result = JSON.parse(stdout);

    const versions = Object.keys(result)
      .filter(k => k !== 'modified' && k !== 'created')
      .filter(k => semver.satisfies(k, acceptString))
      .sort((a, b) => (result[a] > result[b] ? -1 : 1));

    return versions;
  } catch {} // eslint-disable-line no-empty

  return [];
}

export default async function scan(ctx: PackageContext) {
  if (ctx.libData.accept) {
    const versions = await getVersions(ctx.libData.npmName, ctx.libData.accept);

    const auth = {
      user: 'x-oauth',
      token: process.env.GITHUB_TOKEN,
    };

    for (const version of versions) {
      const tag = `${ctx.input.isPreview ? 'preview-' : ''}${ctx.normalizedName}-${version}-prebuild.1`;

      try {
        await gh.getByTagAsync(auth, GITHUB_ORG, GITHUB_REPO, tag);
      } catch {
        await gh.createAsync(auth, GITHUB_ORG, GITHUB_REPO, { tag_name: tag, prerelease: true });
      }
    }
  }
}

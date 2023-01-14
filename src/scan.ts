/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import 'zx/globals';

import semver from 'semver';

import { GITHUB_ORG, GITHUB_REPO } from './defs.js';
import { gh } from './utils.js';

import type { PackageContext } from './defs.js';

async function getNewBuildVersion(packageName: string, baseVersion: string) {
  try {
    const { stdout } = await $`npm show ${packageName} time --json`;

    const result = JSON.parse(stdout);

    const versions = Object.keys(result)
      .filter(k => k !== 'modified' && k !== 'created')
      .filter(k => new RegExp(`^${baseVersion}-prebuild\\.\\d+$`).test(k))
      .sort((a, b) => (result[a] > result[b] ? -1 : 1));

    if (versions.length > 0) {
      return Number(versions[0].substring(baseVersion.length + '-prebuild.'.length)) + 1;
    }
  } catch {} // eslint-disable-line no-empty

  return 1;
}

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
      if (process.env.FORCE_CREATE_RELEASE !== 'true') {
        const tag = `${ctx.input.isPreview ? 'preview-' : ''}${ctx.normalizedName}-${version}-prebuild.1`;

        try {
          await gh.getByTagAsync(auth, GITHUB_ORG, GITHUB_REPO, tag);
        } catch {
          if (process.env.DRY_RUN === 'false') {
            await gh.createAsync(auth, GITHUB_ORG, GITHUB_REPO, { tag_name: tag });
          } else {
            echo('release', tag, 'will be created');
          }
        }
      } else {
        const newBuildVersion = await getNewBuildVersion(ctx.libData.npmName, version);
        const tag = `${ctx.input.isPreview ? 'preview-' : ''}${ctx.normalizedName}-${version}-prebuild.${newBuildVersion}`;

        if (process.env.DRY_RUN === 'false') {
          await gh.createAsync(auth, GITHUB_ORG, GITHUB_REPO, { tag_name: tag });
        } else {
          echo('release', tag, 'will be created');
        }
      }
    }
  }
}

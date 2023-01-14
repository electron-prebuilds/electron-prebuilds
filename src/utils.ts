/* eslint-disable @typescript-eslint/no-unsafe-call */

import util from 'util';
import gh from 'ghreleases';

gh.createAsync = util.promisify(gh.create.bind(gh));
gh.uploadAssetsAsync = util.promisify(gh.uploadAssets.bind(gh));
gh.getByTagAsync = util.promisify(gh.getByTag.bind(gh));

export { gh };

export const ghAuth = {
  user: 'x-oauth',
  token: process.env.GITHUB_TOKEN,
};

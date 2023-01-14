import 'zx/globals';

import type { PackageContext } from './defs';

export default async function publish(ctx: PackageContext) {
  cd(ctx.path);

  const configFileContent = [
    `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`,
    `//registry.yarnpkg.com/:_authToken=${process.env.NPM_TOKEN}`,
  ];

  await fs.appendFile(
    path.join(ctx.path, '.npmrc'),
    configFileContent.join('\n'),
    { encoding: 'utf-8' },
  );

  if (process.env.DRY_RUN === 'false') {
    await $`npm publish --access public`;
  } else {
    await $`npm publish --access public --dry-run`;
  }
}

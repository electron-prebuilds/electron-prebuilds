import 'zx/globals';

import { PackageContext } from './defs.js';

let ctx: PackageContext;

if (process.env.RELEASE_TAG) {
  ctx = PackageContext.fromReleaseTag(process.env.RELEASE_TAG);
} else {
  if (!process.env.PACKAGE_NAME || !process.env.PACKAGE_VERSION) {
    throw new Error('PACKAGE_NAME or PACKAGE_VERSION is undefined');
  }

  ctx = new PackageContext({
    name: process.env.PACKAGE_NAME,
    version: process.env.PACKAGE_VERSION,
    isPreview: process.env.PREVIEW !== 'false',
  });
}

async function main() {
  const pipeline: string[] = process.env.PIPELINE?.split(',') || [];

  const fns: Function[] = (await Promise.all(pipeline.map(n => import(`./${n}.js`)))).map(({ default: fn }) => fn);
  for (const fn of fns) {
    // eslint-disable-next-line no-await-in-loop
    await fn(ctx);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import 'zx/globals';

import { PackageContext } from './defs.js';

import type { PackageInput } from './defs.js';

process.env.FORCE_COLOR = '3';
if (!process.env.PACKAGE_NAME || !process.env.PACKAGE_VERSION) {
  throw new Error('PACKAGE_NAME or PACKAGE_VERSION is undefined');
}

const input: PackageInput = {
  name: process.env.PACKAGE_NAME,
  version: process.env.PACKAGE_VERSION,
};

const ctx = new PackageContext(input);

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

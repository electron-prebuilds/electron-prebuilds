import 'zx/globals';

import type { PackageContext, PackageInput } from 'defs';

process.env.FORCE_COLOR = '3';
if (!process.env.PACKAGE_NAME || !process.env.PACKAGE_VERSION) {
  throw new Error('PACKAGE_NAME or PACKAGE_VERSION is undefined');
}

const input: PackageInput = {
  name: process.env.PACKAGE_NAME,
  version: process.env.PACKAGE_VERSION,
};

const ctx: PackageContext = {
  input,
  name: input.name.replace(/@/g, '').replace(/\//g, '-'),
  nameWithVersion: `${input.name}-${input.version}`.replace(/@/g, '').replace(/\//g, '-'),
  path: path.join(process.cwd(), 'package'),
  isNan: false,
};

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

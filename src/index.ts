import 'zx/globals';

import type { LibData } from './defs.js';

process.env.FORCE_COLOR = '3';
if (!process.env.LIB_NAME) {
  throw new Error('LIB_NAME must be set');
}

async function findLibData(libName: string) {
  const data: LibData[] = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data.json'), 'utf-8'));

  for (const libData of data) {
    if (!libName.includes('/') && libData.source.endsWith(`/${libName}`)) return libData;
  }

  throw new Error('Library not found');
}

async function main() {
  const libData = await findLibData(process.env.LIB_NAME!);
  libData.name = libData.source.split('/').at(-1)!;
  if (libData.name.endsWith('.git')) {
    libData.name = libData.name.slice(0, -4);
  }

  if (!libData.source.startsWith('http') || !libData.source.startsWith('git@')) {
    libData.source = `https://github.com/${libData.source}`;
  }

  libData.targetPath = path.join(process.cwd(), 'downloaded-lib');

  const pipeline: string[] = [];
  if (process.env.PIPELINE === 'clone-build') {
    pipeline.push('deps-installer');
    pipeline.push('clone');
    pipeline.push('patch');
    pipeline.push('build');
  } else if (process.env.PIPELINE === 'clone') {
    pipeline.push('clone');
    pipeline.push('patch');
  }

  const fns: Function[] = (await Promise.all(pipeline.map(n => import(`./${n}.js`)))).map(({ default: fn }) => fn);
  for (const fn of fns) {
    // eslint-disable-next-line no-await-in-loop
    await fn(libData);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

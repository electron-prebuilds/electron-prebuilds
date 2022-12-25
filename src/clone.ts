import 'zx/globals';

import type { LibData } from './defs';

export default async function clone(libData: LibData) {
  const { source, ref } = libData;

  await fs.mkdir(libData.targetPath, { recursive: true });
  await fs.remove(libData.targetPath);
  await fs.mkdir(libData.targetPath, { recursive: true });

  cd(libData.targetPath);

  await $`git init`;
  await $`git remote add origin ${source}`;
  await $`git fetch origin --depth=1 ${ref}`;
  await $`git reset --hard FETCH_HEAD`;
  await $`git submodule update --init --recursive --depth=1`;
}

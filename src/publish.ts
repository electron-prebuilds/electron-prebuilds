import 'zx/globals';

import type { LibData } from './defs.js';

export default async function publish(libData: LibData) {
  cd(libData.targetPath);

  await $`ls prebuilds`;

  await $`npm publish --access public`;
}

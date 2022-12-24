const util = require('util');

const rimraf = util.promisify(require('rimraf'));

export default async function clone(libData) {
    let { source, ref } = libData;

    await fs.mkdir(libData.targetPath, { recursive: true });
    await rimraf(libData.targetPath);
    await fs.mkdir(libData.targetPath, { recursive: true });

    cd(libData.targetPath);

    await $`git init`;
    await $`git remote add origin ${source}`;
    await $`git fetch origin --depth=1 ${ref}`;
    await $`git reset --hard FETCH_HEAD`;
    await $`git submodule update --init --recursive --depth=1`;
}

const util = require('util');

const rimraf = util.promisify(require('rimraf'));

export default async function clone(libData) {
    let { source, commit } = libData;

    let name = source.split('/').at(-1);
    if (name.endsWith('.git')) {
        name = name.slice(0, -4);
    }

    if (!source.startsWith('http') || !source.startsWith('git@')) {
        source = `https://github.com/${source}`;
    }

    libData.targetPath = path.join(process.cwd(), 'libs', name);

    await fs.mkdir(libData.targetPath, { recursive: true });
    await rimraf(libData.targetPath);
    await fs.mkdir(libData.targetPath, { recursive: true });

    cd(libData.targetPath);

    await $`git init`;
    await $`git remote add origin ${source}`;
    await $`git fetch origin --depth=1 ${commit}`;
    await $`git reset --hard FETCH_HEAD`;
    await $`git submodule update --init --recursive --depth=1`;
}

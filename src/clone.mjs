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

    const targetPath = path.join(process.cwd(), 'libs', name);

    await fs.mkdir(targetPath, { recursive: true });
    await rimraf(targetPath);
    await fs.mkdir(targetPath, { recursive: true });

    cd(targetPath);
    await $`git init`;
    await $`git remote add origin ${source}`;
    await $`git fetch origin --depth=1 ${commit}`;
    await $`git reset --hard FETCH_HEAD`;
    await $`git submodule update --init --recursive --depth=1`;
    cd(process.cwd());

    return { targetPath };
}

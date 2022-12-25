function findLibData(libName) {
    const data = require(path.join(process.cwd(), 'data.json'));
    for (const libData of data) {
        if (!libName.includes('/') && libData.source.endsWith(`/${libName}`)) return libData;
    }

    throw new Error('Library not found');
}

if (!process.env.LIB_NAME) {
    throw new Error('LIB_NAME must be set');
}

const libData = findLibData(process.env.LIB_NAME);
libData.name = libData.source.split('/').at(-1);
if (libData.name.endsWith('.git')) {
    libData.name = libData.name.slice(0, -4);
}

if (!libData.source.startsWith('http') || !libData.source.startsWith('git@')) {
    libData.source = `https://github.com/${libData.source}`;
}

libData.targetPath = path.join(process.cwd(), 'downloaded-lib');

const pipeline = [];
if (process.env.PIPELINE === 'clone-build') {
    pipeline.push('deps-installer');
    pipeline.push('clone');
    pipeline.push('patch');
    pipeline.push('build');
} else if (process.env.PIPELINE === 'clone') {
    pipeline.push('clone');
    pipeline.push('patch');
} else if (process.env.PIPELINE === 'publish') {
    pipeline.push('publish');
}

const fns = (await Promise.all(pipeline.map(n => import(`./${n}.mjs`)))).map(({ default: fn }) => fn);
for (const fn of fns) {
    await fn(libData);
}

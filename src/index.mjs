if (!process.env.LIB_SOURCE || !process.env.LIB_REF) {
    throw new Error('LIB_SOURCE and LIB_REF must be set');
}

const libData = {
    source: process.env.LIB_SOURCE,
    ref: process.env.LIB_REF,
};

libData.name = libData.source.split('/').at(-1);
if (libData.name.endsWith('.git')) {
    libData.name = libData.name.slice(0, -4);
}

if (!libData.source.startsWith('http') || !libData.source.startsWith('git@')) {
    libData.source = `https://github.com/${libData.source}`;
}

libData.targetPath = path.join(process.cwd(), 'libs', libData.name);

let pipeline = process.env.LIB_PUBLISH ? ['publish'] : [
    'deps-installer',
    'clone',
    'patch',
    'build',
];

const fns = (await Promise.all(pipeline.map(n => import(`./${n}.mjs`)))).map(({ default: fn }) => fn);
for (const fn of fns) {
    await fn(libData);
}

// const data = require(path.join(process.cwd(), 'data.json'));
// for (const libData of data) {
//     for (const fn of fns) {
//         await fn(libData);
//     }
// }

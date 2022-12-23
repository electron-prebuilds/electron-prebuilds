if (!process.env.LIB_SOURCE || !process.env.LIB_REF) {
    throw new Error('LIB_SOURCE and LIB_REF must be set');
}

const libData = {
    source: process.env.LIB_SOURCE,
    ref: process.env.LIB_REF,
};

const pipeline = [
    'deps-installer',
    'clone',
    'patch',
    'build',
    'publish',
]

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

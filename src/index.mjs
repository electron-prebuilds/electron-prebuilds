process.env.COLOR = true;

const pipeline = [
    'deps-installer',
    'clone',
    'patch',
    'build',
    'publish',
]

const fns = (await Promise.all(pipeline.map(n => import(`./${n}.mjs`)))).map(({ default: fn }) => fn);

const data = require(path.join(process.cwd(), 'data.json'));
for (const libData of data) {
    for (const fn of fns) {
        await fn(libData);
    }
}

process.env.COLOR = true;

const { default: depsInstaller } = await import('./deps-installer.mjs');
const { default: clone } = await import('./clone.mjs');
const { default: patch } = await import('./patch.mjs');
const { default: build } = await import('./build.mjs');

const data = require(path.join(process.cwd(), 'data.json'));

for (const libData of data) {
    await depsInstaller(libData);
    const { targetPath } = await clone(libData);
    const { isNAN } = await patch(targetPath, libData);
    await build(targetPath, libData, isNAN);
}

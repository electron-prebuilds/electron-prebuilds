const ARCHS = process.platform === 'win32' ? ['x64'] : ['x64', 'arm64'];

const NODE_VERSIONS = ['14.0.0', '16.0.0', '17.0.1', '18.0.0'];
const ELECTRON_VERSIONS = ['18.0.0', '19.0.0', '20.0.0', '21.0.0', '22.0.0'];

export default async function build(libData) {
    cd(libData.targetPath);

    for (const arch of ARCHS) {
        if (!libData.isNAN) {
            await $`npx prebuildify --strip --arch=${arch} --napi`;
        } else {
            await $`npx prebuildify --strip --arch=${arch} ${NODE_VERSIONS.map(v => ['-t', `node@${v}`]).flat()} ${ELECTRON_VERSIONS.map(v => ['-t', `electron@${v}`]).flat()}`;
        }
    }

    await $`ls prebuilds`;
}

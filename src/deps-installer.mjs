export default async function depsInstaller(libData) {
    if (libData.deps) {
        if (libData.deps['linux'] && process.platform === 'linux') {
            await $`sudo apt-get install -yyq ${libData.deps['linux']}`;
        }
    }
}

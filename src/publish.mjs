export default async function publish(libData) {
    let { source } = libData;
    let name = source.split('/').at(-1);
    if (name.endsWith('.git')) {
        name = name.slice(0, -4);
    }

    const targetPath = path.join(process.cwd(), 'libs', name);
    cd(targetPath);

    await $`npm publish --access public --dry-run`;
}

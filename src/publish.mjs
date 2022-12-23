export default async function publish(libData) {
    libData.targetPath = path.join(process.cwd(), 'libs', name);
    cd(libData.targetPath);

    await $`npm publish --access public --dry-run`;
}

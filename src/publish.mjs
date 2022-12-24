export default async function publish(libData) {
    cd(libData.targetPath);

    await $`npm publish --access public --dry-run`;
}

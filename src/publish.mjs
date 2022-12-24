export default async function publish(libData) {
    cd(libData.targetPath);

    await $`ls prebuilds`;

    await $`npm publish --access public --dry-run`;
}

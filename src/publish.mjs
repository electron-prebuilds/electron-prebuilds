export default async function patch(libData) {
    await $`npm publish --access public --dry-run`;
}

const NAN_PACKAGE = '@electron-prebuilds/nan';

export default async function patch(targetPath, libData) {
    cd(targetPath);

    let isNAN = false;

    const packageJSONPath = path.join(targetPath, 'package.json');
    const packageJSON = require(packageJSONPath);

    const newPackageName = packageJSON['name'].split('/').at(-1);
    packageJSON['name'] = `@electron-prebuilds/${newPackageName}`;

    if (packageJSON['dependencies']) {
        for (const key in packageJSON['dependencies']) {
            if (key === 'nan') {
                isNAN = true;

                packageJSON['dependencies'][NAN_PACKAGE] = packageJSON['dependencies']['nan'];
                delete packageJSON['dependencies']['nan'];
            }
        }
    }

    if (isNAN) {
        const gypfilePath = path.join(targetPath, 'binding.gyp');
        let gypfile = await fs.readFile(gypfilePath, 'utf8');

        gypfile = gypfile.replace(/require\('nan'\)/g, `require('${NAN_PACKAGE}')`);
        gypfile = gypfile.replace(/require\("nan"\)/g, `require("${NAN_PACKAGE}")`);

        await fs.writeFile(gypfilePath, gypfile);
    }

    delete packageJSON['scripts'];
    delete packageJSON['binary'];

    await fs.writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 4));
    echo('package.json patched');

    if (await fs.pathExists(path.join(targetPath, 'yarn.lock'))) {
        echo('yarn will be used');
        await $`yarn install --ignore-scripts`;
    } else {
        echo('npm will be used');
        await $`npm install --ignore-scripts`;
    }

    const gitignorePath = path.join(targetPath, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
        const gitignore = await fs.readFile(gitignorePath, 'utf8');
        let gitignoreResult = '';

        for (let line of gitignore.split('\n')) {
            line = line.trim();

            if (line.includes('prebuilds')) continue;

            gitignoreResult += `${line}\n`;
        }

        await fs.writeFile(gitignorePath, gitignoreResult);
    }

    await $`git status`;

    echo('patch finished');
    cd(process.cwd());

    return {
        isNAN,
    }
}

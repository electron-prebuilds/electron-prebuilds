const NAN_PACKAGE = '@electron-prebuilds/nan';
const BINDINGS_PACKAGE = '@electron-prebuilds/bindings-test';
const BINDINGS_VERSION = '*';

const readdirp = require('readdirp');

async function patchIgnoreFile(targetPath) {
    if (await fs.pathExists(targetPath)) {
        const inputData = await fs.readFile(targetPath, 'utf8');
        let output = '';

        for (let line of inputData.split('\n')) {
            line = line.trim();

            if (line.includes('prebuilds')) continue;

            output += `${line}\n`;
        }

        await fs.writeFile(targetPath, output);
    }
}

async function replaceBindingsImport(targetPath) {
    for await (const entry of readdirp(targetPath, { fileFilter: '*.*js' })) {
        let fileContent = await fs.readFile(entry.fullPath, 'utf-8');

        if (fileContent.includes(`require('bindings')`) || fileContent.includes(`require("bindings")`)) {
            fileContent = fileContent.replace(/require\('bindings'\)/g, `require('${BINDINGS_PACKAGE}')`);
            fileContent = fileContent.replace(/require\("bindings"\)/g, `require('${BINDINGS_PACKAGE}')`);

            await fs.writeFile(entry.fullPath, fileContent);
        }
    }
}

export default async function patch(libData) {
    libData.isNAN = false;

    const packageJSONPath = path.join(libData.targetPath, 'package.json');
    const packageJSON = require(packageJSONPath);

    libData.newPackageName = packageJSON['name'].split('/').at(-1);
    packageJSON['name'] = `@electron-prebuilds/${libData.newPackageName}`;

    delete packageJSON['binary'];

    const { dependencies } = packageJSON;
    if (dependencies['nan']) {
        dependencies[NAN_PACKAGE] = dependencies['nan'];
        delete dependencies['nan'];

        libData.isNAN = true;
    }
    if (dependencies['bindings']) {
        dependencies[BINDINGS_PACKAGE] = BINDINGS_VERSION;
        delete dependencies['bindings'];

        await replaceBindingsImport(libData.targetPath);
    }
    delete dependencies['prebuild-install'];

    packageJSON['files'] = packageJSON['files'] || [];
    packageJSON['files'].push('prebuilds/**');

    packageJSON['scripts'] = {
        install: 'node-gyp-build'
    };

    await fs.writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 4));
    echo('package.json patched');

    if (libData.isNAN) {
        const gypfilePath = path.join(libData.targetPath, 'binding.gyp');
        let gypfile = await fs.readFile(gypfilePath, 'utf8');

        gypfile = gypfile.replace(/require\('nan'\)/g, `require('${NAN_PACKAGE}')`);
        gypfile = gypfile.replace(/require\("nan"\)/g, `require("${NAN_PACKAGE}")`);

        await fs.writeFile(gypfilePath, gypfile);
    }

    if (await fs.pathExists(path.join(libData.targetPath, 'yarn.lock'))) {
        echo('yarn will be used');
        await $`yarn install --ignore-scripts`;
    } else {
        echo('npm will be used');
        await $`npm install --ignore-scripts`;
    }

    await patchIgnoreFile(path.join(libData.targetPath, '.gitignore'))
    await patchIgnoreFile(path.join(libData.targetPath, '.npmignore'))

    await $`git status`;

    echo('patch finished');
}

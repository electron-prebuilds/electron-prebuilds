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

async function getNewBuildVersion(packageName, baseVersion) {
    try {
        const { stdout } = await $`npm show ${packageName} time --json`;

        const result = JSON.parse(stdout);

        const versions = Object.keys(result)
            .filter(k => k !== 'modified' && k !== 'created')
            .filter(k => k.includes('-prebuild.'))
            .sort((a, b) => result[a] > result[b] ? -1 : 1);

        const searchText = `${baseVersion}-prebuild.`;
        for (const version of versions) {
            if (version.startsWith(searchText)) return Number(version.substring(searchText.length + 1)) + 1;
        }
    } catch {}

    return 0;
}

export default async function patch(libData) {
    libData.isNAN = false;

    const packageJSONPath = path.join(libData.targetPath, 'package.json');
    const packageJSON = require(packageJSONPath);

    const newPackageName = packageJSON['name'].split('/').at(-1);
    packageJSON['name'] = `@electron-prebuilds/${newPackageName}`;

    const buildVersion = await getNewBuildVersion(packageJSON['name'], packageJSON['version']);
    packageJSON['version'] = `${packageJSON['version']}-prebuild.${buildVersion}`;
    console.log('decided version', packageJSON['version']);

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

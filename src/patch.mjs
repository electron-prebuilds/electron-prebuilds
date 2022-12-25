const readdirp = require('readdirp');

const NAN_PACKAGE = '@electron-prebuilds/nan';
const BINDINGS_PACKAGE = '@electron-prebuilds/bindings-test';
const BINDINGS_VERSION = '*';

const NODE_GYP_BUILD_VERSION = '4.5.0';

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

async function patchBindingsRequire(libData) {
    for await (const entry of readdirp(libData.targetPath, { fileFilter: '*.*js' })) {
        let fileContent = await fs.readFile(entry.fullPath, 'utf-8');

        if (fileContent.includes(`require('bindings')`) || fileContent.includes(`require("bindings")`)) {
            fileContent = fileContent.replace(/require\('bindings'\)/g, `require('${BINDINGS_PACKAGE}')`);
            fileContent = fileContent.replace(/require\("bindings"\)/g, `require('${BINDINGS_PACKAGE}')`);

            await fs.writeFile(entry.fullPath, fileContent);
        }
    }
}

async function patchPackageJSON(libData) {
    const packageJSONPath = path.join(libData.targetPath, 'package.json');
    const packageJSON = require(packageJSONPath);

    packageJSON['name'] = `@electron-prebuilds/${libData.name}-test`;

    const buildVersion = await getNewBuildVersion(packageJSON['name'], packageJSON['version']);
    packageJSON['version'] = `${packageJSON['version']}-prebuild.${buildVersion}`;
    console.log('decided version', packageJSON['version']);

    const { dependencies } = packageJSON;
    if (dependencies['nan']) {
        dependencies[NAN_PACKAGE] = dependencies['nan'];
        delete dependencies['nan'];
    }
    if (dependencies['bindings']) {
        dependencies[BINDINGS_PACKAGE] = BINDINGS_VERSION;
        delete dependencies['bindings'];
    }
    dependencies['node-gyp-build'] = dependencies['node-gyp-build'] || NODE_GYP_BUILD_VERSION;
    delete dependencies['prebuild-install'];

    packageJSON['files'] = packageJSON['files'] || [];
    packageJSON['files'].push('prebuilds/**');

    packageJSON['scripts'] = {
        install: 'node-gyp-build'
    };

    await fs.writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 4));
}

async function patchGypFile(libData) {
    if (libData.nan) {
        const gypfilePath = path.join(libData.targetPath, 'binding.gyp');
        let gypfile = await fs.readFile(gypfilePath, 'utf8');

        gypfile = gypfile.replace(/require\('nan'\)/g, `require('${NAN_PACKAGE}')`);
        gypfile = gypfile.replace(/require\("nan"\)/g, `require("${NAN_PACKAGE}")`);
        gypfile = gypfile.replace(/require\(`nan`\)/g, `require(\`${NAN_PACKAGE}\`)`);

        await fs.writeFile(gypfilePath, gypfile);
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
    cd(libData.targetPath);

    await patchPackageJSON(libData);
    await patchBindingsRequire(libData);
    await patchGypFile(libData);

    await patchIgnoreFile(path.join(libData.targetPath, '.gitignore'))
    await patchIgnoreFile(path.join(libData.targetPath, '.npmignore'))

    if (await fs.pathExists(path.join(process.cwd(), `patches/${libData.name}`))) {
        await $`git apply ../../patches/${libData.name}/*.patch`;
    }

    echo('patch finished');
}

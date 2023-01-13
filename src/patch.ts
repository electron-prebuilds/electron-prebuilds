import 'zx/globals';

import gypParser from 'gyp-parser';
import readdirp from 'readdirp';

import type { PackageJson } from 'type-fest';

import type { PackageContext } from './defs.js';

export const NAN_PACKAGE = '@electron-prebuilds/nan-test';
export const BINDINGS_PACKAGE = '@electron-prebuilds/bindings-test';
export const BINDINGS_VERSION = '*';

export const NODE_GYP_BUILD_VERSION = '4.5.0';

const getPrebuildRequire = (basePath: string) => `(function() {
  if (process.__ep_webpack) {
    return require('${basePath}' + process.__ep_prebuild);
  } else {
    const nodeAbi = require('node-abi');
    const platform = process.versions.electron ? 'electron' : 'node';
    const abiVersion = nodeAbi.getAbi(process.versions.electron || process.version, platform);
    const arch = process.platform === 'darwin' ? 'darwin-x64+arm64' : (process.platform + '-' + process.arch);

    return require('${basePath}' + arch + '/' + platform + '.abi' +  abiVersion + '.node');
  }
})()`;

async function patchBindingsRequire(ctx: PackageContext) {
  for await (const entry of readdirp(ctx.path, { fileFilter: '*.*js' })) {
    let fileContent = await fs.readFile(entry.fullPath, 'utf-8');

    const relativePath = path.relative(ctx.path, entry.fullPath);
    const depth = relativePath.split(path.sep).length - 1;
    const baseImportPath = `${'../'.repeat(depth)}prebuilds/`;

    fileContent = fileContent.replace(/require\(["'`]bindings["'`]\)\(.*?\)/g, getPrebuildRequire(baseImportPath));
    fileContent = fileContent.replace(/require\(["'`]\.\/bindings\.node["'`]\)/g, getPrebuildRequire(baseImportPath));
    fileContent = fileContent.replace(/require\(["'`].*?\.\/build\/.*?\.node["'`]\)/g, getPrebuildRequire(baseImportPath));

    await fs.writeFile(entry.fullPath, fileContent);
  }
}

async function getNewBuildVersion(packageName: string, baseVersion: string) {
  try {
    const { stdout } = await $`npm show ${packageName} time --json`;

    const result = JSON.parse(stdout);

    const versions = Object.keys(result)
      .filter(k => k !== 'modified' && k !== 'created')
      .filter(k => k.includes('-prebuild.'))
      .sort((a, b) => (result[a] > result[b] ? -1 : 1));

    const searchText = `${baseVersion}-prebuild.`;
    for (const version of versions) {
      if (version.startsWith(searchText)) return Number(version.substring(searchText.length + 1)) + 1;
    }
  } catch {} // eslint-disable-line no-empty

  return 0;
}

async function patchPackageJSON(ctx: PackageContext) {
  const packageJSONPath = path.join(ctx.path, 'package.json');
  const packageJSON: PackageJson = JSON.parse(await fs.readFile(packageJSONPath, 'utf-8'));

  packageJSON.name = `@electron-prebuilds-preview/${ctx.input.name}-test`;

  const buildVersion = await getNewBuildVersion(packageJSON.name, packageJSON.version);
  packageJSON.version = `${packageJSON.version}-prebuild.${buildVersion}`;
  console.log('decided version', packageJSON.version);

  const { dependencies } = packageJSON;
  dependencies['node-abi'] = dependencies['node-abi'] || '*';

  if (dependencies.nan) {
    ctx.isNan = true;
  } else {
    ctx.isNan = false;
  }

  await fs.writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 4));
}

async function patchGypFile(ctx: PackageContext) {
  const gypfilePath = path.join(ctx.path, 'binding.gyp');
  const gypfile = gypParser.parse(await fs.readFile(gypfilePath, 'utf-8'));

  const { targets } = gypfile;

  for (const target of targets) {
    target.conditions = target.conditions || [] as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    target.conditions.push(
      ['OS=="mac"', {
        xcode_settings: {
          OTHER_CFLAGS: [
            '-arch x86_64',
            '-arch arm64',
          ],
          OTHER_LDFLAGS: [
            '-arch x86_64',
            '-arch arm64',
          ],
        },
      }],
    );
  }

  const output = JSON.stringify(gypfile, null, 4);
  await fs.writeFile(gypfilePath, output);
}

export default async function patch(ctx: PackageContext) {
  cd(ctx.path);

  for await (const entry of readdirp('../patches', { fileFilter: `${ctx.name}-*.patch` })) {
    await $`patch -p1 < ${entry.fullPath}`;
  }

  await patchPackageJSON(ctx);
  await patchBindingsRequire(ctx);
  await patchGypFile(ctx);

  echo('patch finished');
}

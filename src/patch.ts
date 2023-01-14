/* eslint-disable @typescript-eslint/no-unsafe-call */
import 'zx/globals';

import gypParser from 'gyp-parser';
import readdirp from 'readdirp';

import { NAN_PACKAGE, NODE_ABI_VERSION, NODE_GYP_VERSION, PREBUILD_INSTALL_VERSION } from './defs.js';

import type { PackageJson } from 'type-fest';

import type { PackageContext } from './defs.js';

const getAbiPrebuildRequire = (basePath: string) => `(function() {
  if (process.__ep_webpack) {
    return require('${basePath}' + process.__ep_prebuild_abi);
  } else {
    const nodeAbi = require('node-abi');
    const platform = process.versions.electron ? 'electron' : 'node';
    const abiVersion = nodeAbi.getAbi(process.versions.electron || process.version, platform);
    const arch = process.platform === 'darwin' ? 'darwin-x64+arm64' : (process.platform + '-' + process.arch);

    return require('${basePath}' + arch + '/' + platform + '.abi' +  abiVersion + '.node');
  }
})()`;

const getNapiPrebuildRequire = (basePath: string) => `(function() {
  if (process.__ep_webpack) {
    return require('${basePath}' + process.__ep_prebuild_napi);
  } else {
    const arch = process.platform === 'darwin' ? 'darwin-x64+arm64' : (process.platform + '-' + process.arch);

    return require('${basePath}' + arch + '/node.napi.node');
  }
})()`;

async function patchBindingsRequire(ctx: PackageContext) {
  for await (const entry of readdirp(ctx.path, { fileFilter: '*.*js' })) {
    let fileContent = await fs.readFile(entry.fullPath, 'utf-8');

    const relativePath = path.relative(ctx.path, entry.fullPath);
    const depth = relativePath.split(path.sep).length - 1;
    const baseImportPath = `${'../'.repeat(depth)}prebuilds/`;

    const newRequire = ctx.isNan ? getAbiPrebuildRequire(baseImportPath) : getNapiPrebuildRequire(baseImportPath);

    fileContent = fileContent.replace(/require\(["'`]bindings["'`]\)\(.*?\)/g, newRequire);
    fileContent = fileContent.replace(/require\(["'`]\.\/bindings\.node["'`]\)/g, newRequire);
    fileContent = fileContent.replace(/require\(["'`].*?\.\/build\/.*?\.node["'`]\)/g, newRequire);

    await fs.writeFile(entry.fullPath, fileContent);
  }
}

async function getNewBuildVersion(packageName: string, baseVersion: string) {
  try {
    const { stdout } = await $`npm show ${packageName} time --json`;

    const result = JSON.parse(stdout);

    const versions = Object.keys(result)
      .filter(k => k !== 'modified' && k !== 'created')
      .filter(k => new RegExp(`^${baseVersion}-prebuild\\.\\d+$`).test(k))
      .sort((a, b) => (result[a] > result[b] ? -1 : 1));

    if (versions.length > 0) {
      return Number(versions[0].substring(baseVersion.length + '-prebuild.'.length)) + 1;
    }
  } catch {} // eslint-disable-line no-empty

  return 1;
}

async function patchPackageJSON(ctx: PackageContext) {
  const packageJSONPath = path.join(ctx.path, 'package.json');
  const packageJSON: PackageJson = JSON.parse(await fs.readFile(packageJSONPath, 'utf-8'));

  packageJSON.name = ctx.newNpmName;

  const buildVersion = await getNewBuildVersion(packageJSON.name, packageJSON.version);
  packageJSON.version = `${packageJSON.version}-prebuild.${buildVersion}`;
  console.log('decided version', packageJSON.version);

  ctx.newVersion = packageJSON.version;

  const { dependencies, devDependencies } = packageJSON;
  devDependencies['node-gyp'] = NODE_GYP_VERSION;

  dependencies['node-abi'] = dependencies['node-abi'] || NODE_ABI_VERSION;
  dependencies['prebuild-install'] = dependencies['prebuild-install'] || PREBUILD_INSTALL_VERSION;

  if (dependencies.nan) {
    ctx.isNan = true;

    if (dependencies.nan.startsWith('^') || dependencies.nan.startsWith('~')) {
      dependencies.nan = dependencies.nan.slice(1);
    }

    dependencies.nan = `npm:${NAN_PACKAGE}@~${ctx.libData.nanVersion || dependencies.nan}-prebuild`;
  }

  packageJSON.repository = {
    type: 'git',
    url: 'git://github.com/electron-prebuilds/electron-prebuilds.git',
  };

  packageJSON.scripts = {
    install: 'prebuild-install',
    rebuild: 'npm run install',
  };

  packageJSON.binary = packageJSON.binary || {};
  packageJSON.binary = {
    host: 'https://github.com/electron-prebuilds/electron-prebuilds/releases/download/',
    remote_path: ctx.githubReleaseName,
    package_name: `${ctx.githubAssetName}-{platform}-{arch}.tgz`,
  };

  await fs.writeFile(packageJSONPath, JSON.stringify(packageJSON, null, 4));
}

async function patchGypFile(ctx: PackageContext) {
  const gypfilePath = path.join(ctx.path, 'binding.gyp');
  const gypfile = gypParser.parse(await fs.readFile(gypfilePath, 'utf-8'));

  const { targets } = gypfile;

  for (const target of targets) {
    target.conditions = target.conditions || [] as any;

    target.cflags_cc = target.cflags_cc || [];
    target.cflags_cc.push('-std=c++20');

    if (ctx.libData.universal) {
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

    target.conditions.push(
      ['OS=="mac"', {
        xcode_settings: {
          OTHER_CPLUSPLUSFLAGS: [
            '-std=c++20',
            '-stdlib=libc++',
          ],
          OTHER_LDFLAGS: [
            '-stdlib=libc++',
          ],
          MACOSX_DEPLOYMENT_TARGET: '10.7',
        },
      }],
    );

    target.conditions.push(
      ['OS=="win"', {
        msvs_settings: {
          VCCLCompilerTool: {
            AdditionalOptions: [
              '/std:c++20',
            ],
          },
          ClCompile: {
            LanguageStandard: 'stdcpp20',
          },
        },
      }],
    );
  }

  const output = JSON.stringify(gypfile, null, 4);
  await fs.writeFile(gypfilePath, output);
}

export default async function patch(ctx: PackageContext) {
  cd(ctx.path);

  for await (const entry of readdirp('../patches', { fileFilter: `${ctx.normalizedName}-*.patch` })) {
    try {
      await $`patch -p1 < ${entry.fullPath}`;
    } catch {} // eslint-disable-line no-empty
  }

  await patchPackageJSON(ctx);
  await patchBindingsRequire(ctx);
  await patchGypFile(ctx);

  echo('patch finished');
}

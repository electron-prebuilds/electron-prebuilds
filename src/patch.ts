import 'zx/globals';

import gypParser from 'gyp-parser';
import readdirp from 'readdirp';

import { NAN_PACKAGE, NODE_ABI_VERSION, NODE_GYP_VERSION, PREBUILD_INSTALL_VERSION } from './defs.js';

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
    const baseImportPath = `./${'../'.repeat(depth)}prebuilds/`;

    const newRequire = ctx.isNan ? getAbiPrebuildRequire(baseImportPath) : getNapiPrebuildRequire(baseImportPath);

    fileContent = fileContent.replace(/require\(["'`]bindings["'`]\)\(.*?\)/g, newRequire);
    fileContent = fileContent.replace(/require\(["'`]node-gyp-build["'`]\)\(.*?\)/g, newRequire);
    fileContent = fileContent.replace(/require\(["'`]\.\/bindings\.node["'`]\)/g, newRequire);
    fileContent = fileContent.replace(/require\(["'`].*?\.\/build\/.*?\.node["'`]\)/g, newRequire);

    await fs.writeFile(entry.fullPath, fileContent);
  }
}

async function patchPackageJSON(ctx: PackageContext) {
  ctx.packageJSON.name = ctx.npmName;
  ctx.packageJSON.version = ctx.npmVersion;

  const { dependencies, devDependencies } = ctx.packageJSON;
  devDependencies['node-gyp'] = NODE_GYP_VERSION;

  dependencies['node-abi'] = dependencies['node-abi'] || NODE_ABI_VERSION;
  dependencies['prebuild-install'] = dependencies['prebuild-install'] || PREBUILD_INSTALL_VERSION;

  if (dependencies.nan) {
    if (dependencies.nan.startsWith('^') || dependencies.nan.startsWith('~')) {
      dependencies.nan = dependencies.nan.slice(1);
    }

    dependencies.nan = `npm:${NAN_PACKAGE}@~${ctx.libData.nanVersion || dependencies.nan}-prebuild`;
  }

  ctx.packageJSON.repository = {
    type: 'git',
    url: 'git://github.com/electron-prebuilds/electron-prebuilds.git',
  };

  ctx.packageJSON.scripts = {
    install: 'prebuild-install',
    rebuild: 'npm run install',
  };

  ctx.packageJSON.binary = ctx.packageJSON.binary || {};
  ctx.packageJSON.binary = {
    host: 'https://github.com/electron-prebuilds/electron-prebuilds/releases/download/',
    remote_path: ctx.githubReleaseName,
    package_name: `${ctx.githubAssetPrefix}-{platform}-{arch}.tgz`,
  };

  await fs.writeFile(path.join(ctx.path, 'package.json'), JSON.stringify(ctx.packageJSON, null, 4));
}

async function patchGypFile(ctx: PackageContext) {
  const gypfilePath = path.join(ctx.path, 'binding.gyp');
  const gypfile = gypParser.parse(await fs.readFile(gypfilePath, 'utf-8'));

  const { targets } = gypfile;

  for (const target of targets) {
    target.conditions = target.conditions || [] as any;

    if (Array.isArray(target['cflags_cc!'])) {
      target['cflags_cc!'].push('-std=c++20');
    } else if (Array.isArray(target.cflags_cc)) {
      target.cflags_cc.push('-std=c++20');
    } else {
      target['cflags_cc!'] = ['-std=c++20'];
    }

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
          OTHER_CFLAGS: [
            '-std=c++20',
          ],
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
    } catch {}
  }

  await patchPackageJSON(ctx);
  await patchBindingsRequire(ctx);
  await patchGypFile(ctx);

  echo('patch finished');
}

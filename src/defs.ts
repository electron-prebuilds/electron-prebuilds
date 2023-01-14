/* eslint-disable @typescript-eslint/lines-between-class-members */

import { gh, ghAuth } from './utils.js';

import type { PackageJson } from 'type-fest';

export const GITHUB_ORG = 'electron-prebuilds';
export const GITHUB_REPO = 'electron-prebuilds';

export const NAN_PACKAGE = '@electron-prebuilds/nan';
export const NODE_GYP_VERSION = '^9.0.0';
export const PREBUILD_INSTALL_VERSION = '^7.0.0';
export const NODE_ABI_VERSION = '^3.0.0';

export const NODE_VERSIONS: string[] = ['16.0.0', '18.0.0'];
export const ELECTRON_VERSIONS: string[] = ['19.0.0', '20.0.0', '22.0.0'];

export type PackageInput = {
  readonly name: string;
  readonly isPreview: boolean;
  readonly version?: string;
  readonly prebuildNumber?: number;
};

export type LibData = {
  readonly npmName: string;
  readonly universal: boolean;
  readonly accept?: string;
  readonly test?: string;
  readonly os?: string[];
  readonly deps?: {
    readonly linux?: string[];
    readonly darwin?: string[];
  };
  readonly config?: {
    readonly nanVersion?: string;
    readonly forceNanUse?: boolean;
    readonly noCppPatch?: boolean;
  }
};

const npmShowCache = new Map<string, string>();

async function isReleaseExist(tag: string) {
  try {
    await gh.getByTagAsync(ghAuth, GITHUB_ORG, GITHUB_REPO, tag);

    return true;
  } catch {
    return false;
  }
}

export class PackageContext {
  static fromReleaseTag(tag: string) {
    if (!tag.includes('-prebuild.')) throw new Error('Release tag is broken');

    let isPreview = false;
    if (tag.startsWith('preview-')) {
      isPreview = true;
      tag = tag.slice('preview-'.length);
    }

    const [base, prebuildNumber] = tag.split('-prebuild.');
    if (Number.isNaN(Number(Number(prebuildNumber)))) throw new Error('Release tag is broken due to wrong prebuild');

    const parts = base.split('-');
    const name = parts.slice(0, -1).join('-');
    const version = parts.at(-1);

    return new PackageContext({
      name,
      version,
      prebuildNumber: Number(prebuildNumber),
      isPreview,
    });
  }

  public readonly libData: LibData;
  public packageJSON: PackageJson;

  public readonly normalizedName: string;
  public readonly npmName: string;
  public readonly githubAssetPrefix: string;
  public readonly githubReleasePrefix: string;

  public path: string = path.join(process.cwd(), 'package');

  public prebuildNumber: number = -1;

  constructor(public readonly input: PackageInput) {
    this.normalizedName = this.input.name.replace(/@/g, '').replace(/\//g, '-');
    this.npmName = `@electron-prebuilds${this.input.isPreview ? '-preview' : ''}/${this.normalizedName}`;
    this.githubAssetPrefix = `${this.normalizedName}-${this.input.version}`;
    this.githubReleasePrefix = `${this.input.isPreview ? 'preview-' : ''}${this.normalizedName}`;

    this.prebuildNumber = this.input.prebuildNumber || -1;

    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data.json'), 'utf-8'));

    this.libData = Object.assign({
      npmName: input.name,
      universal: true,
    }, data[this.normalizedName] || {});
  }

  get npmVersion() {
    if (this.prebuildNumber === -1) throw new Error('Prebuild number is not initialized');

    return `${this.input.version}-prebuild.${this.prebuildNumber}`;
  }

  get githubReleaseName() {
    return `${this.githubReleasePrefix}-${this.npmVersion}`;
  }

  get isNan() {
    if (this.libData.config?.forceNanUse === true) return true;

    if (!this.packageJSON) throw new Error('Package JSON is not initialized');

    return !!this.packageJSON.dependencies.nan;
  }

  public clone() {
    return new PackageContext(Object.assign({}, this.input));
  }

  public async init() {
    if (this.input.version && this.prebuildNumber === -1) {
      this.prebuildNumber = await this.fetchPrebuildNumber();
    }
  }

  public async initPackageJSON() {
    this.packageJSON = JSON.parse(await fs.readFile(path.join(this.path, 'package.json'), 'utf-8'));
  }

  private async fetchPrebuildNumber() {
    let lastRelease = 0;

    try {
      if (!npmShowCache.has(this.npmName)) {
        const { stdout } = await $`npm show ${this.npmName} time --json`;

        npmShowCache.set(this.npmName, stdout);
      }

      const result = JSON.parse(npmShowCache.get(this.npmName));

      const versions = Object.keys(result)
        .filter(k => k !== 'modified' && k !== 'created')
        .filter(k => new RegExp(`^${this.input.version}-prebuild\\.\\d+$`).test(k))
        .sort((a, b) => (result[a] > result[b] ? -1 : 1));

      if (versions.length > 0) {
        lastRelease = Number(versions[0].substring(this.input.version.length + '-prebuild.'.length));
      }
    } catch {} // eslint-disable-line no-empty

    for (let i = lastRelease + 1; ; i += 1) {
      const tag = `${this.githubReleasePrefix}-${this.input.version}-prebuild.${i}`;

      // eslint-disable-next-line no-await-in-loop
      if (!(await isReleaseExist(tag))) {
        return i;
      }
    }
  }
}

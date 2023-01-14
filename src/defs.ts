/* eslint-disable @typescript-eslint/lines-between-class-members */
/* eslint-disable @typescript-eslint/no-unsafe-call */

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
  readonly version?: string;
  readonly isPreview: boolean;
};

export type LibData = {
  readonly npmName: string;
  readonly universal: boolean;
  readonly accept?: string;
  readonly nanVersion?: string;
  readonly forceNanUse: boolean;
  readonly test?: string;
  readonly os?: string[];
  readonly deps?: {
    readonly linux?: string[];
    readonly darwin?: string[];
  };
};

const npmShowCache = new Map<string, string>();

export class PackageContext {
  static fromReleaseTag(tag: string) {
    if (!tag.includes('-prebuild.')) throw new Error('Release tag is broken');

    let isPreview = false;
    if (tag.startsWith('preview-')) {
      isPreview = true;
      tag = tag.slice('preview-'.length);
    }

    const parts = tag.split('-prebuild.')[0].split('-');
    const name = parts.slice(0, -1).join('-');
    const version = parts.at(-1);

    return new PackageContext({
      name,
      version,
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

  public prebuildVersion: number = -1;

  constructor(public readonly input: PackageInput) {
    this.normalizedName = this.input.name.replace(/@/g, '').replace(/\//g, '-');
    this.npmName = `@electron-prebuilds${this.input.isPreview ? '-preview' : ''}/${this.normalizedName}`;
    this.githubAssetPrefix = `${this.normalizedName}-${this.input.version}`;
    this.githubReleasePrefix = `${this.input.isPreview ? 'preview-' : ''}${this.normalizedName}`;

    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data.json'), 'utf-8'));

    this.libData = Object.assign({
      npmName: input.name,
      universal: true,
      forceNanUse: false,
    }, data[this.normalizedName] || {});
  }

  get npmVersion() {
    if (this.prebuildVersion === -1) throw new Error('Prebuild version is not initialized');

    return `${this.input.version}-prebuild.${this.prebuildVersion}`;
  }

  get githubReleaseName() {
    return `${this.githubReleasePrefix}-${this.npmVersion}`;
  }

  get isNan() {
    if (this.libData.forceNanUse === true) return true;

    if (!this.packageJSON) throw new Error('Package JSON is not initialized');

    return !!this.packageJSON.dependencies.nan;
  }

  public clone() {
    return new PackageContext(Object.assign({}, this.input));
  }

  public async init() {
    if (this.input.version) {
      this.prebuildVersion = await this.fetchPrebuildVersion();
    }
  }

  public async initPackageJSON() {
    this.packageJSON = JSON.parse(await fs.readFile(path.join(this.path, 'package.json'), 'utf-8'));
  }

  private async fetchPrebuildVersion() {
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
        return Number(versions[0].substring(this.input.version.length + '-prebuild.'.length)) + 1;
      }
    } catch {} // eslint-disable-line no-empty

    return 1;
  }
}

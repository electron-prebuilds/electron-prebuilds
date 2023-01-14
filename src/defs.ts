export const GITHUB_ORG = 'electron-prebuilds';
export const GITHUB_REPO = 'electron-prebuilds';

export const NAN_PACKAGE = '@electron-prebuilds/nan';
export const NODE_GYP_VERSION = '^9.0.0';
export const PREBUILD_INSTALL_VERSION = '^7.0.0';
export const NODE_ABI_VERSION = '^3.0.0';

export const NODE_VERSIONS: string[] = ['14.0.0', '16.0.0', '17.0.1', '18.0.0'];
export const ELECTRON_VERSIONS: string[] = ['18.0.0', '19.0.0', '20.0.0', '21.0.0', '22.0.0'];

export type PackageInput = {
  name: string;
  version?: string;
  isPreview: boolean;
};

export type LibData = {
  npmName: string;
  universal: boolean;
  accept?: string,
  nanVersion?: string;
  test?: string,
  deps?: {
    linux?: string[],
    darwin?: string[],
  };
};

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

  public path: string = path.join(process.cwd(), 'package');

  public isNan: boolean = false;

  public newVersion: string;

  public libData: LibData;

  constructor(public readonly input: PackageInput) {
    const targetPath = path.join(process.cwd(), 'data.json');
    const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));

    this.libData = Object.assign({
      npmName: input.name,
      universal: true,
    }, data[this.normalizedName] || {});
  }

  get normalizedName() {
    return this.input.name.replace(/@/g, '').replace(/\//g, '-');
  }

  get newNpmName() {
    if (this.input.isPreview) return `@electron-prebuilds-preview/${this.normalizedName}`;

    return `@electron-prebuilds/${this.normalizedName}`;
  }

  get githubAssetName() {
    return `${this.normalizedName}-${this.input.version}`;
  }

  get githubReleaseName() {
    if (this.input.isPreview) return `preview-${this.normalizedName}-${this.newVersion}`;

    return `${this.normalizedName}-${this.newVersion}`;
  }
}

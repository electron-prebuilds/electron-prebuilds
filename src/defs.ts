const IS_PREVIEW = process.env.PREVIEW !== 'false';

export interface PackageInput {
  name: string;
  version: string;
}

export interface LibData {
  universal: boolean;
  nanVersion?: string;
}

export class PackageContext {
  public path: string = path.join(process.cwd(), 'package');

  public isNan: boolean = false;

  public newVersion: string;

  public libData: LibData;

  constructor(public readonly input: PackageInput) {
    const targetPath = path.join(process.cwd(), 'data.json');
    const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));

    this.libData = Object.assign({
      universal: true,
    }, data[this.normalizedName] || {});
  }

  get npmName() {
    if (IS_PREVIEW) return `@electron-prebuilds-preview/${this.normalizedName}`;

    return `@electron-prebuilds/${this.normalizedName}`;
  }

  get normalizedName() {
    return this.input.name.replace(/@/g, '').replace(/\//g, '-');
  }

  get packageName() {
    return `${this.normalizedName}-${this.input.version}`;
  }

  get releaseName() {
    if (IS_PREVIEW) return `preview-${this.normalizedName}-${this.newVersion}`;

    return `${this.normalizedName}-${this.newVersion}`;
  }
}

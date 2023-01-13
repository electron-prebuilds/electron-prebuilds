export interface PackageInput {
  name: string;
  version: string;
}

export interface PackageContext {
  input: PackageInput;
  name: string;
  nameWithVersion: string;
  path: string;
  isNan: boolean;
}

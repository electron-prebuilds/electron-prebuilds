export interface LibData {
  name: string;
  source: string;
  targetPath: string;
  ref: string;
  nan?: boolean;
  deps?: {
    linux?: string[];
    win32?: string[];
    darwin?: string[];
  }
}

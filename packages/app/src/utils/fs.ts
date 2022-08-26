import fs from 'fs';

export function ensureDirExists(path: string): void {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}

export function ensureDirNotExists(path: string): void {
  if (fs.existsSync(path)) {
    fs.rmdirSync(path, { recursive: true });
  }
}

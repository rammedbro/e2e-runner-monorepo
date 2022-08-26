import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import type { BucketItem } from 'minio';

class MinioClientError extends Error {
  public code: string;

  constructor(code: string, message?: string) {
    super(message);

    this.code = code;
  }
}

const branches: string[] = ['master', 'release'];
const objects: BucketItem[] = [
  {
    name: 'master/chrome-desktop.zip',
    prefix: '',
    size: 0,
    etag: 'etag',
    lastModified: new Date(),
  },
  {
    name: 'master/firefox-desktop.zip',
    prefix: '',
    size: 0,
    etag: 'etag',
    lastModified: new Date(),
  },
  {
    name: 'master/safari-desktop.zip',
    prefix: '',
    size: 0,
    etag: 'etag',
    lastModified: new Date(),
  },
  {
    name: 'release/edge-desktop.zip',
    prefix: '',
    size: 0,
    etag: 'etag',
    lastModified: new Date(),
  },
  {
    name: 'release/opera-desktop.zip',
    prefix: '',
    size: 0,
    etag: 'etag',
    lastModified: new Date(),
  },
  {
    name: 'release/ie-desktop.zip',
    prefix: '',
    size: 0,
    etag: 'etag',
    lastModified: new Date(),
  }
];

export const Client = jest.fn().mockImplementation(() => ({
  listObjectsV2: jest.fn().mockImplementation(
    (bucket: string, prefix?: string) => {
      const stream = new Readable({
        read(): void {
        }
      });
      let result;

      if (prefix) {
        result = objects.filter(obj => obj.name.startsWith(prefix));
      } else {
        result = branches.map(item => ({ prefix: item }));
      }

      const promises = result.map(obj =>
        new Promise<void>(resolve =>
          setTimeout(() => {
            stream.emit('data', obj);
            resolve();
          }, 0))
      );
      Promise.all(promises).then(() => stream.emit('end'), () => {
      });

      return stream;
    }
  ),
  fGetObject: jest.fn().mockImplementation(
    async (bucket: string, objectName: string, outputPath: string) => {
      const object = objects.find(item => item.name === objectName);

      if (!object) {
        throw new MinioClientError('NotFound');
      }

      const inputPath = path.join(__dirname, '..', 'tests/resources/s3', objectName);

      fs.copyFileSync(inputPath, outputPath);
    }
  ),
  fPutObject: jest.fn().mockImplementation(
    async (workspace: string, objectName: string) => objectName
  ),
  removeObject: jest.fn().mockImplementation(
    async (workspace, objectName) => {
      const object = objects.find(item => item.name === objectName);

      if (!object) {
        throw new MinioClientError('NotFound');
      }
    }
  )
}));

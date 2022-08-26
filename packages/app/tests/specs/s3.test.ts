import fs from 'fs';
import path from 'path';
import tmp from 'tmp';

import { S3 } from '~/src/classes/s3';
import { runnerConfig } from '~/tests/utils/config';

describe('s3', () => {
  const s3 = new S3({
    ...runnerConfig,
    screenshots: {
      s3: {
        bucket: 'bucket',
        accessKey: 'accessKey',
        secretKey: 'secretKey'
      },
      gitlab: {
        projectId: 'projectId',
        token: 'token',
      }
    }
  });
  const bucket = {
    master: [
      'chrome-desktop.zip',
      'firefox-desktop.zip',
      'safari-desktop.zip'
    ],
    release: [
      'edge-desktop.zip',
      'opera-desktop.zip',
      'ie-desktop.zip'
    ]
  };

  it('should get list of all objects from branch in bucket', async () => {
    const branch = 'master';
    const objects = await s3.listObjects(branch);
    const objectsNames = objects.map(item => item.name);

    expect(objectsNames).toEqual(expect.arrayContaining(bucket[branch]));
  });

  it('should get list of objects from bucket that starts with prefix', async () => {
    const branch = 'master';
    const prefix = 'chrome-desktop.zip';
    const objects = await s3.listObjects(branch, prefix);

    expect(objects).toHaveLength(1);
    expect(objects[0].name).toEqual(bucket[branch][0]);
  });

  it('should return true when branch exists in bucket', async () => {
    const branch = 'master';
    const isBucketExist = await s3.branchExists(branch);

    expect(isBucketExist).toEqual(true);
  });

  it('should return false when branch doesnt exist in bucket', async () => {
    const branch = 'non-existent-branch';
    const isBucketExist = await s3.branchExists(branch);

    expect(isBucketExist).toEqual(false);
  });

  it('should return true when object exists in bucket', async () => {
    const branch = 'master';
    const objectName = bucket[branch][0];
    const isObjectExist = await s3.objectExists(branch, objectName);

    expect(isObjectExist).toEqual(true);
  });

  it('should return false when object doesnt exist in bucket', async () => {
    const branch = 'master';
    const objectName = 'non-existent-object';
    const isObjectExist = await s3.objectExists(branch, objectName);

    expect(isObjectExist).toEqual(false);
  });

  it('should get object from bucket and save it on given path', async () => {
    const branch = 'master';
    const objectName = 'chrome-desktop.zip';
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const outputPath = path.resolve(tmpDir.name, objectName);

    const receivedObjectName = await s3.getObject(branch, objectName, outputPath);
    expect(receivedObjectName).not.toBeNull();
    expect(fs.existsSync(outputPath)).toEqual(true);
  });

  it('should get file from given path and put it in bucket', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const branch = 'master';
    const objectName = 'chrome-desktop.zip';
    const outputPath = path.join(tmpDir.name, objectName);
    const putObjectName = await s3.putObject(branch, objectName, outputPath);

    expect(putObjectName).toEqual(objectName);
  });

  it('should remove object from bucket', async () => {
    const branch = 'master';
    const objectName = 'chrome-desktop.zip';
    const removedObjectName = await s3.removeObject(branch, objectName);

    expect(removedObjectName).toEqual(objectName);
  });

  it('should throw an error when you are trying to remove non existent object', async () => {
    await expect(s3.removeObject('master', 'non-existent-object')).rejects.toThrow('NotFound');
  });

  it('should get all objects from branch', async () => {
    const branch = 'master';
    const { name: outputPath } = tmp.dirSync({ unsafeCleanup: true });
    const expectedObjectNames = bucket[branch];
    const receivedObjectNames = await s3.getBranch(branch, outputPath);

    expect(receivedObjectNames).toEqual(expect.arrayContaining(expectedObjectNames));

    receivedObjectNames.forEach(name => {
      expect(name).not.toBeNull();

      const expectedPath = path.resolve(outputPath, name as string);
      expect(fs.existsSync(expectedPath)).toEqual(true);
    });
  });

  it('should throw an error when you are trying to get non existent branch', async () => {
    await expect(s3.getBranch('non-exist-branch', 'not-matter-path')).rejects.toThrow('not found');
  });

  it('should remove all objects from branch in bucket', async () => {
    const branch = 'release';
    const expectedObjectNames = bucket[branch];
    const removedObjectNames = await s3.removeBranch(branch);

    expect(removedObjectNames).toEqual(expect.arrayContaining(expectedObjectNames));
  });

  it('should throw an error when you are trying to remove non existent branch', async () => {
    await expect(s3.removeBranch('non-existent-branch')).rejects.toThrow('not found');
  });

  it('should return all object names resulted from merging one branch to another', async () => {
    const branchA = 'release';
    const branchB = 'master';

    const expectedObjectNames = bucket[branchA];
    const mergedObjectNames = await s3.mergeBranch(branchA, branchB);

    expect(mergedObjectNames).toEqual(expect.arrayContaining(expectedObjectNames));
  });

  it('should throw an error when you are trying to merge non existent branch to existent branch', async () => {
    await expect(s3.mergeBranch('non-existent-branch', 'master')).rejects.toThrow('not found');
  });

  it('should return link to an object in bucket', () => {
    const branch = 'release/BXFE-2023';
    const objectName = 'chrome-desktop.zip';

    const expectedObjectName = `release-bxfe-2023/${objectName}`;
    const expectedLink = `http://${s3.host}:${s3.port}/${s3.bucket}/${expectedObjectName}`;
    expect(s3.getObjectLink(branch, objectName)).toEqual(expectedLink);
  });
});

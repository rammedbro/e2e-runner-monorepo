import fs from 'fs';
import path from 'path';
import * as Minio from 'minio';
import tmp from 'tmp';
import deepmerge from 'deepmerge';
import kebabCase from 'lodash.kebabcase';
import type { IE2ERunnerConfig } from '@bx-fe/e2e-runner-types';

import { defaultScreenshotsConfig } from '~/src/configs/screenshots';
import { S3Error, ScreenshotsError } from '~/src/classes/error';
import { Runner } from '~/src/classes/runner';

interface TMinioClientError extends Error {
  code: string;
}

type TMinioClientErrorCallback = (e: TMinioClientError) => never;

export class S3 {
  public static SEPARATOR = '/';
  private static CLIENT_ERROR_CALLBACK: TMinioClientErrorCallback = e => {
    throw new S3Error(e.message || e.code);
  };

  public bucket: string;
  public host: string;
  public port: number;
  private client: Minio.Client;

  constructor(_runnerConfig: IE2ERunnerConfig | string) {
    const runnerConfig = Runner.getConfig(_runnerConfig);

    if (!runnerConfig.screenshots) {
      throw new ScreenshotsError('You need to enable screenshots module in your e2e.config file');
    }

    const config = deepmerge(defaultScreenshotsConfig, runnerConfig.screenshots);
    const { bucket, host, port, accessKey, secretKey } = config.s3;

    this.bucket = bucket;
    this.host = host || defaultScreenshotsConfig.s3.host;
    this.port = port || defaultScreenshotsConfig.s3.port;
    this.client = new Minio.Client({
      endPoint: this.host,
      port: this.port,
      accessKey,
      secretKey,
      useSSL: false,
    });
  }

  private static formatBranchName(branch: string): string {
    return kebabCase(branch);
  }

  private static formatObjectName(branch: string, fileName: string): string {
    return S3.formatBranchName(branch) + S3.SEPARATOR + fileName;
  }

  private static cleanObjectName(branch: string, fileName: string): string {
    return fileName.replace(branch + S3.SEPARATOR, '');
  }

  async branchExists(branch: string): Promise<boolean> {
    const branches = await this.listBranches();
    return branches.includes(S3.formatBranchName(branch));
  }

  async getBranch(branch: string, folderPath: string): Promise<(string | null)[]> {
    const isBranchExist = await this.branchExists(branch);

    if (!isBranchExist) {
      throw new S3Error(`Branch ${branch} not found`);
    }

    const objects = await this.listObjects(branch);
    const promises = objects.map(file =>
      this.getObject(branch, file.name, path.join(folderPath, file.name))
    );

    return Promise.all(promises);
  }

  async removeBranch(branch: string): Promise<string[]> {
    const isBranchExist = await this.branchExists(branch);

    if (!isBranchExist) {
      throw new S3Error(`Branch ${branch} not found`);
    }

    const objects = await this.listObjects(branch);
    const promises = objects.map(item =>
      this.removeObject(branch, item.name)
    );

    return Promise.all(promises);
  }

  async listBranches(): Promise<string[]> {
    const objects = await this._listObjects();
    return objects.map(item => item.prefix && item.prefix.replace(S3.SEPARATOR, ''));
  }

  async mergeBranch(branchA: string, branchB: string): Promise<string[]> {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });

    try {
      await this.getBranch(branchA, tmpDir.name);

      const pushedObjectsPromises = fs.readdirSync(tmpDir.name).map(file =>
        this.putObject(branchB, file, path.join(tmpDir.name, file))
      );

      const pushedObjects = await Promise.all(pushedObjectsPromises);
      await this.removeBranch(branchA);

      return pushedObjects;
    } finally {
      tmpDir.removeCallback();
    }
  }

  async objectExists(branch: string, fileName: string): Promise<boolean> {
    const objects = await this.listObjects(branch, fileName);

    return Boolean(objects.find(item => item.name === fileName));
  }

  async getObject(branch: string, objectName: string, filePath: string): Promise<string | null> {
    const formattedObjectName = S3.formatObjectName(branch, objectName);

    try {
      await this.client.fGetObject(this.bucket, formattedObjectName, filePath);
    } catch (e) {
      if ((e as TMinioClientError).code === 'NotFound') {
        return null;
      }

      S3.CLIENT_ERROR_CALLBACK(e);
    }

    return objectName;
  }

  async putObject(
    branch: string,
    objectName: string,
    filePath: string,
    meta: Minio.ItemBucketMetadata = {}
  ): Promise<string> {
    const formattedObjectName = S3.formatObjectName(branch, objectName);

    await this.client
      .fPutObject(this.bucket, formattedObjectName, filePath, meta)
      .catch(S3.CLIENT_ERROR_CALLBACK);

    return objectName;
  }

  async removeObject(branch: string, fileName: string): Promise<string> {
    const objectName = S3.formatObjectName(branch, fileName);
    await this.client.removeObject(this.bucket, objectName).catch(S3.CLIENT_ERROR_CALLBACK);

    return fileName;
  }

  async listObjects(branch: string, prefix = '', recursive?: boolean): Promise<Minio.BucketItem[]> {
    const formattedBranchName = S3.formatBranchName(branch);
    const objects = await this._listObjects(formattedBranchName + S3.SEPARATOR + prefix, recursive);
    return objects.map(item => ({
      ...item,
      name: S3.cleanObjectName(formattedBranchName, item.name)
    }));
  }

  private _listObjects(prefix?: string, recursive?: boolean): Promise<Minio.BucketItem[]> {
    return new Promise<Minio.BucketItem[]>((resolve, reject) => {
      const objects: Minio.BucketItem[] = [];
      const stream = this.client.listObjectsV2(this.bucket, prefix, recursive);
      stream.on('data', obj => objects.push(obj));
      stream.on('end', () => resolve(objects));
      stream.on('error', e => reject(e));
    }).catch(S3.CLIENT_ERROR_CALLBACK);
  }

  public getObjectLink(branch: string, objectName: string): string {
    const formattedObjectName = S3.formatObjectName(branch, objectName);
    return `http://${this.host}:${this.port}/${this.bucket}/${formattedObjectName}`;
  }
}

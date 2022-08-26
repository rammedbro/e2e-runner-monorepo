import fs from 'fs';
import path from 'path';
import consola from 'consola';
import deepmerge from 'deepmerge';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { IE2ERunnerConfig } from '@bx-fe/e2e-runner-types';

import { Runner } from '~/src/classes/runner';
import { AllureError } from '~/src/classes/error';
import { defaultAllureConfig } from '~/src/configs/allure';

const execSync = promisify(exec);

export class Allure {
  public readonly url: string;
  public readonly projectId: string;
  public readonly outputDir: string;
  private readonly token: string;
  public static readonly CLASS_NAME: string = 'Allure';

  constructor(_runnerConfig: IE2ERunnerConfig | string) {
    const runnerConfig = Runner.getConfig(_runnerConfig);

    if (!runnerConfig.allure) {
      throw new AllureError('You need to enable allure module in your e2e.config file');
    }

    const { url, projectId, options, token } = deepmerge(defaultAllureConfig, runnerConfig.allure);
    this.url = url;
    this.projectId = projectId;
    this.token = token;
    this.outputDir = path.resolve(runnerConfig.outputDir, options.outputDir);
  }

  public static extractAllureCtlUploadLaunchId(s: string): number | null {
    const matches = s.match(/Launch \[([0-9]+)]/i) || [];
    return matches[1] ? parseInt(matches[1]) : null;
  }

  public async sendReport(launchName: string): Promise<number> {
    const isAllureResultsExist =
      fs.existsSync(this.outputDir) &&
      fs.readdirSync(this.outputDir).length !== 0;

    if (!isAllureResultsExist) {
      throw new AllureError(`Could not find results on path ${this.outputDir}`);
    }

    const allureCtlResult = await this.execAllureCtlUpload(launchName);
    const launchId = Allure.extractAllureCtlUploadLaunchId(allureCtlResult);

    if (launchId === null) {
      throw new AllureError('Could not extract launch id from allurectl upload command');
    }

    Allure.log('success', `Launch report - ${this.getLaunchUrl(launchId)}`);

    return launchId;
  }

  public getLaunchUrl(id: number): string {
    return `${this.url}/launch/${id}`;
  }

  private static log(type: 'success' | 'warn', message: string) {
    consola[type](`[${Allure.CLASS_NAME}]: ${message}`);
  }

  private async execAllureCtlUpload(launchName: string): Promise<string> {
    // TODO: Подумать об обработке ситуации с отсутствием allurectl
    const allureCtlCommand =
      `allurectl upload ${this.outputDir} ` +
      `--endpoint ${this.url} ` +
      `--token ${this.token} ` +
      `--project-id ${this.projectId} ` +
      `--launch-name ${launchName}`;
    const allureCtlCommandResult = await execSync(allureCtlCommand).catch((e: Error) => {
      throw new AllureError(e.message);
    });
    Allure.log('success', 'Allure report sent successfully');
    return allureCtlCommandResult.stdout.trim();
  }
}

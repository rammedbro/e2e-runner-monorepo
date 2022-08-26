import path from 'path';
import { Command } from 'commander';
import { Screenshots, buildCompareApp } from '@bx-fe/e2e-runner-app';
import inquirer from 'inquirer';
import ora from 'ora';

import type { Cli } from '~/src';

export class CompareAppCliCommand extends Command {
  constructor(program: Cli) {
    super('compare-app');

    this.description('Module for building compare app');

    this.command('build')
      .description('Interactive builder of an app for comparing all screenshot tests')
      .action(async () => {
        const spinner = ora({
          spinner: 'moon',
        });

        try {
          spinner.start('Reading config file...');
          const screenshots = new Screenshots(program.config);
          spinner.succeed();

          const { screenshotsInputPath }: Record<string, string> = await inquirer.prompt({
            type: 'input',
            name: 'screenshotsInputPath',
            message: 'Enter a path where you\'re keeping screenshots:',
            default: screenshots.screenshotsPath
          });

          const { appOutputPath }: Record<string, string> = await inquirer.prompt({
            type: 'input',
            name: 'appOutputPath',
            message: 'Enter a path where you want to save the app:',
            default: path.join(screenshots.screenshotsPath, Screenshots.COMPARE_APP_NAME)
          });

          spinner.start('Building an app...');
          buildCompareApp(screenshotsInputPath, appOutputPath);
          spinner.succeed(`Compare app have been successfully built and saved on path ${appOutputPath}`);
        } catch (e) {
          spinner.fail((e as Error).message);
        }
      });
  }
}

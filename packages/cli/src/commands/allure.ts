import path from 'path';
import { Command } from 'commander';
import allureCli from 'allure-commandline';
import { Allure, Runner } from '@bx-fe/e2e-runner-app';

import type { Cli } from '~/src/index.ts';

const allureCliAsync = (args: string[]): Promise<void> =>
  new Promise(((resolve, reject) => {
    const call = allureCli(args);

    call.on('exit', (exitCode: number) =>
      (exitCode === 0)
        ? resolve()
        : reject()
    );
  }));

export class AllureCliCommand extends Command {
  constructor(program: Cli) {
    super('allure');

    this.description('Module for generating local allure reports');

    this.command('generate')
      .description('Generate allure report from allure results files')
      .argument('[resultsPath]', 'Path to allure results', '')
      .option('-o, --output <output>', 'Path to save report files', '')
      .option('--clean', 'Delete previously generated report files if exists')
      .action(async (
        _resultsPath?: string,
        options: { output?: string; clean?: boolean } = {}
      ) => {
        const allureCliArgs = ['generate'];

        const allure = new Allure(program.config);
        const resultsPath = _resultsPath || allure.outputDir;
        allureCliArgs.push(resultsPath);

        const runnerConfig = Runner.getConfig(program.config);
        const outputPath = options.output || path.join(runnerConfig.outputDir, 'allure-report');
        allureCliArgs.push('-o', outputPath);

        if (options.clean) {
          allureCliArgs.push('--clean');
        }

        await allureCliAsync(allureCliArgs);
      });

    this.command('open')
      .description('Open allure report')
      .argument('[reportPath]', 'Path to allure report', '')
      .action(async (_reportPath?: string) => {
        const allureCliArgs = ['open'];
        const runnerConfig = Runner.getConfig(program.config);

        const reportPath = _reportPath || path.join(runnerConfig.outputDir, 'allure-report');
        allureCliArgs.push(reportPath);

        await allureCliAsync(allureCliArgs);
      });
  }
}

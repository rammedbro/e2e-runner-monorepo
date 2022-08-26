import { Command } from 'commander';
import { Screenshots } from '@bx-fe/e2e-runner-app';

import type { Cli } from '~/src/index.ts';

export class ScreenshotsCliCommand extends Command {
  constructor(program: Cli) {
    super('screenshots');

    this.description('Module for managing screenshots in s3');

    this.command('pull')
      .description('Pull screenshots from s3')
      .action(async () => {
        const screenshots = new Screenshots(program.config);
        await screenshots.pull();
      });

    this.command('push')
      .description('Push screenshots to s3')
      .action(async () => {
        const screenshots = new Screenshots(program.config);
        await screenshots.push();
      });

    this.command('merge')
      .description('Merge screenshots to s3')
      .action(async () => {
        const screenshots = new Screenshots(program.config);
        await screenshots.merge();
      });

    this.command('compare-app')
      .description('Build compare app and push it to s3')
      .action(async () => {
        const screenshots = new Screenshots(program.config);
        await screenshots.compareApp();
      });

    this.command('report')
      .description('Send report to slack')
      .action(async () => {
        const screenshots = new Screenshots(program.config);
        await screenshots.report();
      });
  }
}

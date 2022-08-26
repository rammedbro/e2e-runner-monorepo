import path from 'path';
import { Command } from 'commander';

import pkg from '~/package.json';
import { RunnerCliCommand } from '~/src/commands/runner';
import { AllureCliCommand } from '~/src/commands/allure';
import { ScreenshotsCliCommand } from '~/src/commands/screenshots';
import { S3CliCommand } from '~/src/commands/s3';
import { CompareAppCliCommand } from '~/src/commands/compare-app';

export class Cli {
  private program: Command = new Command();

  constructor() {
    this.program
      .version(pkg.version, '-v, --version')
      .usage('[options] <command>')
      .option('-c, --config <config>', 'Path to runner config', 'e2e.config.*')
      .addCommand(new RunnerCliCommand(this))
      .addCommand(new AllureCliCommand(this))
      .addCommand(new ScreenshotsCliCommand(this))
      .addCommand(new S3CliCommand(this))
      .addCommand(new CompareAppCliCommand(this));
  }

  get config(): string {
    return path.join(process.cwd(), this.program.opts().config);
  }

  run(args?: string[]): Promise<Command> {
    return this.program.parseAsync(args);
  }
}

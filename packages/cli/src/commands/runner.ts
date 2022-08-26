import { Command } from 'commander';
import { Runner } from '@bx-fe/e2e-runner-app';

import type { Cli } from '~/src/index.ts';

export class RunnerCliCommand extends Command {
  constructor(program: Cli) {
    super('run');

    this.description('Run tests');
    this.action(async () => {
      const exitCode = await Runner.run(program.config);
      process.exit(exitCode);
    });
  }
}

import { glob } from 'glob';
import path from 'path';
import WdioCli from '@wdio/cli';
import babelRegister from '@babel/register';
import type {
  IE2ERunnerConfig,
  IE2ERunnerConfigDefault
} from '@bx-fe/e2e-runner-types';

import { defaultRunnerConfig } from '~/src/configs/runner';
import { RunnerError } from '~/src/classes/error';

export class Runner {
  public static CURRENT_SESSION_CONFIG_PATH_VAR_NAME = '__RUNNER_CURRENT_SESSION_PATH__';
  public static WDIO_CONFIG_FILE_NAME = 'wdio.config.js';

  public static run(_path: string): Promise<number> {
    // Get config
    const runnerConfig = Runner.getConfig(_path);
    process.env[Runner.CURRENT_SESSION_CONFIG_PATH_VAR_NAME] = _path;

    // Determine a suite to run
    let suites: string[] | undefined;
    if (runnerConfig.suite) {
      suites = [runnerConfig.suite];
    } else {
      suites = Object.keys(runnerConfig.suites);
    }

    // Run wdio
    const wdioConfigPath = path.resolve(__dirname, Runner.WDIO_CONFIG_FILE_NAME);
    const wdioCli = new WdioCli(wdioConfigPath, {
      suite: suites,
    });

    return wdioCli.run();
  }

  public static getConfig(
    payload: IE2ERunnerConfig | string
  ): IE2ERunnerConfigDefault & IE2ERunnerConfig {
    // Set default config
    const runnerConfig = Object.assign({}, defaultRunnerConfig);

    if (typeof payload === 'object') {
      // Load payload config
      Object.assign(runnerConfig, payload);
    } else {
      const [file] = glob.sync(payload);

      if (!file) {
        throw new RunnerError(`Could not find config file matching pattern ${payload}`);
      }

      // Load file config
      babelRegister({
        extensions: ['.js', '.ts'],
        cache: false,
      });

      const runnerConfigLocal = (require(file) as Record<string, unknown>).default as IE2ERunnerConfig;
      Object.assign(runnerConfig, runnerConfigLocal);
    }

    return runnerConfig as IE2ERunnerConfigDefault & IE2ERunnerConfig;
  }
}

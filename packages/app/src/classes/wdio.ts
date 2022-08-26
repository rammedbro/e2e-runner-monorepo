import fs from 'fs';
import path from 'path';
import deepmerge from 'deepmerge';
import AdmZip from 'adm-zip';
import WdioImageComparisonService from 'wdio-image-comparison-service';
import type {
  IWdio,
  TWdioConfig,
  IE2ERunnerConfig,
  IE2ERunnerConfigDefault,
} from '@bx-fe/e2e-runner-types';
import type { Tsconfig } from 'tsconfig-paths/lib/tsconfig-loader';
import type { Options as WdioOptions } from '@wdio/types';

import { Allure } from '~/src/classes/allure';
import { Runner } from '~/src/classes/runner';
import { defaultScreenshotsConfig } from '~/src/configs/screenshots';
import { Screenshots } from '~/src/classes/screenshots';
import { WdioError } from '~/src/classes/error';
import defaultCapabilities from '~/src/capabilities';
import { CI } from '~/src/constants/ci';
import { ensureDirExists, ensureDirNotExists } from '~/src/utils/fs';
import { defaultReportsConfig } from '~/src/configs/runner';

export class Wdio implements IWdio {
  public config!: TWdioConfig;
  public runnerConfig: IE2ERunnerConfig & IE2ERunnerConfigDefault;
  public session!: IWdio['session'];
  public utils: IWdio['utils'] = {
    suitesByFileMap: new Map<string, string>()
  };

  constructor(_runnerConfig: IE2ERunnerConfig | string) {
    this.runnerConfig = Runner.getConfig(_runnerConfig);

    this.initConfig();
    this.initUtils();
    this.initSession();
    this.installHooks();
    this.installCapability();
    this.installTypescript();
    this.installScreenshots();
    this.installAllure();
    this.installReports();
  }

  private initConfig(): void {
    const suites = Object.fromEntries(
      Object.entries(this.runnerConfig.suites).map(
        ([suite, data]) => [suite, data.specs]
      )
    );

    this.config = {
      runner: 'local',
      suites,
      exclude: [],
      maxInstances: 10,
      capabilities: [],
      logLevel: 'error',
      bail: 0,
      baseUrl: this.runnerConfig.baseUrl,
      waitforTimeout: 10000,
      connectionRetryTimeout: 120000,
      connectionRetryCount: 3,
      framework: 'mocha',
      mochaOpts: {
        ui: 'bdd',
        timeout: 90000,
      },
      services: [],
      reporters: [],
      onPrepare: [],
      onWorkerStart: [],
      onComplete: [],
      onReload: [],
      before: [],
      beforeCommand: [],
      beforeHook: [],
      beforeSession: [],
      beforeSuite: [],
      beforeTest: [],
      afterTest: [],
      afterSuite: [],
      afterHook: [],
      after: [],
      afterCommand: [],
      afterSession: []
    };

    if (this.runnerConfig.wdioConfigExtend) {
      this.runnerConfig.wdioConfigExtend(this.config);
    }
  }

  private initUtils(): void {
    Object.entries(this.runnerConfig.suites).forEach(
      ([suite, { specs }]) => specs.forEach(
        spec => this.utils.suitesByFileMap.set(path.resolve(process.cwd(), spec), suite)
      )
    );
  }

  private initSession(): void {
    this.config.beforeSuite.push(({ title }) => {
      const suite = this.runnerConfig.suites[title];

      this.session = {
        browser: this.runnerConfig.browser,
        suite: {
          title,
          files: suite.specs,
          reportGroupId: suite.reportGroupId,
          passed: true,
          tests: [],
          startedAt: Date.now(),
          finishedAt: null,
        }
      };

      if (!CI) return;

      const {
        CI_PIPELINE_ID,
        CI_PIPELINE_URL,
        CI_PIPELINE_CREATED_AT,
        CI_JOB_ID,
        CI_JOB_URL,
        CI_JOB_STARTED_AT,
        CI_JOB_NAME,
      } = process.env as Record<string, string>;

      this.session.ci = {
        pipeline: {
          id: CI_PIPELINE_ID,
          url: CI_PIPELINE_URL,
          createdAt: CI_PIPELINE_CREATED_AT,
        },
        job: {
          id: CI_JOB_ID,
          url: CI_JOB_URL,
          name: CI_JOB_NAME,
          createdAt: CI_JOB_STARTED_AT,
        },
      };
    });

    this.config.afterTest.push((test, context, result) => {
      const currentRetry = test._currentRetry || 0;
      const retryCount = test._retries || 0;

      if (result.passed || (currentRetry < retryCount)) return;

      const { suite } = this.session;

      suite.tests.push({
        title: test.title,
        file: test.file,
        passed: result.passed,
      });
      suite.passed = false;
    });

    this.config.afterSuite.push(() => {
      const { suite } = this.session;
      suite.finishedAt = Date.now();
    });
  }

  private installHooks(): void {
    this.config.onPrepare.push(() => {
      ensureDirExists(this.runnerConfig.outputDir);
    });
  }

  private installCapability(): void {
    const { browser, capabilities = [] } = this.runnerConfig;
    const capability = [
      ...capabilities,
      ...defaultCapabilities
    ].find(item =>
      item.service === browser.service &&
      item.platform === browser.platform &&
      item.options.browserName?.toLowerCase() === browser.name
    );

    if (!capability) {
      const browserToString = Object.entries(browser)
        .map(([key, value]: [string, string]) => `${key}: ${value}`)
        .join(', ');
      throw new WdioError(`Could not find capability for ${browserToString}`);
    }

    capability.install(this);
  }

  private installTypescript(): void {
    if (!this.runnerConfig.typescript) return;

    let tsConfigPathsOpts: WdioOptions.TSConfigPathsOptions;

    if (typeof this.runnerConfig.typescript === 'object') {
      tsConfigPathsOpts = this.runnerConfig.typescript;
    } else {
      const tsConfigPath = path.resolve(process.cwd(), 'tsconfig.json');

      if (!fs.existsSync(tsConfigPath)) {
        throw new WdioError(`Could not find tsconfig.json on path ${tsConfigPath}`);
      }

      const tsConfig = require(tsConfigPath) as Tsconfig;
      tsConfigPathsOpts = {
        baseUrl: tsConfig.compilerOptions?.baseUrl || '',
        paths: tsConfig.compilerOptions?.paths || {}
      };
    }

    this.config.autoCompileOpts = {
      tsConfigPathsOpts
    };
  }

  private installScreenshots(): void {
    if (!this.runnerConfig.screenshots) return;

    const screenshotsConfig = deepmerge(defaultScreenshotsConfig, this.runnerConfig.screenshots);

    this.config.beforeSuite.push(
      async (suite): Promise<void> => {
        const { suites = [] } = screenshotsConfig;
        if (!suites.find(regexp => suite.title.match(regexp))) return;

        this.runnerConfig.suite = suite.title;

        const screenshots = new Screenshots(this.runnerConfig);
        const wdioImageComparisonService = new WdioImageComparisonService(screenshotsConfig.comparison);
        wdioImageComparisonService.folders = screenshots.folders;
        wdioImageComparisonService.before({ browserName: this.runnerConfig.browser.name });

        if (CI) {
          await screenshots.pull();
        }
      },
    );

    if (CI) {
      this.config.afterSuite.push((suite) => {
        const { suites = [] } = screenshotsConfig;
        if (!suites.find(regexp => suite.title.match(regexp))) return;

        const screenshots = new Screenshots(this.runnerConfig);
        const admZip = new AdmZip();

        admZip.addLocalFolder(screenshots.screenshotsPath);
        admZip.writeZip(`${screenshots.screenshotsPath}.zip`);
      });
    }
  }

  private installAllure(): void {
    if (!this.runnerConfig.allure) return;

    const allure = new Allure(this.runnerConfig);
    const { options = {} } = this.runnerConfig.allure;

    this.config.reporters.push(['allure', Object.assign(options, { outputDir: allure.outputDir })]);

    this.config.onPrepare.push(() =>
      ensureDirNotExists(allure.outputDir)
    );

    if (CI) {
      this.config.afterSuite.push(async (): Promise<void> => {
        const launchId = await allure.sendReport(this.runnerConfig.launchName);
        this.session.allureLaunchUrl = allure.getLaunchUrl(launchId);
      });
    }
  }

  private installReports(): void {
    if (!this.runnerConfig.reports) return;

    const reportsConfig = deepmerge(defaultReportsConfig, this.runnerConfig.reports);

    this.config.afterSession.push(() => {
      ensureDirExists(reportsConfig.reportsDir);

      const ts: string = new Date().toISOString();
      fs.writeFileSync(
        path.join(reportsConfig.reportsDir, `${ts}.json`),
        JSON.stringify(this.session),
        { encoding: 'utf-8' }
      );
    });

    this.config.onComplete.push(() => {
      const admZip = new AdmZip();

      admZip.addLocalFolder(reportsConfig.reportsDir);
      admZip.writeZip(`${reportsConfig.reportsDir}.zip`);
    });
  }
}

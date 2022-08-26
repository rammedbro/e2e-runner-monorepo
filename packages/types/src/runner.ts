import type { AllureReporterOptions } from '@wdio/allure-reporter';
import type { ClassOptions as ImageComparisonOptions } from 'webdriver-image-comparison';

import type { ICapability, TCapabilityBrowsers, TCapabilityPlatforms, TCapabilityServices } from '~/src/capability';
import type { TWdioConfig } from '~/src/wdio';
import type { ISlackReporterConfig } from '~/src/reports';

interface IBrowserConfig {
  service: TCapabilityServices;
  platform: TCapabilityPlatforms;
  name: TCapabilityBrowsers;
}

interface IAllureConfig {
  projectId: string;
  token?: string;
  url?: string;
  options?: AllureReporterOptions;
}

interface IScreenshotComparisonOptions extends ImageComparisonOptions {
  formatSuiteDirName?: string;
  actualFolder?: string;
  diffFolder?: string;
  baselineFolder?: string;
  screenshotPath?: string;
}

interface IScreenshotsConfig {
  s3: IS3Config;
  gitlab: IGitlabConfig;
  comparison?: IScreenshotComparisonOptions;
  suites?: (string | RegExp)[];
  ciJobs?: (string | RegExp)[];
}

interface IS3Config {
  bucket: string;
  accessKey: string;
  secretKey: string;
  host?: string;
  port?: number;
}

interface IGitlabConfig {
  projectId: string;
  token: string;
}

interface ITypescriptConfig {
  baseUrl: string;
  paths: Record<string, string[]>;
}

interface IBrowserstackConfig {
  user?: string;
  key?: string;
}

interface IMoonConfig {
  host?: string;
  port?: number;
  path?: string;
}

interface IReportsConfig {
  reporter: ISlackReporterConfig;
  reportsDir?: string;
}

interface ISuiteConfig {
  specs: string[];
  reportGroupId?: string;
}

export interface IE2ERunnerConfig {
  browser: IBrowserConfig;
  suites: Record<string, ISuiteConfig>;
  capabilities?: ICapability[];
  outputDir?: string;
  reports?: IReportsConfig;
  baseUrl?: string;
  launchName?: string;
  suite?: string;
  allure?: IAllureConfig;
  screenshots?: IScreenshotsConfig;
  typescript?: boolean | ITypescriptConfig;
  browserstack?: IBrowserstackConfig;
  moon?: IMoonConfig;
  wdioConfigExtend?: (config: TWdioConfig) => void;
}

export type IE2ERunnerConfigDefault = Required<Pick<IE2ERunnerConfig,
'outputDir' | 'baseUrl' | 'launchName'>>;

import path from 'path';
import { promisify } from 'util';
import browserstack from 'browserstack-local';
import type {
  IWdio,
  ICapability,
  TCapabilityPlatforms,
  TCapabilityServices,
  TCapabilityOptions
} from '@bx-fe/e2e-runner-types';

import {
  defaultBrowserstackConfig,
  defaultMoonConfig
} from '~/src/configs/runner';

abstract class Capability implements ICapability {
  public service: TCapabilityServices;
  public platform: TCapabilityPlatforms;
  public options: TCapabilityOptions;

  protected constructor(
    service: TCapabilityServices,
    platform: TCapabilityPlatforms,
    options: TCapabilityOptions,
  ) {
    this.service = service;
    this.platform = platform;
    this.options = options;
  }

  abstract install(wdio: IWdio): void;
}

export class BrowserstackCapability extends Capability {
  constructor(
    platform: TCapabilityPlatforms,
    options: TCapabilityOptions,
  ) {
    super('browserstack', platform, options);
  }

  public install(wdio: IWdio): void {
    const user = wdio.runnerConfig.browserstack?.user || defaultBrowserstackConfig.user;
    const key = wdio.runnerConfig.browserstack?.key || defaultBrowserstackConfig.key;
    wdio.config.user = user;
    wdio.config.key = key;

    wdio.config.services.push(
      ['browserstack', { browserstackLocal: true }]
    );

    const browserstackOptions = this.options['bstack:options']
      ? Object.assign({}, this.options['bstack:options'])
      : {};
    browserstackOptions.local = true;

    wdio.config.capabilities = [{
      ...this.options,
      'bstack:options': browserstackOptions
    }];

    const bsLocalInstance = new browserstack.Local();
    const bsLocalStart = promisify(bsLocalInstance.start.bind(bsLocalInstance));
    const bsLocalStop = promisify(bsLocalInstance.stop.bind(bsLocalInstance));
    const localIdentifierParts = [this.service, this.platform, this.options.browserName];
    const logFile = path.join(wdio.runnerConfig.outputDir, `${this.service}.log`);

    wdio.config.beforeSuite.push(async (suite) => {
      localIdentifierParts.push(suite.title);

      const localIdentifier = localIdentifierParts.join('-').toLowerCase();
      await bsLocalStart({ key, localIdentifier, logFile });
    });

    wdio.config.afterSession.push(async () => {
      await bsLocalStop();
    });
  }
}

export class DriverCapability extends Capability {
  constructor(
    platform: TCapabilityPlatforms,
    options: TCapabilityOptions,
  ) {
    super('driver', platform, options);
  }

  public install(wdio: IWdio): void {
    wdio.config.services.push('chromedriver');
    wdio.config.capabilities = [this.options];
  }
}

export class MoonCapability extends Capability {
  constructor(
    platform: TCapabilityPlatforms,
    options: TCapabilityOptions,
  ) {
    super('moon', platform, options);
  }

  public install(wdio: IWdio): void {
    wdio.config.hostname = wdio.runnerConfig.moon?.host || defaultMoonConfig.host;
    wdio.config.port = wdio.runnerConfig.moon?.port || defaultMoonConfig.port;
    wdio.config.path = wdio.runnerConfig.moon?.path || defaultMoonConfig.path;

    const moonOptions = this.options['moon:options']
      ? Object.assign({}, this.options['moon:options'])
      : {};
    moonOptions.name = wdio.runnerConfig.launchName;

    wdio.config.capabilities = [{
      ...this.options,
      'moon:options': moonOptions
    }];
  }
}

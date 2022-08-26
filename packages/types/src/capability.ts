import type { Capabilities as WdioCapabilities } from '@wdio/types';

import type { IWdio } from '~/src/wdio';

export type TCapabilityBrowsers = 'chrome' | 'firefox' | 'safari' | 'microsoftedge' | 'opera' | 'ie';
export type TCapabilityServices = 'driver' | 'browserstack' | 'moon';
export type TCapabilityPlatforms = 'desktop' | 'mobile';
export type TCapabilityOptions = WdioCapabilities.Capabilities;

export interface ICapability {
  service: TCapabilityServices;
  platform: TCapabilityPlatforms;
  options: TCapabilityOptions;

  install(wdio: IWdio): void;
}

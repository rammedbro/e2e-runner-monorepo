import { BrowserstackCapability } from '~/src/classes/capability';

export default new BrowserstackCapability(
  'desktop', {
    browserName: 'firefox',
    browserVersion: 'latest',
    'bstack:options': {
      os: 'Windows',
      osVersion: '10',
      resolution: '1440x900',
    },
  }
);

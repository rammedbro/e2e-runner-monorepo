import { BrowserstackCapability } from '~/src/classes/capability';

export default new BrowserstackCapability(
  'desktop', {
    browserName: 'Safari',
    browserVersion: '14.0',
    'bstack:options': {
      os: 'OS X',
      osVersion: 'Big Sur',
      resolution: '1600x1200',
    },
  },
);

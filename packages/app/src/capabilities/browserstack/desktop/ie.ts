import { BrowserstackCapability } from '~/src/classes/capability';

export default new BrowserstackCapability(
  'desktop', {
    browserName: 'IE',
    browserVersion: '11.0',
    'bstack:options': {
      os: 'Windows',
      osVersion: '10',
      resolution: '1440x900',
      ie: {
        driver: '3.141.59',
      },
    },
  },
);

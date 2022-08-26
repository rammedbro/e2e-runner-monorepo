import { BrowserstackCapability } from '~/src/classes/capability';

export default new BrowserstackCapability(
  'mobile', {
    browserName: 'chrome',
    browserVersion: 'latest',
    'goog:chromeOptions': {
      mobileEmulation: { deviceName: 'iPhone X' },
      args: ['incognito', 'disable-notifications', 'disable-extensions', 'disable-infobars'],
    },
    'bstack:options': {
      os: 'Windows',
      osVersion: '10',
      resolution: '1440x900',
    },
  },
);

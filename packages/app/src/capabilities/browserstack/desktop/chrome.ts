import { BrowserstackCapability } from '~/src/classes/capability';

export default new BrowserstackCapability(
  'desktop', {
    browserName: 'chrome',
    browserVersion: 'latest',
    'goog:chromeOptions': {
      args: [
        '--headless',
        '--incognito',
        '--disable-notifications',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-infobars',
      ],
    },
    'bstack:options': {
      os: 'Windows',
      osVersion: '10',
      resolution: '1440x900',
    }
  }
);

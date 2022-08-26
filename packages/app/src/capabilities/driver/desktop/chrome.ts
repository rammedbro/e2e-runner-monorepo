import { DriverCapability } from '~/src/classes/capability';

export default new DriverCapability(
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
  },
);

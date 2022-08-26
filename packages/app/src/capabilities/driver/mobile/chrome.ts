import { DriverCapability } from '~/src/classes/capability';

export default new DriverCapability(
  'mobile', {
    browserName: 'chrome',
    'goog:chromeOptions': {
      mobileEmulation: { deviceName: 'iPhone X' },
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

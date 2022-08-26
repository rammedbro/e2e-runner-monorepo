import { MoonCapability } from '~/src/classes/capability';

export default new MoonCapability(
  'mobile', {
    browserName: 'chrome',
    browserVersion: '91.0',
    'moon:options': {
      screenResolution: '1440x900',
    },
    'goog:chromeOptions': {
      mobileEmulation: { deviceName: 'iPhone X' },
      args: ['headless', 'incognito', 'disable-notifications', 'disable-extensions', 'disable-infobars'],
    },
  },
);

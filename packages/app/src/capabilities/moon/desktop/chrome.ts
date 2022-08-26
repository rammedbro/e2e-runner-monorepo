import { MoonCapability } from '~/src/classes/capability';

export default new MoonCapability(
  'desktop', {
    browserName: 'chrome',
    browserVersion: '91.0',
    'goog:chromeOptions': {
      args: ['headless', 'incognito', 'disable-notifications', 'disable-extensions', 'disable-infobars'],
    },
    'moon:options': {
      screenResolution: '1440x900',
    },
  },
);

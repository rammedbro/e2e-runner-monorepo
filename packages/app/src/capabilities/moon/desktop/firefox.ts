import { MoonCapability } from '~/src/classes/capability';

export default new MoonCapability(
  'desktop', {
    browserName: 'firefox',
    browserVersion: '88.0',
    'moon:options': {
      screenResolution: '1440x900',
    },
  },
);

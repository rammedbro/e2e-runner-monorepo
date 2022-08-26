import { MoonCapability } from '~/src/classes/capability';

export default new MoonCapability(
  'desktop', {
    browserName: 'opera',
    browserVersion: '76.0',
    'moon:options': {
      screenResolution: '1440x900',
    },
  },
);

import { MoonCapability } from '~/src/classes/capability';

export default new MoonCapability(
  'desktop', {
    browserName: 'safari',
    browserVersion: '13.0',
    'moon:options': {
      screenResolution: '1600x1200',
    },
  },
);

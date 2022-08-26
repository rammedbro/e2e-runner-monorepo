import { MoonCapability } from '~/src/classes/capability';

export default new MoonCapability(
  'desktop',
  {
    browserName: 'MicrosoftEdge',
    browserVersion: '91.0',
    'moon:options': {
      screenResolution: '1440x900',
    },
  },
);

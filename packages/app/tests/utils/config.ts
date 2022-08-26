import type { IE2ERunnerConfig } from '@bx-fe/e2e-runner-types';

export const runnerConfig: IE2ERunnerConfig = {
  browser: {
    service: 'driver',
    platform: 'desktop',
    name: 'chrome',
  },
  suites: {},
  reports: {
    reporter: {
      name: 'slack',
      channelId: 'channel',
      defaultUsers: [],
    }
  }
};

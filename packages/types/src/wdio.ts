import type { Services as WdioServices } from '@wdio/types';

import type { IE2ERunnerConfig, IE2ERunnerConfigDefault } from '~/src/runner';

type THooks = {
  [k in keyof WdioServices.HookFunctions]: NonNullable<WdioServices.HookFunctions[k]>[]
};

interface IWdioSessionSuite {
  title: string;
  passed: boolean;
  files: string[];
  tests: IWdioSessionTest[];
  reportGroupId?: string;
  startedAt: number | null;
  finishedAt: number | null;
}

interface IWdioSessionTest {
  title: string;
  passed: boolean;
  file: string;
}

interface IWdioSessionCI {
  pipeline: {
    id: string;
    url: string;
    createdAt: string;
  };
  job: {
    id: string;
    url: string;
    name: string;
    createdAt: string;
  };
}

interface IWdioSession {
  suite: IWdioSessionSuite;
  browser: IE2ERunnerConfig['browser'];
  ci?: IWdioSessionCI;
  allureLaunchUrl?: string;
}

interface IWdioUtils {
  suitesByFileMap: Map<string, string>;
}

export type TWdioConfig =
  WebdriverIO.Config &
  Required<Pick<WebdriverIO.Config, 'reporters' | 'services'>> &
  Required<THooks>;

export interface IWdio {
  config: TWdioConfig;
  runnerConfig: IE2ERunnerConfig & IE2ERunnerConfigDefault;
  session: IWdioSession;
  utils: IWdioUtils;
}

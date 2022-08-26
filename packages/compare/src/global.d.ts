interface ITestData {
  session: string;
  title: string;
  status: string;
  actual: string;
  baseline: string;
  diff?: string;
}

declare const __TESTS__: ITestData[];

import type { ClassOptions as ImageComparisonOptions } from 'webdriver-image-comparison';

declare module 'wdio-image-comparison-service' {
  declare class WdioImageComparisonService {
    public folders: {
      actualFolder: string;
      baselineFolder: string;
      diffFolder: string;
    };

    public constructor(options: ImageComparisonOptions);

    public before(capabilities: { browserName: string }): void
  }

  export default WdioImageComparisonService;
}

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { base64Sync } from 'base64-img';

export function parseScreenshotTestsData(inputPath: string): ITestData[] {
  const result: ITestData[] = [];

  if (!inputPath) return result;

  glob.sync(`${inputPath}/*`, { realpath: true }).forEach(sessionDirPath => {
    const baselineMap = new Map(glob
      .sync(`${sessionDirPath}/baseline/**/*`, { nodir: true })
      .map(file => [path.basename(file), base64Sync(file)]));
    const diffMap = new Map(glob
      .sync(`${sessionDirPath}/diff/**/*`, { nodir: true })
      .map(file => [path.basename(file), base64Sync(file)]));

    glob
      .sync(`${sessionDirPath}/actual/**/*`, { nodir: true })
      .forEach(file => {
        const title = path.basename(file);
        const status = baselineMap.get(title)
          ? (!diffMap.get(title) ? 'passed' : 'failed')
          : 'broken';

        result.push({
          title,
          status,
          session: path.basename(sessionDirPath),
          actual: base64Sync(file),
          baseline: baselineMap.get(title)!,
          diff: diffMap.get(title)
        });
      });
  });

  return result;
}

export function buildCompareApp(
  screenshotsInputPath: string,
  appOutputPath: string
): void {
  let html = fs.readFileSync(path.resolve(__dirname, './app/index.html'), { encoding: 'utf-8' });
  html = html.replace('__TESTS__', JSON.stringify(parseScreenshotTestsData(screenshotsInputPath)));
  fs.writeFileSync(appOutputPath, html, { encoding: 'utf-8' });
}

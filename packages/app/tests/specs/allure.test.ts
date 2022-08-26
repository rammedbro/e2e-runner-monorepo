import fs from 'fs';
import tmp from 'tmp';

import { Allure } from '~/src/classes/allure';
import { runnerConfig } from '~/tests/utils/config';

describe('allure', () => {
  const allureOptions = {
    outputDir: 'allure-results',
    projectId: 'id',
    url: 'url',
  };

  const getAllureInstance = () => {
    const { name: outputDir } = tmp.dirSync({ unsafeCleanup: true });
    const allure = new Allure({
      ...runnerConfig,
      outputDir,
      allure: allureOptions
    });
    fs.mkdirSync(allure.outputDir);

    return allure;
  };

  it('should extract launch id from allurectl upload result string', () => {
    const launchId = 12345;
    const allureCtlUploadResultString = `Launch [${launchId}]`;
    const extractedLaunchId = Allure.extractAllureCtlUploadLaunchId(allureCtlUploadResultString);

    expect(extractedLaunchId).toEqual(launchId);
  });

  it('should return null when allurectl upload command could not extract launch id', () => {
    const allureCtlUploadResultString = 'Corrupted launch';
    const extractedLaunchId = Allure.extractAllureCtlUploadLaunchId(allureCtlUploadResultString);

    expect(extractedLaunchId).toBeNull();
  });

  it('should return launch id when sending a report to allure', async () => {
    const allure = getAllureInstance();
    tmp.fileSync({ dir: allure.outputDir });

    const mockedLaunchId = 12345;
    jest.spyOn(allure as any, 'execAllureCtlUpload').mockResolvedValue(`Launch [${mockedLaunchId}]`);

    const responseLaunchId = await allure.sendReport('launchName');
    expect(responseLaunchId).toEqual(mockedLaunchId);
  });

  it('should throw an error when a report doesnt exist', async () => {
    const allure = getAllureInstance();
    fs.rmdirSync(allure.outputDir);

    await expect(
      allure.sendReport('launchName')
    ).rejects.toThrow('Could not find results on path');
  });

  it('should throw an error when it could not extract launch id of sent report', async () => {
    const allure = getAllureInstance();
    tmp.fileSync({ dir: allure.outputDir });
    jest.spyOn(allure as any, 'execAllureCtlUpload').mockResolvedValue('Corrupted launch');

    await expect(
      allure.sendReport('launchName')
    ).rejects.toThrow('Could not extract launch id from allurectl upload command');
  });
});

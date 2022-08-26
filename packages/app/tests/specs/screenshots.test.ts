import * as path from 'path';
import AdmZip from 'adm-zip';
import { buildCompareApp } from '@bx-fe/e2e-runner-compare';
import { mocked } from 'ts-jest/utils';

import { S3 } from '~/src/classes/s3';
import { GitlabApi } from '~/src/classes/gitlab-api';
import { Screenshots } from '~/src/classes/screenshots';
import { runnerConfig } from '~/tests/utils/config';
import { ScreenshotsReporter } from '~/src/reporters/screenshots-reporter';
import { ensureDirExists, ensureDirNotExists } from '~/src/utils/fs';
import type { IGitlabJob, IGitlabPipeline, IGitlabRelease } from '~/src/classes/gitlab-api';

jest.mock('~/src/classes/s3');
jest.mock('~/src/classes/gitlab-api');
jest.mock('~/src/reporters/screenshots-reporter');

const mockedS3 = mocked(new S3(''));
const mockedGitlabApi = mocked(new GitlabApi('', ''));
const mockedReporter = mocked(new ScreenshotsReporter(''));
const mockedBuildCompareApp = mocked(buildCompareApp);

const envVars = [
  'CI_COMMIT_REF_NAME',
  'CI_PIPELINE_ID',
  'CI_PIPELINE_URL',
  'CI_PIPELINE_CREATED_AT'
];
const setEnvVars = (branch: string) => {
  process.env.CI_COMMIT_REF_NAME = branch;
  process.env.CI_PIPELINE_ID = '0';
  process.env.CI_PIPELINE_URL = 'pipeline-url';
  process.env.CI_PIPELINE_CREATED_AT = 'pipeline-created-at';
};
const unsetEnvVars = () =>
  envVars.forEach(variable => {
    delete process.env[variable];
  });

describe('screenshots', () => {
  const config = {
    ...runnerConfig,
    outputDir: 'dist/wdio',
    suite: 'screenshot',
    screenshots: {
      ciJobs: [/e2e:screenshots/],
      s3: {
        bucket: 'bucket',
        accessKey: 'accessKey',
        secretKey: 'secretKey'
      },
      gitlab: {
        token: 'token',
        projectId: 'projectId'
      },
      comparison: {
        screenshotPath: 'screenshots',
        formatSuiteDirName: 'OzAvatar-{browser}-{platform}',
        actualFolder: 'actual',
        baselineFolder: 'baseline',
        diffFolder: 'diff'
      }
    },
  };
  const screenshots = new Screenshots(config);
  const { screenshotsPath } = screenshots;

  beforeEach(() => {
    unsetEnvVars();
  });

  describe('pull', () => {
    beforeEach(() => {
      mockedS3.objectExists.mockClear();
      mockedS3.getObject.mockClear();
    });

    it('should pull screenshots from current ci branch in s3', async () => {
      const branch = 'release/20210817';
      const fileName = 'OzAvatar-chrome-desktop.zip';
      const filePath = path.join(screenshotsPath, fileName);

      setEnvVars(branch);
      mockedS3.objectExists.mockImplementation(() => Promise.resolve(true));

      await screenshots.pull();

      expect(mockedS3.objectExists).toHaveBeenCalledWith(branch, fileName);
      expect(mockedS3.getObject).toHaveBeenCalledWith(branch, fileName, filePath);
    });

    it('should pull screenshots from default branch if there are no screenshots for current ci branch in s3', async () => {
      const branch = 'non-existent-branch';
      const fileName = 'OzAvatar-chrome-desktop.zip';
      const filePath = path.join(screenshotsPath, fileName);

      setEnvVars(branch);
      mockedS3.objectExists.mockImplementationOnce(() => Promise.resolve(false));

      await screenshots.pull();

      expect(mockedS3.objectExists).toHaveBeenCalledWith(branch, fileName);
      expect(mockedS3.getObject).toHaveBeenCalledWith(Screenshots.DEFAULT_BRANCH, fileName, filePath);
    });

    it('should throw an error when required env vars are not set while pulling', async () => {
      await expect(screenshots.pull()).rejects.toThrow('define env variables');
    });
  });

  describe('push', () => {
    beforeAll(() => {
      ensureDirExists(screenshotsPath);
    });
    beforeEach(() => {
      mockedS3.putObject.mockClear();
      mockedGitlabApi.retryPipelineJob.mockClear();
      mockedGitlabApi.getJobArtifacts.mockClear();
      mockedReporter.notifyReport.mockClear();
      mockedReporter.checkReport.mockClear();
    });
    afterAll(() => {
      ensureDirNotExists(screenshotsPath);
    });

    it('should push all screenshots sessions to current ci branch in s3', async () => {
      const branch = 'release/20210817';
      const jobs: IGitlabJob[] = [
        {
          id: 0,
          name: 'e2e:screenshots:chrome',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 1,
          name: 'e2e:screenshots:firefox',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'e2e:screenshots:safari',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'e2e:screenshots:edge',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 4,
          name: 'e2e:screenshots:opera',
          status: 'manual',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        {
          id: 5,
          name: 'e2e:screenshots:ie',
          status: 'manual',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        {
          id: 6,
          name: 'build',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 7,
          name: 'lint',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 8,
          name: 'types',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];
      const artifacts = [
        {
          jobId: 0,
          filename: 'OzAvatar-chrome-desktop.zip',
          path: 'packages/app/tests/resources/gitlab/OzAvatar-chrome-desktop.zip',
        },
        {
          jobId: 1,
          filename: 'OzAvatar-firefox-desktop.zip',
          path: 'packages/app/tests/resources/gitlab/OzAvatar-firefox-desktop.zip'
        },
        {
          jobId: 2,
          filename: 'OzAvatar-safari-desktop.zip',
          path: 'packages/app/tests/resources/gitlab/OzAvatar-safari-desktop.zip'
        }
      ];
      const ts = new Date().toISOString();

      mockedS3.putObject.mockImplementation(async (branch, objectName) => objectName);
      mockedReporter.getLastOpenedReport.mockResolvedValue({ text: 'Report', blocks: [], ts });
      mockedReporter.checkReport.mockResolvedValue(true);
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);
      mockedGitlabApi.getJobArtifacts.mockImplementation(async (id) => {
        const artifact = artifacts.find(item => item.jobId === id)!;
        new AdmZip(artifact.path).extractAllTo(screenshotsPath);
        return path.join(screenshotsPath, path.basename(artifact.filename, '.zip'));
      });
      setEnvVars(branch);

      await screenshots.push();

      expect(mockedS3.putObject.mock.calls).toEqual(artifacts.map(item => [
        branch,
        item.filename,
        path.join(screenshotsPath, item.filename)
      ]));
      expect(mockedGitlabApi.retryPipelineJob.mock.calls).toEqual(artifacts.map(item => [item.jobId]));
      expect(mockedReporter.closeReport).toHaveBeenCalledWith(
        expect.objectContaining({ ts }),
        expect.stringMatching('новая версия скриншотов')
      );
    });

    it('should throw an error when required env vars are not set while pushing', async () => {
      await expect(screenshots.push()).rejects.toThrow('define env variables');
    });

    it('should do nothing when there is no opened slack report', async () => {
      setEnvVars('doesnt-matter');

      mockedReporter.getLastOpenedReport.mockResolvedValue(undefined);

      expect(mockedReporter.checkReport).not.toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    const releases: IGitlabRelease[] = [
      { tag_name: 'pdp1934-6345012' },
      { tag_name: '20211217-6345013' },
      { tag_name: 'bxfe2234-6345014' },
    ];
    const pipelines: IGitlabPipeline[] = [
      {
        id: 6345012,
        ref: 'release/PDP-1934',
        created_at: new Date().toISOString(),
        web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6345012'
      },
      {
        id: 6345013,
        ref: 'release/20211217',
        created_at: new Date().toISOString(),
        web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6345013'
      },
      {
        id: 6345014,
        ref: 'release/BXFE-2234',
        created_at: new Date().toISOString(),
        web_url: 'https://gitlab.ozon.ru/bx-fe/ui-kit/-/pipelines/6345014'
      },
    ];

    beforeEach(() => {
      mockedS3.mergeBranch.mockClear();
      mockedS3.branchExists.mockClear();
      mockedGitlabApi.getProjectPipeline.mockClear();
      mockedReporter.getLastOpenedReport.mockClear();
      mockedReporter.getAllOpenedReports.mockClear();
      mockedReporter.notifyReport.mockClear();
      mockedReporter.closeReport.mockClear();
    });

    it('should merge last release branch into default branch in s3', async () => {
      const pipelineId = 6345012;
      const pipeline = pipelines.find(item => item.id === pipelineId)!;
      const report = { ts: Date.now().toString(), text: '', blocks: [] };

      setEnvVars('doesnt-matter');
      mockedGitlabApi.getProjectReleases.mockResolvedValue(releases);
      mockedGitlabApi.getProjectPipeline.mockResolvedValue(pipeline);
      mockedS3.branchExists.mockResolvedValue(true);
      mockedReporter.getLastOpenedReport.mockResolvedValue(report);
      mockedReporter.getAllOpenedReports.mockResolvedValue([]);

      await screenshots.merge();

      expect(mockedGitlabApi.getProjectPipeline).toHaveBeenCalledWith(pipelineId.toString());
      expect(mockedS3.branchExists).toHaveBeenCalledWith(pipeline.ref);
      expect(mockedS3.mergeBranch).toHaveBeenCalledWith(pipeline.ref, Screenshots.DEFAULT_BRANCH);
      expect(mockedReporter.notifyReport).toHaveBeenCalledWith(
        report.ts,
        expect.stringMatching('успешно смержены в ветку')
      );
    });

    it('should close opened slack reports if there are some', async () => {
      const pipelineId = 6345012;
      const pipeline = pipelines.find(item => item.id === pipelineId)!;
      const reports = Array(4).fill(null)
        .map(() => ({ ts: Date.now().toString(), blocks: [], text: '' }));

      setEnvVars('doesnt-matter');
      mockedGitlabApi.getProjectReleases.mockResolvedValue(releases);
      mockedGitlabApi.getProjectPipeline.mockResolvedValue(pipeline);
      mockedS3.objectExists.mockResolvedValue(false);
      mockedReporter.getAllOpenedReports.mockResolvedValue(reports);

      await screenshots.merge();

      expect(mockedReporter.getAllOpenedReports).toHaveBeenCalledWith(pipeline.web_url, pipeline.created_at);
      expect(mockedReporter.closeReport.mock.calls).toEqual(
        reports.map(item => [item, expect.stringMatching(/релиз завершен/i)])
      );
    });

    it('should not merge last release branch into default branch if there are no screenshots for it in s3', async () => {
      const pipelineId = 6345012;
      const pipeline = pipelines.find(item => item.id === pipelineId)!;

      setEnvVars('doesnt-matter');
      mockedGitlabApi.getProjectReleases.mockResolvedValue(releases);
      mockedGitlabApi.getProjectPipeline.mockResolvedValue(pipeline);
      mockedS3.branchExists.mockResolvedValue(false);
      mockedReporter.getAllOpenedReports.mockResolvedValue([]);

      await screenshots.merge();

      expect(mockedS3.branchExists).toHaveBeenCalledWith(pipeline.ref);
      expect(mockedS3.mergeBranch).not.toHaveBeenCalled();
      expect(mockedReporter.getLastOpenedReport).not.toHaveBeenCalled();
      expect(mockedReporter.notifyReport).not.toHaveBeenCalled();
    });
  });

  describe('report', () => {
    beforeEach(() => {
      mockedGitlabApi.getJobArtifacts.mockClear();
      mockedReporter.sendReport.mockClear();
      mockedReporter.closeReport.mockClear();
    });
    afterAll(() => {
      ensureDirNotExists(config.outputDir);
    });

    it('should send a report to slack', async () => {
      const jobs = [
        {
          id: 0,
          name: 'e2e:screenshots:chrome',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];
      const compareAppLink = 'http://example.com/compare-app.html';

      setEnvVars('doesnt-matter');
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);
      mockedReporter.getLastOpenedReport.mockResolvedValue(undefined);
      mockedReporter.checkReport.mockResolvedValue(true);
      mockedReporter.sendReport.mockResolvedValue({ ts: new Date().toISOString() });
      mockedS3.getObjectLink.mockReturnValue(compareAppLink);

      await screenshots.report();

      const {
        CI_COMMIT_REF_NAME,
        CI_PIPELINE_URL,
      } = process.env as Record<string, string>;

      expect(mockedGitlabApi.getJobArtifacts.mock.calls).toEqual(jobs.map(item => [
        item.id,
        screenshots.reporter!.reportsPath,
        screenshots.reporter!.reportsPath + '.zip'
      ]));
      expect(mockedS3.getObjectLink).toHaveBeenCalledWith(
        CI_COMMIT_REF_NAME,
        Screenshots.COMPARE_APP_NAME
      );
      expect(mockedReporter.sendReport).toHaveBeenCalledWith(
        CI_COMMIT_REF_NAME,
        CI_PIPELINE_URL,
        compareAppLink
      );
    });

    it('should close a report if there is an opened one', async () => {
      const jobs = [
        {
          id: 0,
          name: 'e2e:screenshots:chrome',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];
      const report = {
        ts: new Date().toISOString(),
        text: 'Report',
        blocks: []
      };

      setEnvVars('doesnt-matter');
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);
      mockedReporter.getLastOpenedReport.mockResolvedValue(report);
      mockedReporter.checkReport.mockResolvedValue(true);
      mockedReporter.sendReport.mockResolvedValue({ ts: new Date().toISOString() });

      await screenshots.report();

      expect(mockedReporter.closeReport).toHaveBeenCalledWith(
        report,
        expect.stringMatching('были перезапущены без пуша новой версии')
      );
    });

    it('should throw an error when required env vars are not set while pushing', async () => {
      await expect(screenshots.report()).rejects.toThrow('define env variables');
    });

    it('should thrown an error when there are unfinished jobs', async () => {
      const branch = 'release/20210817';
      const jobs = [
        {
          id: 0,
          name: 'e2e:screenshots:chrome',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        {
          id: 1,
          name: 'e2e:screenshots:firefox',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        {
          id: 2,
          name: 'e2e:screenshots:safari',
          status: 'manual',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
      ];

      setEnvVars(branch);
      mockedReporter.getLastOpenedReport.mockResolvedValue(undefined);
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);

      await expect(screenshots.report()).rejects.toThrow('There are jobs you need to wait');
    });

    it('should do nothing when there are no jobs matching pattern', async () => {
      const branch = 'release/20210817';
      const jobs = [
        {
          id: 6,
          name: 'build',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 7,
          name: 'lint',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 8,
          name: 'types',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];

      setEnvVars(branch);
      mockedReporter.getLastOpenedReport.mockResolvedValue(undefined);
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);

      await screenshots.report();

      expect(mockedGitlabApi.getJobArtifacts).not.toHaveBeenCalled();
      expect(mockedS3.putObject).not.toHaveBeenCalled();
      expect(mockedReporter.sendReport).not.toHaveBeenCalled();
    });
  });

  describe('compareApp', () => {
    beforeEach(() => {
      mockedGitlabApi.getJobArtifacts.mockClear();
      mockedS3.putObject.mockClear();
    });
    afterAll(() => {
      ensureDirNotExists(config.outputDir);
    });

    it('should build and push a compare app to s3', async () => {
      const jobs = [
        {
          id: 0,
          name: 'e2e:screenshots:chrome',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];

      setEnvVars('doesnt-matter');
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);

      await screenshots.compareApp();

      const {
        CI_COMMIT_REF_NAME
      } = process.env as Record<string, string>;

      const expectedFilePath = path.join(screenshots.screenshotsPath, Screenshots.COMPARE_APP_NAME);
      const expectedCacheOptions = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Expires': 0,
        'Pragma': 'no-cache'
      };
      expect(mockedBuildCompareApp).toHaveBeenCalledWith(
        screenshots.screenshotsPath,
        expectedFilePath
      );
      expect(mockedS3.putObject).toHaveBeenCalledWith(
        CI_COMMIT_REF_NAME,
        Screenshots.COMPARE_APP_NAME,
        expectedFilePath,
        expectedCacheOptions
      );
    });

    it('should throw an error when required env vars are not set while pushing', async () => {
      await expect(screenshots.compareApp()).rejects.toThrow('define env variables');
    });

    it('should thrown an error when there are unfinished jobs', async () => {
      const branch = 'release/20210817';
      const jobs = [
        {
          id: 0,
          name: 'e2e:screenshots:chrome',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        {
          id: 1,
          name: 'e2e:screenshots:firefox',
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
        {
          id: 2,
          name: 'e2e:screenshots:safari',
          status: 'manual',
          started_at: new Date().toISOString(),
          finished_at: null,
        },
      ];

      setEnvVars(branch);
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);

      await expect(screenshots.compareApp()).rejects.toThrow('There are jobs you need to wait');
    });

    it('should do nothing when there are no jobs matching pattern', async () => {
      const branch = 'release/20210817';
      const jobs = [
        {
          id: 6,
          name: 'build',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 7,
          name: 'lint',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
        {
          id: 8,
          name: 'types',
          status: 'finished',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        },
      ];

      setEnvVars(branch);
      mockedGitlabApi.getPipelineJobsAll.mockImplementation(async () => jobs);

      await screenshots.compareApp();

      expect(mockedGitlabApi.getJobArtifacts).not.toHaveBeenCalled();
      expect(mockedS3.putObject).not.toHaveBeenCalled();
    });
  });
});

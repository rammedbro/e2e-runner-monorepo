import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import consola from 'consola';
import deepmerge from 'deepmerge';
import stringTemplate from 'string-template';
import { buildCompareApp } from '@bx-fe/e2e-runner-compare';
import type { IE2ERunnerConfig } from '@bx-fe/e2e-runner-types';

import { S3 } from '~/src/classes/s3';
import { Runner } from '~/src/classes/runner';
import { GitlabApi } from '~/src/classes/gitlab-api';
import { ScreenshotsError } from '~/src/classes/error';
import { defaultScreenshotsConfig } from '~/src/configs/screenshots';
import { ScreenshotsReporter } from '~/src/reporters/screenshots-reporter';
import type { IGitlabJob } from '~/src/classes/gitlab-api';

interface IFolders {
  baselineFolder: string;
  actualFolder: string;
  diffFolder: string;
}

interface ICIEnv {
  CI_COMMIT_REF_NAME: string;
  CI_PROJECT_ID: string;
  CI_PIPELINE_ID: string;
  CI_PIPELINE_URL: string;
  CI_PIPELINE_CREATED_AT: string;
}

export class Screenshots {
  private static readonly CLASS_NAME: string = 'Screenshots';
  public static readonly DEFAULT_BRANCH: string = 'master';
  public static readonly COMPARE_APP_NAME: string = 'compare-app.html';
  public readonly folders: IFolders;
  public readonly screenshotsPath: string;
  public readonly sessionOutputDir: string;
  public readonly reporter?: ScreenshotsReporter;
  private readonly s3: S3;
  private readonly gitlab: GitlabApi;
  private readonly ciJobs: (string | RegExp)[];

  constructor(_runnerConfig: IE2ERunnerConfig | string) {
    const runnerConfig = Runner.getConfig(_runnerConfig);

    if (!runnerConfig.screenshots) {
      throw new ScreenshotsError('You need to enable screenshots module in your e2e.config file');
    }

    const config = deepmerge(defaultScreenshotsConfig, runnerConfig.screenshots);
    const { comparison, gitlab, ciJobs = [] } = config;

    this.s3 = new S3(_runnerConfig);
    this.gitlab = new GitlabApi(gitlab.projectId, gitlab.token);
    this.ciJobs = ciJobs;

    const { suite } = runnerConfig;
    const { name: browser, service, platform } = runnerConfig.browser;
    this.screenshotsPath = path.join(runnerConfig.outputDir, comparison.screenshotPath);
    this.sessionOutputDir = stringTemplate(comparison.formatSuiteDirName, {
      suite,
      browser,
      service,
      platform,
    });

    const sessionRootFolder = path.join(this.screenshotsPath, this.sessionOutputDir);
    this.folders = {
      baselineFolder: path.join(sessionRootFolder, comparison.baselineFolder),
      actualFolder: path.join(sessionRootFolder, comparison.actualFolder),
      diffFolder: path.join(sessionRootFolder, comparison.diffFolder),
    };

    if (runnerConfig.reports) {
      this.reporter = new ScreenshotsReporter(_runnerConfig);
    }
  }

  public static unzipScreenshotsS3Archive(filePath: string): void {
    new AdmZip(filePath).extractAllTo(path.join(
      path.dirname(filePath),
      path.basename(filePath, '.zip')
    ));
    fs.rmSync(filePath);
  }

  private static ensureEnvVarsAreSet(keys: string[]): void {
    const undefinedEnvVars = keys.filter(key => process.env[key] === undefined);

    if (undefinedEnvVars.length) {
      throw new ScreenshotsError(`You need to define env variables: ${undefinedEnvVars.join(', ')}`);
    }
  }

  /**
   * Pull screenshots to s3
   *
   * Pull screenshots from branch with name set in CI_COMMIT_REF_NAME env var formatted to
   * kebab-case and lower-case. If that branch exists - pull screenshots from it otherwise
   * it will be pulled from default branch. In the end will be a result message.
   * Method is supposed to run in pipeline only!
   *
   * @returns {Promise<void>}
   */
  public async pull(): Promise<void> {
    Screenshots.ensureEnvVarsAreSet([
      'CI_COMMIT_REF_NAME',
    ]);

    const { CI_COMMIT_REF_NAME } = process.env as unknown as ICIEnv;

    const fileName = this.sessionOutputDir + '.zip';
    const filePath = path.join(this.screenshotsPath, fileName);
    const branch = await this.s3.objectExists(CI_COMMIT_REF_NAME, fileName)
      ? CI_COMMIT_REF_NAME
      : Screenshots.DEFAULT_BRANCH;

    const result = await this.s3.getObject(branch, fileName, filePath);

    if (result) {
      Screenshots.unzipScreenshotsS3Archive(filePath);
      Screenshots.log(
        'success',
        `Screenshots with name "${fileName}" have been successfully pulled from branch "${branch}".`
      );
    } else {
      Screenshots.log(
        'warn',
        `There are no screenshots with name "${fileName}" in branch "${branch}". Nothing to pull.`
      );
    }
  }

  /**
   * Push screenshots from s3
   *
   * Method gets failed and finished job's artifacts matching to the ciJobs prop's regexp set in
   * config file and push them to branch with name set in CI_COMMIT_REF_NAME env var. After
   * that it will restart all these jobs and print a message with their names.
   * You have to be repository administrator to run this command!
   * Method is supposed to run in pipeline only!
   *
   * @returns {Promise<void>}
   */
  public async push(): Promise<void> {
    Screenshots.ensureEnvVarsAreSet([
      'CI_PIPELINE_ID',
      'CI_PIPELINE_URL',
      'CI_PIPELINE_CREATED_AT',
      'CI_COMMIT_REF_NAME'
    ]);

    const {
      CI_PIPELINE_ID,
      CI_COMMIT_REF_NAME,
      CI_PIPELINE_URL,
      CI_PIPELINE_CREATED_AT
    } = process.env as unknown as ICIEnv;

    if (this.reporter) {
      const openedReport = await this.reporter.getLastOpenedReport(CI_PIPELINE_URL, CI_PIPELINE_CREATED_AT);
      if (!openedReport) {
        Screenshots.log(
          'warn',
          'There is no opened slack report related to current pipeline. Nothing to do.'
        );

        return;
      }

      const link = await this.reporter.getReportLink(openedReport.ts as string);
      const isPushApproved = await this.reporter.checkReport(openedReport);
      if (!isPushApproved) {
        throw new ScreenshotsError(
          'You haven\'t got approvals from all affected teams to be able to push screenshots.\n' +
          `You can check the current status in slack report - ${link}.`
        );
      }
    } else {
      Screenshots.log(
        'warn',
        'There is no reporter that can be used for approval procedure. That step will be missed.\n' +
        'For enabling that feature you have to setup reports module in your e2e.config file.'
      );
    }

    // Getting jobs
    // Getting failed jobs artifacts
    const failedJobs = await this.getFailedJobsArtifacts(
      CI_PIPELINE_ID,
      this.screenshotsPath,
      this.screenshotsPath + '.zip'
    );
    if (!failedJobs.length) {
      Screenshots.log(
        'warn',
        `There are no failed jobs with artefacts matching patterns: ${this.ciJobs.join(', ')}. ` +
        'No need in pushing compare app.'
      );

      return;
    }

    // Upload them to s3
    const releaseBranch = CI_COMMIT_REF_NAME;
    const pushedScreenshotsPromises = failedJobs.map(([, sessionOutputPath]) => {
      const sessionOutputDir = path.basename(sessionOutputPath);
      const actualFolder = path.join(sessionOutputPath, path.basename(this.folders.actualFolder));
      const baselineFolder = path.join(sessionOutputPath, path.basename(this.folders.baselineFolder));

      fs.readdirSync(sessionOutputPath).forEach(folder => {
        if (folder !== path.basename(this.folders.actualFolder)) {
          fs.rmdirSync(path.join(sessionOutputPath, folder), { recursive: true });
        }
      });
      fs.renameSync(actualFolder, baselineFolder);

      const zip = new AdmZip();
      const zipName = sessionOutputDir + '.zip';
      const zipPath = sessionOutputPath + '.zip';

      zip.addLocalFolder(sessionOutputPath);
      zip.writeZip(zipPath);

      return this.s3.putObject(releaseBranch, zipName, zipPath);
    });
    const pushedScreenshots = await Promise.all(pushedScreenshotsPromises);
    Screenshots.log(
      'success',
      `The following screenshots have been successfully pushed to branch "${releaseBranch}":\n` +
      pushedScreenshots.join('\n')
    );

    // Restart failed ciJobs
    const failedJobNames = failedJobs.map(([job]) => job.name);
    const failedJobRetries = failedJobs.map(([job]) => this.gitlab.retryPipelineJob(job.id));
    await Promise.all(failedJobRetries);
    Screenshots.log(
      'success',
      'The following failed jobs have been restarted:\n' +
      failedJobNames.join('\n')
    );

    if (this.reporter) {
      // Close slack report
      const openedReport = await this.reporter.getLastOpenedReport(CI_PIPELINE_URL, CI_PIPELINE_CREATED_AT);
      await this.reporter.closeReport(openedReport!, 'Запушена новая версия скриншотов');

      const link = await this.reporter.getReportLink(openedReport!.ts as string);
      Screenshots.log(
        'success',
        `The last opened slack report is now closed - ${link}`
      );
    }
  }

  /**
   * Merge release screenshot branch to master in s3
   *
   * Method gets last release info from gitlab and with it help finds screenshots
   * related to this release.
   * Method is supposed to run in pipeline and master branch only!
   *
   * @returns {Promise<void>}
   */
  public async merge(): Promise<void> {
    const releases = await this.gitlab.getProjectReleases();
    const lastRelease = releases[0];
    const releasePipelineId = lastRelease.tag_name.slice(lastRelease.tag_name.lastIndexOf('-') + 1);
    const releasePipeline = await this.gitlab.getProjectPipeline(releasePipelineId);
    const releaseBranch = releasePipeline.ref;

    // Checking if there are screenshots for release branch in s3
    const isThereScreenshotsForRelease = await this.s3.branchExists(releaseBranch);
    if (isThereScreenshotsForRelease) {
      // Merge release into default branch
      await this.s3.mergeBranch(releaseBranch, Screenshots.DEFAULT_BRANCH);
      Screenshots.log(
        'success',
        `Files from branch "${releaseBranch}" have been successfully merged to branch "${Screenshots.DEFAULT_BRANCH}".`
      );

      if (this.reporter) {
        const openedReport = await this.reporter.getLastOpenedReport(releasePipeline.web_url, releasePipeline.created_at);
        await this.reporter.notifyReport(
          openedReport!.ts!,
          `Файлы из ветки ${releaseBranch} успешно смержены в ветку ${Screenshots.DEFAULT_BRANCH}`
        );
      }
    } else {
      Screenshots.log(
        'warn',
        `There are no files related to release branch "${releaseBranch}". Nothing to merge.`
      );
    }

    // Checking if there are opened reports
    if (this.reporter) {
      const openedReports = await this.reporter.getAllOpenedReports(releasePipeline.web_url, releasePipeline.created_at);
      if (openedReports.length) {
        await Promise.all(openedReports.map(report =>
          this.reporter!.closeReport(report, 'Релиз завершен'))
        );

        const links = await Promise.all(openedReports.map(report =>
          this.reporter!.getReportLink(report.ts as string)
        ));

        Screenshots.log(
          'warn',
          'There were opened slack reports which now are closed:\n' +
          links.join('\n')
        );
      }
    }
  }

  public async report(): Promise<void> {
    if (!this.reporter) {
      throw new ScreenshotsError('You need to enable reports module in your e2e.config file');
    }

    Screenshots.ensureEnvVarsAreSet([
      'CI_PIPELINE_ID',
      'CI_PIPELINE_URL',
      'CI_PIPELINE_CREATED_AT',
      'CI_COMMIT_REF_NAME'
    ]);

    const {
      CI_PIPELINE_ID,
      CI_PIPELINE_URL,
      CI_PIPELINE_CREATED_AT,
      CI_COMMIT_REF_NAME
    } = process.env as unknown as ICIEnv;

    const failedJobs = await this.getFailedJobsArtifacts(
      CI_PIPELINE_ID,
      this.reporter.reportsPath,
      this.reporter.reportsPath + '.zip'
    );
    if (!failedJobs.length) {
      Screenshots.log(
        'warn',
        `There are no failed jobs matching patterns: ${this.ciJobs.join(', ')}. ` +
        'No need in sending report to slack.'
      );

      return;
    }

    // Checking if there is an opened report
    const openedReport = await this.reporter.getLastOpenedReport(CI_PIPELINE_URL, CI_PIPELINE_CREATED_AT);
    if (openedReport) {
      const openedReportTimestampInMs = +openedReport.ts! * 1e3;
      const firstFailedJob = failedJobs[0][0];

      if (
        failedJobs.length &&
        (new Date(openedReportTimestampInMs) > new Date(firstFailedJob.started_at!))
      ) return;

      const link = await this.reporter.getReportLink(openedReport.ts as string);
      await this.reporter.closeReport(openedReport, 'Тесты были перезапущены без пуша новой версии скриншотов');
      Screenshots.log(
        'warn',
        `There was an opened slack report which now is closed - ${link}`
      );
    }

    // Send report to slack
    const report = await this.reporter.sendReport(
      CI_COMMIT_REF_NAME,
      CI_PIPELINE_URL,
      this.s3.getObjectLink(CI_COMMIT_REF_NAME, Screenshots.COMPARE_APP_NAME)
    );
    const link = await this.reporter.getReportLink(report.ts as string);
    Screenshots.log(
      'success',
      `Slack report is successfully created - ${link}`
    );
  }

  public async compareApp(): Promise<void> {
    Screenshots.ensureEnvVarsAreSet([
      'CI_PIPELINE_ID',
      'CI_COMMIT_REF_NAME'
    ]);

    const {
      CI_PIPELINE_ID,
      CI_COMMIT_REF_NAME
    } = process.env as unknown as ICIEnv;

    // Getting failed jobs artifacts
    const failedJobs = await this.getFailedJobsArtifacts(
      CI_PIPELINE_ID,
      this.screenshotsPath,
      this.screenshotsPath + '.zip'
    );
    if (!failedJobs.length) {
      Screenshots.log(
        'warn',
        `There are no failed jobs with artefacts matching patterns: ${this.ciJobs.join(', ')}. ` +
        'No need in pushing compare app.'
      );

      return;
    }

    // Building a compare app
    const appFileName = Screenshots.COMPARE_APP_NAME;
    const appFilePath = path.join(this.screenshotsPath, appFileName);
    buildCompareApp(this.screenshotsPath, appFilePath);

    // Deploy on s3
    const releaseBranch = CI_COMMIT_REF_NAME;
    await this.s3.putObject(releaseBranch, appFileName, appFilePath, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': 0
    });

    const link = this.s3.getObjectLink(releaseBranch, appFileName);
    Screenshots.log(
      'success',
      `Compare app have been successfully pushed to branch ${releaseBranch}:\n` +
      link
    );
  }

  private async getFailedJobsArtifacts(
    pipelineId: string,
    outputPath: string,
    artifactsPath: string
  ): Promise<[IGitlabJob, string][]> {
    const jobs = await this.gitlab.getPipelineJobsAll(pipelineId);
    const matchedJobs = jobs.filter(job => this.ciJobs.find(regexp => job.name.match(regexp)));

    // Checking jobs are finished
    const unfinishedJobs = matchedJobs.filter(job => job.status !== 'manual' && job.finished_at === null);
    if (unfinishedJobs.length) {
      const unfinishedJobNames = unfinishedJobs.map(job => job.name);
      throw new ScreenshotsError(
        'There are jobs you need to wait until they are finished:\n' +
        unfinishedJobNames.join('\n')
      );
    }

    const failedJobs = matchedJobs.filter(job => job.status === 'failed');
    if (!failedJobs.length) return [];

    // Download failed jobs artifacts
    const jobWithArtifacts: [IGitlabJob, string][] = [];
    const jobWithoutArtifacts: string[] = [];
    await Promise.all(failedJobs.map(job =>
      this.gitlab
        .getJobArtifacts(job.id, outputPath, artifactsPath)
        .then(path => jobWithArtifacts.push([job, path]))
        .catch(() => jobWithoutArtifacts.push(job.name))
    ));

    if (jobWithoutArtifacts.length) {
      Screenshots.log(
        'warn',
        'The following screenshots are not found in gitlab:\n' +
        jobWithoutArtifacts.join('\n')
      );
    }

    return jobWithArtifacts;
  }

  private static log(type: 'success' | 'warn', message: string) {
    consola[type](`[${Screenshots.CLASS_NAME}]: ${message}`);
  }
}

import fs from 'fs';
import path from 'path';
import type ChannelsHistoryResponse from '@slack/web-api/dist/response/ChannelsHistoryResponse';
import type ChatPostMessageResponse from '@slack/web-api/dist/response/ChatPostMessageResponse';
import type { ChatPostMessageArguments, ContextBlock, DividerBlock, MrkdwnElement, SectionBlock } from '@slack/web-api';
import type { IE2ERunnerConfig, IReportGroup, IReportUser, IWdio } from '@bx-fe/e2e-runner-types';

import { Slack } from '~/src/classes/slack';
import { Runner } from '~/src/classes/runner';
import { ScreenshotsError } from '~/src/classes/error';
import { defaultReportsConfig } from '~/src/configs/runner';

interface IJobForScreenshotsSlackReport {
  name: string;
  url: string;
  suite: string;
  tests: string[];
  allureLaunchUrl: string;
}

type IScreenshotsSlackReport = ChannelsHistoryResponse.Message & {
  text: string;
  blocks: (SectionBlock | DividerBlock | ContextBlock)[];
};

interface IScreenshotsReporterUI {
  approved: string;
}

export class ScreenshotsReporter {
  public readonly reportsPath: string;
  private readonly reporter: Slack;
  private static readonly REPORT_STATUS_OPENED: string = 'opened';
  private static readonly REPORT_STATUS_CLOSED: string = 'closed';
  private static readonly ui: IScreenshotsReporterUI = {
    approved: 'approved'
  };

  constructor(_runnerConfig: IE2ERunnerConfig | string) {
    const runnerConfig = Runner.getConfig(_runnerConfig);

    if (!runnerConfig.reports) {
      throw new ScreenshotsError('You need to enable reports module in your e2e.config file');
    }

    const config = Object.assign(defaultReportsConfig, runnerConfig.reports);
    this.reporter = new Slack(config.reporter);
    this.reportsPath = path.join(runnerConfig.outputDir, config.reportsDir);
  }

  public sendReport(
    branch: string,
    pipelineUrl: string,
    compareAppUrl: string
  ): Promise<ChatPostMessageResponse.Message> {
    return this.reporter.postMessage(this.buildReport(branch, pipelineUrl, compareAppUrl));
  }

  public async closeReport(report: IScreenshotsSlackReport, reason: string): Promise<IScreenshotsSlackReport> {
    const dev = report.blocks.find(block =>
      block.type === 'context' &&
      block.block_id === 'dev'
    ) as ContextBlock;
    const mrkdwn = dev.elements[0] as MrkdwnElement;
    mrkdwn.text = mrkdwn.text.replace(
      ScreenshotsReporter.REPORT_STATUS_OPENED,
      ScreenshotsReporter.REPORT_STATUS_CLOSED
    );

    const updatedReport = await this.reporter.updateMessage({
      text: 'Скриншот тестирование завершено успешно',
      blocks: report.blocks,
      ts: report.ts
    });

    await this.notifyReport(
      report.ts as string,
      `Отчет закрыт по причине - *${reason}*`
    );

    return updatedReport as IScreenshotsSlackReport;
  }

  public notifyReport(ts: string, text: string): Promise<ChatPostMessageResponse.Message> {
    return this.reporter.postMessage({
      text: 'Получена новая информация о ходе скриншот тестирования',
      thread_ts: ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `_${text}_`
          }
        }
      ]
    });
  }

  public async getLastOpenedReport(
    pipelineUrl: string,
    pipelineCreatedAt: string
  ): Promise<IScreenshotsSlackReport | undefined> {
    const oldest = new Date(pipelineCreatedAt).getTime() / 1e3;
    const report = await this.reporter.findMessage(
      msg => ScreenshotsReporter.checkIfMessageIsOpenedReport(msg, pipelineUrl),
      { oldest: oldest.toString() }
    );

    return report as IScreenshotsSlackReport | undefined;
  }

  public async getAllOpenedReports(
    pipelineUrl: string,
    pipelineCreatedAt: string
  ): Promise<IScreenshotsSlackReport[]> {
    const oldest = new Date(pipelineCreatedAt).getTime() / 1e3;
    const messages = await this.reporter.filterMessages(
      msg => ScreenshotsReporter.checkIfMessageIsOpenedReport(msg, pipelineUrl),
      { oldest: oldest.toString() }
    );

    return messages as IScreenshotsSlackReport[];
  }

  public async checkReport(report: IScreenshotsSlackReport): Promise<boolean> {
    const reaction = await this.reporter.findReaction(
      item => item.name === ScreenshotsReporter.ui.approved,
      { timestamp: report.ts }
    );
    if (!reaction) return false;

    const arUserWeGotApproveForm = reaction.users || [];
    const setUserWeGotApproveFrom: Set<string> = new Set();
    arUserWeGotApproveForm.forEach(memberId => setUserWeGotApproveFrom.add(memberId));

    // Approvals from groups checking
    const arGroupWeNeedApproveFrom: IReportGroup[] = [];
    report.blocks.forEach(block => {
      if (block.type === 'section' && block.block_id?.startsWith('body_groups')) {
        const slackGroupId = block.block_id.split('_')[2];
        const slackGroup = this.reporter.groups.find(group => group.id === slackGroupId);

        if (slackGroup) {
          arGroupWeNeedApproveFrom.push(slackGroup);
        }
      }
    });

    if (arGroupWeNeedApproveFrom.length) {
      const arGroupWeNotGotApproveFrom: IReportUser[] = [];
      arGroupWeNeedApproveFrom.forEach(group => {
        const isTeamGaveApprove = Boolean(group.users.find(user => setUserWeGotApproveFrom.has(user.id)));
        if (!isTeamGaveApprove) arGroupWeNotGotApproveFrom.push(group);
      });

      if (arGroupWeNotGotApproveFrom.length > 0) {
        return false;
      }
    }

    // Approvals from non-group default users checking
    const isThereTestsWithNoGroup = Boolean(report.blocks.find(block =>
      block.type === 'section' && block.block_id?.startsWith('body_no_groups')
    ));
    if (isThereTestsWithNoGroup) {
      const users = this.reporter.defaultUsers;
      const hasWeGotDefaultUsersApprove = Boolean(users.find(user => setUserWeGotApproveFrom.has(user.id)));

      if (!hasWeGotDefaultUsersApprove) {
        return false;
      }
    }

    return true;
  }

  public getReportLink(ts: string): Promise<string> {
    return this.reporter.getPermalink({ message_ts: ts });
  }

  private buildReport(
    branch: string,
    pipelineUrl: string,
    compareAppUrl: string
  ): ChatPostMessageArguments {
    const header: SectionBlock = {
      block_id: 'header',
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${pipelineUrl}|${branch}> | <${compareAppUrl}|Сравнить> `
      }
    };
    const body: (SectionBlock | ContextBlock | DividerBlock)[] = [];
    const footer: ContextBlock = {
      block_id: 'footer',
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text:
          `Используйте реакцию :${ScreenshotsReporter.ui.approved}: ` +
          'на этом сообщение для предоставления апрува от лица вашей команды.\n' +
          '*Не используйте данную реакцию, если вы не являетесь членом одной из ответственных команд.*'
      }]
    };
    const dev: ContextBlock = {
      block_id: 'dev',
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `_Report status_: *${ScreenshotsReporter.REPORT_STATUS_OPENED}*`
      }]
    };
    const divider: DividerBlock = { type: 'divider' };

    const reportGroupSet: Set<string> = new Set(this.reporter.groups.map(i => i.id));
    const jobsByGroupMap = new Map<string, IJobForScreenshotsSlackReport[]>();
    const arJobsWithoutGroup: IJobForScreenshotsSlackReport[] = [];
    fs.readdirSync(this.reportsPath).forEach(_path => {
      const report = require(path.join(this.reportsPath, _path)) as IWdio['session'];
      const { passed, title, reportGroupId, tests } = report.suite;

      if (passed) return;

      const job = {
        name: report.ci!.job.name,
        url: report.ci!.job.url,
        suite: title,
        tests: tests.map(item => item.title),
        allureLaunchUrl: report.allureLaunchUrl as string,
      };

      if (reportGroupId && reportGroupSet.has(reportGroupId)) {
        if (!jobsByGroupMap.has(reportGroupId)) {
          jobsByGroupMap.set(reportGroupId, []);
        }
        const jobs = jobsByGroupMap.get(reportGroupId) as IJobForScreenshotsSlackReport[];
        jobs.push(job);
      } else {
        arJobsWithoutGroup.push(job);
      }
    });

    // Tests with responsible groups handling
    if (jobsByGroupMap.size) {
      body.push(
        {
          type: 'context',
          elements: [{
            type: 'mrkdwn',
            text:
              ':warning: *Следующие тесты должны быть одобрены ответственными командами*'
          }]
        },
        divider
      );

      jobsByGroupMap.forEach((jobs, slackGroupId) => {
        const group = this.reporter.groups.find(item => item.id === slackGroupId) as IReportGroup;
        let text = `*${group.id}*\n`;

        jobs.forEach(job => {
          text += this.buildJobReport(job);
        });

        text += `:man-woman-girl-boy:  Пользователи: ${group.users.map(user => `<@${user.id}>`).join(' ')}`;

        body.push({
          block_id: `body_groups_${group.id}`,
          type: 'section',
          text: {
            type: 'mrkdwn',
            text
          },
        });
      });
    }

    // Tests with no responsible group handling
    if (arJobsWithoutGroup.length) {
      body.push(
        {
          type: 'context',
          elements: [{
            type: 'mrkdwn',
            text: ':warning: *Следующие тесты должны быть одобрены группой пользователей по умолчанию*'
          }]
        },
        divider
      );

      let text = '';

      arJobsWithoutGroup.forEach(job => {
        text += this.buildJobReport(job);
      });

      const users = this.reporter.defaultUsers;
      text += `:man-woman-girl-boy:  Пользователи: ${users.map(user => `<@${user.id}>`).join(' ')}`;

      body.push({
        block_id: 'body_no_groups',
        type: 'section',
        text: {
          type: 'mrkdwn',
          text
        },
      });
    }

    return {
      text: 'Скриншот тестирование завершено с ошибками',
      blocks: [
        header,
        ...body,
        divider,
        footer,
        divider,
        dev,
      ],
    } as ChatPostMessageArguments;
  }

  private buildJobReport(job: IJobForScreenshotsSlackReport): string {
    let text = `:gitlab:  <${job.url}|${job.name}> | <${job.allureLaunchUrl}|Report>\n`;

    job.tests.forEach(test => {
      text += `\t\t — \`${test}\`\n`;
    });

    return text;
  }

  private static checkIfMessageIsOpenedReport(msg: ChannelsHistoryResponse.Message, pipelineUrl: string): boolean {
    if (!msg.blocks) return false;

    const header = msg.blocks.find(block =>
      block.type === 'section' &&
      block.block_id === 'header'
    ) as SectionBlock | undefined;

    const isReportRelatedToPipeline = header?.text?.text.includes(pipelineUrl);
    if (!isReportRelatedToPipeline) return false;

    const dev = msg.blocks.find(block =>
      block.type === 'context' &&
      block.block_id === 'dev'
    ) as ContextBlock | undefined;
    if (!dev) return false;

    const mrkdwn = dev.elements.find(block => block.type === 'mrkdwn') as MrkdwnElement | undefined;
    if (!mrkdwn) return false;

    return mrkdwn.text.includes(ScreenshotsReporter.REPORT_STATUS_OPENED);
  }
}

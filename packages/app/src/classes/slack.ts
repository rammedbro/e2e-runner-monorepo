/* eslint-disable @typescript-eslint/ban-ts-comment */
import { WebClient } from '@slack/web-api';
import type { ISlackReporterConfig, IReportGroup, IReportUser } from '@bx-fe/e2e-runner-types';
import type ChatPostMessageResponse from '@slack/web-api/dist/response/ChatPostMessageResponse';
import type ChannelsHistoryResponse from '@slack/web-api/dist/response/ChannelsHistoryResponse';
import type ChatUpdateResponse from '@slack/web-api/dist/response/ChatUpdateResponse';
import type ReactionsGetResponse from '@slack/web-api/dist/response/ReactionsGetResponse';
import type {
  ChatPostMessageArguments,
  ConversationsHistoryArguments,
  ReactionsGetArguments,
  ChatGetPermalinkArguments,
  ChatUpdateArguments,
  ConversationsHistoryResponse,
  WebAPICallError
} from '@slack/web-api';

import { defaultSlackConfig } from '~/src/configs/slack';
import { SlackError } from '~/src/classes/error';

type TSlackMethodOptions<T> = Omit<T, 'channel'>;

export class Slack {
  public readonly groups: IReportGroup[];
  public readonly defaultUsers: IReportUser[];
  private readonly channelId: string;
  private readonly client: WebClient;

  constructor(config: ISlackReporterConfig) {
    const {
      botToken,
      channelId,
      groups = [],
      defaultUsers
    } = Object.assign(defaultSlackConfig, config);

    this.client = new WebClient(botToken);
    this.channelId = channelId;
    this.groups = groups;
    this.defaultUsers = defaultUsers;
  }

  async postMessage(
    options: TSlackMethodOptions<ChatPostMessageArguments>
  ): Promise<ChatPostMessageResponse.Message> {
    const { message, error } = await this.client.chat.postMessage({
      ...options,
      channel: this.channelId
    }).catch(e => {
      throw new SlackError((e as WebAPICallError).message);
    });

    if (!message) {
      throw new SlackError(error as string);
    }

    return message;
  }

  async updateMessage(
    options: TSlackMethodOptions<ChatUpdateArguments>
  ): Promise<ChatUpdateResponse.Message> {
    // @ts-ignore
    const { message, error } = await this.client.chat.update({
      ...options,
      channel: this.channelId
    }).catch(e => {
      throw new SlackError((e as WebAPICallError).message);
    });

    if (!message) {
      throw new SlackError(error as string);
    }

    return message;
  }

  async findMessage(
    callback: (msg: ChannelsHistoryResponse.Message) => boolean,
    options: TSlackMethodOptions<ConversationsHistoryArguments>
  ): Promise<ChannelsHistoryResponse.Message | undefined> {
    let result: ChannelsHistoryResponse.Message | undefined;
    let cursor: string | undefined = '';

    do {
      // @ts-ignore
      const response: ConversationsHistoryResponse = await this.client.conversations.history({
        ...options,
        limit: 100,
        channel: this.channelId,
        cursor
      }).catch(e => {
        throw new SlackError((e as WebAPICallError).message);
      });
      const messages = response.messages || [];
      const metadata = response.response_metadata || {};

      result = messages.find(callback);
      cursor = metadata.next_cursor;
    } while (!result && cursor);

    return result;
  }

  async filterMessages(
    callback: (msg: ChannelsHistoryResponse.Message) => boolean,
    options: TSlackMethodOptions<ConversationsHistoryArguments>
  ): Promise<ChannelsHistoryResponse.Message[]> {
    const result: ChannelsHistoryResponse.Message[] = [];
    let cursor: string | undefined = '';

    do {
      // @ts-ignore
      const response: ConversationsHistoryResponse = await this.client.conversations.history({
        ...options,
        limit: 100,
        channel: this.channelId,
        cursor
      }).catch(e => {
        throw new SlackError((e as WebAPICallError).message);
      });
      const messages = response.messages || [];
      const metadata = response.response_metadata || {};

      result.push(...messages.filter(callback));
      cursor = metadata.next_cursor;
    } while (cursor);

    return result;
  }

  async findReaction(
    callback: (msg: ReactionsGetResponse.Reaction) => boolean,
    options: TSlackMethodOptions<ReactionsGetArguments>
  ): Promise<ReactionsGetResponse.Reaction | undefined> {
    const { message = {} } = await this.client.reactions.get({
      ...options,
      channel: this.channelId,
    }).catch(e => {
      throw new SlackError((e as WebAPICallError).message);
    });
    const { reactions = [] } = message;

    return reactions.find(callback);
  }

  async getPermalink(options: TSlackMethodOptions<ChatGetPermalinkArguments>): Promise<string> {
    // @ts-ignore
    const { permalink, error } = await this.client.chat.getPermalink({
      ...options,
      channel: this.channelId
    }).catch(e => {
      throw new SlackError((e as WebAPICallError).message);
    });

    if (!permalink) {
      throw new SlackError(error as string);
    }

    return permalink;
  }
}

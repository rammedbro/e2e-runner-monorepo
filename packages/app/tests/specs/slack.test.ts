import { WebClient } from '@slack/web-api';
import { mocked } from 'ts-jest/utils';

import { Slack } from '~/src/classes/slack';
import { runnerConfig } from '~/tests/utils/config';

const mockedWebClient = mocked(new WebClient());
const mockedWebClientChat = mocked(mockedWebClient.chat);
const mockedWebClientConversations = mocked(mockedWebClient.conversations);
const mockedWebClientReactions = mocked(mockedWebClient.reactions);

describe('slack', () => {
  const slack = new Slack(runnerConfig.reports!.reporter);

  describe('postMessage', () => {
    it('should return sent message', async () => {
      mockedWebClientChat.postMessage.mockImplementation(async (options) =>
        ({ ok: true, message: { text: options!.text } })
      );

      const expectedMessage = { text: 'Message' };
      const receivedMessage = await slack.postMessage(expectedMessage);

      expect(receivedMessage).toMatchObject(expectedMessage);
    });

    it('should thrown an exception when message in response is undefined', async () => {
      const error = 'something_went_wrong';

      mockedWebClientChat.postMessage.mockResolvedValue({
        ok: false,
        message: undefined,
        error
      });
      await expect(slack.postMessage({})).rejects.toThrow(error);
    });

    it('should thrown an exception when request is invalid', async () => {
      const error = 'something_went_wrong';

      mockedWebClientChat.postMessage.mockRejectedValue({
        ok: false,
        message: error
      });
      await expect(slack.postMessage({})).rejects.toThrow(error);
    });
  });

  describe('updateMessage', () => {
    it('should return updated message', async () => {
      mockedWebClientChat.update.mockImplementation(async (options) =>
        ({ ok: true, message: { text: options!.text } })
      );

      const expectedMessage = { text: 'Updated message' };
      const receivedMessage = await slack.updateMessage(expectedMessage);

      expect(receivedMessage).toMatchObject(expectedMessage);
    });

    it('should thrown an exception when message in response is undefined', async () => {
      const error = 'something_went_wrong';

      mockedWebClientChat.update.mockResolvedValue({
        ok: false,
        message: undefined,
        error
      });
      await expect(slack.updateMessage({})).rejects.toThrow(error);
    });

    it('should thrown an exception when request is invalid', async () => {
      const error = 'something_went_wrong';

      mockedWebClientChat.update.mockRejectedValue({
        ok: false,
        message: error
      });
      await expect(slack.updateMessage({})).rejects.toThrow(error);
    });
  });

  describe('getPermalink', () => {
    it('should return link of message by its timestamp', async () => {
      const ts = Date.now();
      mockedWebClientChat.getPermalink.mockImplementation(async (options) => ({
        ok: true,
        permalink: `https://ozon.slack.com/archives/CAAHJP2LE/p${options!.message_ts}`
      }));

      const expectedLink = `https://ozon.slack.com/archives/CAAHJP2LE/p${ts}`;
      const receivedLink = await slack.getPermalink({ message_ts: ts });

      expect(receivedLink).toEqual(expectedLink);
    });

    it('should thrown an exception when link in response is undefined', async () => {
      const error = 'something_went_wrong';

      mockedWebClientChat.getPermalink.mockResolvedValue({
        ok: false,
        permalink: undefined,
        error
      });
      await expect(slack.getPermalink({})).rejects.toThrow(error);
    });

    it('should thrown an exception when request is invalid', async () => {
      const error = 'something_went_wrong';

      mockedWebClientChat.getPermalink.mockRejectedValue({
        ok: false,
        message: error
      });
      await expect(slack.getPermalink({})).rejects.toThrow(error);
    });
  });

  describe('findMessage', () => {
    beforeEach(() => {
      mockedWebClientConversations.history.mockClear();
    });

    it('should return message matching provided condition', async () => {
      const expectedMessage = 'Message that we need to find';
      const messages = [
        [{ text: 'Message' }],
        [{ text: 'Message' }],
        [{ text: expectedMessage }],
        [{ text: 'Message' }],
        [{ text: 'Message' }],
      ];

      mockedWebClientConversations.history.mockImplementation(
        async (options) => {
          const cursor = Number(options!.cursor) || 0;
          const nextCursor = cursor < messages.length
            ? (cursor + 1).toString()
            : '';

          return {
            ok: true,
            messages: messages[cursor],
            response_metadata: { next_cursor: nextCursor }
          };
        }
      );

      const receivedMessage = await slack.findMessage(
        item => item.text === expectedMessage,
        {}
      );

      expect(mockedWebClientConversations.history).toHaveBeenCalledTimes(3);
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage!.text).toEqual(expectedMessage);
    });

    it('should return undefined if message doesnt exist', async () => {
      mockedWebClientConversations.history.mockResolvedValue({
        ok: true,
      });

      const receivedMessage = await slack.findMessage(() => true, {});

      expect(mockedWebClientConversations.history).toHaveBeenCalledTimes(1);
      expect(receivedMessage).toBeUndefined();
    });

    it('should thrown an exception when request is invalid', async () => {
      const error = 'something_went_wrong';

      mockedWebClientConversations.history.mockRejectedValue({
        ok: false,
        message: error
      });
      await expect(slack.findMessage(() => true, {})).rejects.toThrow(error);
    });
  });

  describe('filterMessages', () => {
    beforeEach(() => {
      mockedWebClientConversations.history.mockClear();
    });

    it('should return all messages matching provided condition', async () => {
      const expectedMessage = 'Message that we need to find';
      const messages = [
        [{ text: expectedMessage }],
        [{ text: 'Message' }],
        [{ text: expectedMessage }],
        [{ text: 'Message' }],
        [{ text: expectedMessage }],
      ];

      mockedWebClientConversations.history.mockImplementation(
        async (options) => {
          const cursor = Number(options!.cursor) || 0;
          const nextCursor = cursor < messages.length
            ? (cursor + 1).toString()
            : '';

          return {
            ok: true,
            messages: messages[cursor],
            response_metadata: { next_cursor: nextCursor }
          };
        }
      );

      const receivedMessages = await slack.filterMessages(
        item => item.text === expectedMessage,
        {}
      );

      expect(mockedWebClientConversations.history).toHaveBeenCalledTimes(6);
      expect(receivedMessages).toHaveLength(3);
    });

    it('should return an empty array if no message matching provided condition', async () => {
      mockedWebClientConversations.history.mockResolvedValue({
        ok: true,
      });

      const receivedMessages = await slack.filterMessages(() => true, {});

      expect(mockedWebClientConversations.history).toHaveBeenCalledTimes(1);
      expect(receivedMessages).toHaveLength(0);
    });

    it('should thrown an exception when request is invalid', async () => {
      const error = 'something_went_wrong';

      mockedWebClientConversations.history.mockRejectedValue({
        ok: false,
        message: error
      });
      await expect(slack.filterMessages(() => true, {})).rejects.toThrow(error);
    });
  });

  describe('findReaction', () => {
    it('should return reaction if it exists', async () => {
      const reaction = { name: 'approved' };

      mockedWebClientReactions.get.mockResolvedValue({
        ok: true,
        message: { reactions: [reaction] }
      });

      const receivedReaction = await slack.findReaction(
        item => item.name === reaction.name,
        {}
      );

      expect(receivedReaction).toMatchObject(reaction);
    });

    it('should return undefined if reaction doesnt exist', async () => {
      const reaction = { name: 'approved' };

      mockedWebClientReactions.get.mockResolvedValue({
        ok: true,
        message: { reactions: [reaction] }
      });

      const receivedReaction = await slack.findReaction(
        item => item.name === 'non-existent-reaction',
        {}
      );

      expect(receivedReaction).toBeUndefined();
    });

    it('should thrown an exception when request is invalid', async () => {
      const error = 'something_went_wrong';

      mockedWebClientReactions.get.mockRejectedValue({
        ok: false,
        message: error
      });
      await expect(slack.findReaction(() => true, {})).rejects.toThrow(error);
    });
  });
});

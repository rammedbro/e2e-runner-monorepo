const postMessage = jest.fn();
const updateMessage = jest.fn();
const findMessage = jest.fn();
const findReaction = jest.fn();
const getPermalink = jest.fn();

export const Slack = jest.fn().mockImplementation(() => ({
  postMessage,
  updateMessage,
  findMessage,
  findReaction,
  getPermalink
}));

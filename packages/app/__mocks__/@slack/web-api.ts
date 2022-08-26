const chat = {
  postMessage: jest.fn(),
  update: jest.fn(),
  getPermalink: jest.fn()
};

const conversations = {
  history: jest.fn()
};

const reactions = {
  get: jest.fn()
};

export const WebClient = jest.fn().mockImplementation(() => ({
  chat,
  conversations,
  reactions
}));

class CustomError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.message = `[${name}]: ${this.message}`;
  }
}

export class AllureError extends CustomError {
  constructor(message: string) {
    super('AllureError', message);
  }
}

export class GitlabApiError extends CustomError {
  constructor(message: string) {
    super('GitlabApiError', message);
  }
}

export class RunnerError extends CustomError {
  constructor(message: string) {
    super('RunnerError', message);
  }
}

export class ScreenshotsError extends CustomError {
  constructor(message: string) {
    super('ScreenshotsError', message);
  }
}

export class S3Error extends CustomError {
  constructor(message: string) {
    super('S3Error', message);
  }
}

export class WdioError extends CustomError {
  constructor(message: string) {
    super('WdioError', message);
  }
}

export class SlackError extends CustomError {
  constructor(message: string) {
    super('SlackError', message);
  }
}

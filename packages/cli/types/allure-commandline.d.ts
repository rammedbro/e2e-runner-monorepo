declare module 'allure-commandline' {
  interface AllureCliCall {
    on(event: 'exit', callback: (exitCode: number) => void): void;
  }

  export default function (args: string[]): AllureCliCall;
}

declare module '@babel/register' {
  function register(options: {
    presets?: string[];
    extensions?: string[];
    cache?: boolean;
  }): void;

  export default register;
}

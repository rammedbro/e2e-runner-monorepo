const path = require('path');

const appConfig = require('./rollup.config.app');

module.exports = [
  {
    name: 'main',
    config: {
      input: path.join(__dirname, 'src', 'index.ts'),
      output: {
        file: path.join(__dirname, 'dist', 'index.js'),
        format: 'cjs',
      },
    }
  },
  {
    name: 'app',
    options: {
      types: false,
    },
    config: {
      input: path.join(__dirname, appConfig.input),
      output: {
        ...appConfig.output,
        file: path.join(__dirname, appConfig.output.file)
      },
      plugins: appConfig.plugins,
      external: []
    }
  }
];

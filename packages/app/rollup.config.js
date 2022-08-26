const path = require('path');

const basePath = __dirname;
const distPath = path.join(basePath, 'dist');

module.exports = [
  {
    name: 'main',
    config: {
      input: path.join(basePath, 'src', 'index.ts'),
      output: {
        file: path.join(distPath, 'index.js'),
        format: 'cjs',
      },
    }
  },
  {
    name: 'wdio',
    options: {
      types: false
    },
    config: {
      input: path.join(basePath, 'src', 'wdio.config.js'),
      output: {
        file: path.join(distPath, 'wdio.config.js'),
        format: 'cjs',
      },
    }
  }
];

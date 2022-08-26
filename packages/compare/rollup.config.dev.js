const replace = require('@rollup/plugin-replace');
const livereload = require('rollup-plugin-livereload');

const appConfig = require('./rollup.config.app');
const { serve } = require('./helpers/rollup');
const { promptScreenshotPath } = require('./helpers/prompt');
const { parseScreenshotTestsData } = require('./dist'); // You need to build compare package first!

module.exports = async function () {
  const screenshotsInputPath = await promptScreenshotPath();

  appConfig.plugins.push(
    replace({
      preventAssignment: true,
      values: {
        '__TESTS__': JSON.stringify(parseScreenshotTestsData(screenshotsInputPath))
      }
    }),
    serve(),
    livereload('dist/app')
  );

  return appConfig;
};

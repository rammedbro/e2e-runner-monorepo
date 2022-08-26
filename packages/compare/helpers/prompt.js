const inquirer = require('inquirer');

async function promptScreenshotPath() {
  const { outputPath } = await inquirer.prompt({
    type: 'input',
    name: 'outputPath',
    message: 'Enter a path where you keep screenshot files:'
  });

  return outputPath;
}

module.exports = {
  promptScreenshotPath
};

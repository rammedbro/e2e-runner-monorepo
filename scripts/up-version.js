require('module-alias/register');
const path = require('path');
const git = require('simple-git')();
const inquirer = require('inquirer');

const {
  upIrrelevantPackagesVersions,
  writeToPackageJsonFile,
} = require('~/helpers/packages');

(async function () {
  const { files: uncommittedFiles } = await git.diffSummary();
  if (uncommittedFiles.length) {
    throw new Error(
      'Working tree has uncommitted changes, ' +
      'please commit or remove the following changes before continuing:\n' +
      uncommittedFiles.map(file => file.file).join('\n')
    );
  }

  const irrelevantPackages = await upIrrelevantPackagesVersions();
  if (!irrelevantPackages.length) {
    console.log('Package\'s version are relevant. No need in up version.');
    return;
  }

  const { commitMsg } = await inquirer.prompt({
    type: 'input',
    name: 'commitMsg',
    message: 'Enter a commit message:',
    default:
      'Up version of irrelevant packages and their co-dependencies:\n' +
      '* ' + irrelevantPackages.map(([pkg]) => pkg.name).join('\n * ')
  });

  irrelevantPackages.forEach(([pkg, json]) => writeToPackageJsonFile(pkg, json));

  await git.add(irrelevantPackages.map(([pkg]) => path.join(pkg.location, 'package.json')));
  await git.commit(commitMsg);
})().catch(e => {
  console.log(e.message);
  process.exit(1);
});

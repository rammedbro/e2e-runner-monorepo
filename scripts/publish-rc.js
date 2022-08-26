require('module-alias/register');
const git = require('simple-git')();

const { execSync } = require('~/helpers/node');
const { getJiraTaskId } = require('~/helpers/git');
const {
  getPackages,
  getPackageLatestVersionFromNexus,
  sortPackagesTopologically,
  updatePackageDependencyVersion,
  writeToPackageJsonFile
} = require('~/helpers/packages');
const lernaJson = require('~/lerna.json');

const {
  CI_COMMIT_REF_NAME
} = process.env;

(async function () {
  const { registry } = lernaJson.command.publish;
  const registryParts = registry.split('/repository/');
  const host = registryParts[0];
  const repository = registryParts[1].replace('/', '');
  const taskId = getJiraTaskId(CI_COMMIT_REF_NAME);
  const packages = await getPackages();
  const sortedPackages = await sortPackagesTopologically(packages);
  const changedPackages = new Map();

  for (const pkg of sortedPackages) {
    const rcPkgName = `${pkg.name}-${taskId.toLowerCase()}`;
    const latestVersion = await getPackageLatestVersionFromNexus(rcPkgName) || '1.0.0';
    const latestVersionParts = latestVersion.split('.');
    latestVersionParts[2]++;
    const rcPkgVersion = latestVersionParts.join('.');

    const pkgJson = pkg.toJSON();
    pkgJson.name = rcPkgName;
    pkgJson.version = rcPkgVersion;

    changedPackages.forEach((depVersion, depName) => updatePackageDependencyVersion(
      pkgJson,
      depName,
      depVersion
    ));

    writeToPackageJsonFile(pkg, pkgJson);
    await execSync(`npm publish ${pkg.location} --registry ${registry}`);

    const link = `${host}/#browse/browse:${repository}:${encodeURIComponent(rcPkgName)}`;
    console.log(
      `Package ${rcPkgName} is published successfully: ${link}\n` +
      'You can add it to your project by running the command below: ' +
      `yarn add ${pkg.name}@npm:${rcPkgName}@${rcPkgVersion}\n\n`
    );

    changedPackages.set(pkg.name, `npm:${rcPkgName}@${rcPkgVersion}`);
  }

  await git.checkout('.');
})().catch(e => {
  console.log(e.message);
  process.exit(1);
});

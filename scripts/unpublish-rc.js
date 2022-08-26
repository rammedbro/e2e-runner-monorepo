require('module-alias/register');

const { execSync } = require('~/helpers/node');
const { getJiraTaskId } = require('~/helpers/git');
const {
  getPackages,
  getPackageLatestVersionFromNexus,
} = require('~/helpers/packages');

const {
  CI_COMMIT_MESSAGE
} = process.env;

(async () => {
  const [, branch] = CI_COMMIT_MESSAGE.match(/Merge branch '(.*)' into/);
  const packages = await getPackages();

  for (const pkg of packages) {
    const taskId = getJiraTaskId(branch);
    const rcPkgName = `${pkg.name}-${taskId.toLowerCase()}`;
    const latestVersion = await getPackageLatestVersionFromNexus(rcPkgName);

    if (!latestVersion) {
      console.log(`Package ${rcPkgName} doesn't exist. Nothing to do.`);
      continue;
    }

    await execSync(`npm unpublish ${rcPkgName} --force`);
    console.log(`Package ${rcPkgName} is unpublished successfully`);
  }
})().catch(e => {
  console.log(e.message);
  process.exit(1);
});

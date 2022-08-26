require('module-alias/register');

const { getIrrelevantPackages } = require('~/helpers/packages');

(async () => {
  const irrelevantPackages = await getIrrelevantPackages();

  if (!irrelevantPackages.length) {
    console.log('Package\'s version are relevant. No need in up version.');
    process.exit(0);
  }

  const strIrrelevantPackages = irrelevantPackages.map(({ pkg, version, latestVersion }) =>
    `${pkg.name}\n` +
    `Current Version: ${version} | Latest Version: ${latestVersion}`
  ).join('\n');
  throw new Error(
    'Some package\'s version are irrelevant:\n' +
    strIrrelevantPackages + '\n\n' +
    'Use "yarn version:up" to up their version.'
  );
})().catch(e => {
  console.log(e.message);
  process.exit(1);
});

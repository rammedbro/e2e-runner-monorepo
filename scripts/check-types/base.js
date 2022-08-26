require('module-alias/register');
const path = require('path');

const { execSync } = require('~/helpers/node');
const { getPackages } = require('~/helpers/packages');

(async function () {
  const packages = await getPackages();
  const errors = [];

  for (const pkg of packages) {
    const pkgPath = pkg.location;
    const tsConfigPath = path.resolve(pkgPath, 'tsconfig.json');

    await execSync(`tsc --project ${tsConfigPath} --noEmit`)
      .catch(e => errors.push(e.stdout));
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
})().catch(e => {
  console.log(e.message);
  process.exit(1);
});

require('module-alias/register');
const fs = require('fs-extra');
const path = require('path');

const { execSync } = require('~/helpers/node');
const { getChangedPackagesFiles } = require('~/helpers/packages');

(async function () {
  const packages = await getChangedPackagesFiles();
  const errors = [];

  for (const [pkg, files] of packages) {
    const pkgRelativePath = path.relative(pkg.rootPath, pkg.location);
    const filteredFiles = files
      .filter(file => path.extname(file) === '.ts')
      .map(file => path.relative(pkgRelativePath, file));
    if (!filteredFiles.length) continue;

    const tsconfigPath = path.resolve(pkg.location, 'tsconfig.json');
    const tsconfig = require(tsconfigPath);
    tsconfig.include = filteredFiles;

    const tmpTsconfigPath = path.join(pkg.location, 'tsconfig.tmp.json');
    fs.writeFileSync(tmpTsconfigPath, JSON.stringify(tsconfig, null, 2));

    await execSync(`tsc --project ${tmpTsconfigPath} --noEmit`)
      .catch(e => errors.push(e.stdout))
      .finally(() => {
        fs.removeSync(tmpTsconfigPath);
      });
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
})().catch(e => {
  console.log(e.message);
  process.exit(1);
});

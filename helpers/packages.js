const fs = require('fs');
const path = require('path');
const axios = require('axios');
const lerna = require('@lerna/project');
const inquirer = require('inquirer');
const git = require('simple-git')();
const typescript2 = require('rollup-plugin-typescript2');
const typescriptCompiler = require('ttypescript');
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const nodeExternals = require('rollup-plugin-node-externals').default;
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const filesize = require('rollup-plugin-filesize');
const dts = require('rollup-plugin-dts').default;
const del = require('rollup-plugin-delete');
const deepmerge = require('deepmerge');
const { rollup } = require('rollup');
const { compare } = require('compare-versions');

const { execSync } = require('./node');

function getPackagesCacheDecorator() {
  let cache;

  return async function () {
    if (!cache) {
      cache = await getPackages();
    }

    return cache;
  };
}

async function getPackages() {
  const packages = await lerna.getPackages(process.cwd());
  return packages.filter(pkg => !pkg.toJSON().private);
}

function getPackageLatestVersionFromNexus(pkgName) {
  return axios(`https://nexus.s.o3.ru/repository/npm-private/${pkgName}`)
    .then(response => response.data['dist-tags'].latest)
    .catch(e => {
      if (e.response && e.response.status === 404) {
        return null;
      }

      throw e;
    });
}

async function sortPackagesTopologically(packages) {
  const { stdout } = await execSync('npx lerna ls --toposort');
  const sortedPackages = stdout.trim().split('\n');

  return packages.sort((a, b) =>
    sortedPackages.indexOf(a.name) - sortedPackages.indexOf(b.name)
  );
}

async function getChangedPackagesFiles(since) {
  const packages = await getPackages();
  const changedPackages = packages.map(pkg => [
    path.relative(process.cwd(), pkg.location),
    [pkg, []]
  ]);
  const options = ['--stat', '--name-only', since].filter(Boolean);

  await git.fetch('origin', 'master');
  const strChangedFiles = await git.diff(options);
  const changedFiles = strChangedFiles.split('\n');
  changedFiles.forEach(file => {
    for (const [pkgPath, [, files]] of changedPackages) {
      if (file.startsWith(pkgPath)) {
        files.push(file);
      }
    }
  });

  return changedPackages
    .map(([, data]) => data)
    .filter(([, files]) => files.length > 0);
}

async function getChangedPackages(since) {
  const result = await getChangedPackagesFiles(since);
  return result.map(([pkg]) => pkg);
}

async function getIrrelevantPackages() {
  const changedPackages = await getChangedPackages('origin/master');
  if (!changedPackages.length) return [];

  const setOfChangedPackages = new Set(changedPackages.map(pkg => pkg.name));
  const irrelevantPackages = [];
  const packages = await getPackages();
  const packagesLatestVersions = await Promise.all(
    packages.map(pkg => getPackageLatestVersionFromNexus(pkg.name))
  );

  packages.forEach((pkg, index) => {
    if (!setOfChangedPackages.has(pkg.name)) return;

    const { version } = pkg.toJSON();
    const latestVersion = packagesLatestVersions[index];

    if (latestVersion === null || compare(version, latestVersion, '>')) return;

    irrelevantPackages.push({ pkg, version, latestVersion });
  });

  return irrelevantPackages;
}

function validatePackageVersion(version) {
  const components = version.split('.').filter(Boolean);

  if (components.length !== 3) {
    return false;
  }

  return !components.some(item => !isFinite(+item));
}

async function pickPackageNewVersionFromPrompt(pkg) {
  const { version } = pkg.toJSON();
  const versionComponents = version.split('.').reverse();
  let newVersion;

  const choices = [
    { name: 'Patch' },
    { name: 'Minor' },
    { name: 'Major' },
  ].map((item, index) => {
    const choiceVersionComponents = versionComponents.concat();
    choiceVersionComponents[index] = +versionComponents[index] + 1;

    const choiceVersion = choiceVersionComponents.reverse().join('.');
    return { name: `${item.name} (${choiceVersion})`, value: choiceVersion };
  });
  const { selectedVersion } = await inquirer.prompt({
    type: 'list',
    name: 'selectedVersion',
    message: `Select a new version for ${pkg.name} (currently ${version}):`,
    choices: [
      ...choices,
      { name: 'Custom Version', value: 'custom' },
    ]
  });

  if (selectedVersion === 'custom') {
    const { inputVersion } = await inquirer.prompt({
      type: 'input',
      name: 'inputVersion',
      message: 'Enter a custom version:',
      validate(input) {
        return validatePackageVersion(input) || 'Invalid version';
      }
    });

    newVersion = inputVersion;
  } else {
    newVersion = selectedVersion;
  }

  return newVersion;
}

function writeToPackageJsonFile(pkg, json) {
  fs.writeFileSync(
    path.join(pkg.location, 'package.json'),
    JSON.stringify(json, null, 2) + '\n',
    { encoding: 'utf-8' }
  );
}

function updatePackageDependencyVersion(
  json,
  dependency,
  version,
  dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies']
) {
  for (const dependencyType of dependencyTypes) {
    if (json[dependencyType] && json[dependencyType][dependency]) {
      json[dependencyType][dependency] = version;
      return true;
    }
  }

  return false;
}

function getPackageDefaultRollupConfig(pkg, options = {}) {
  const {
    main,
    dependencies = {},
    peerDependencies = {},
  } = pkg.toJSON();
  const {
    types = true
  } = options;

  const config = {
    input: path.join(pkg.location, 'src', 'index.ts'),
    output: {
      file: path.join(pkg.location, main),
      format: 'cjs',
    },
    external: [
      ...Object.keys(dependencies),
      ...Object.keys(peerDependencies)
    ],
    plugins: [
      typescript2({
        typescript: typescriptCompiler,
        tsconfig: path.join(pkg.location, 'tsconfig.json'),
        check: true,
        abortOnError: true,
        useTsconfigDeclarationDir: true,
        tsconfigOverride: types ? {
          compilerOptions: {
            declaration: true,
            declarationMap: true,
            rootDir: pkg.location,
            outDir: 'dist/js',
            declarationDir: 'dist/dts',
          }
        } : undefined,
      }),
      nodeResolve({
        skip: ['lodash']
      }),
      nodeExternals(),
      commonjs({
        ignoreDynamicRequires: true,
      }),
      json(),
      filesize()
    ],
  };

  return config;
}

async function getPackageTypesRollupConfig(config) {
  const [scope, pkgName] = config.name.split('/');
  const packages = await getPackages();
  const pkg = packages.find(item => item.name === [scope, pkgName].join('/'));
  const declarationDir = path.join(pkg.location, 'dist', 'dts');

  const input = path.join(
    declarationDir,
    path.relative(pkg.location, path.dirname(config.config.input)),
    path.basename(config.config.input, '.ts') + '.d.ts'
  );
  const output = path.join(
    pkg.location,
    path.relative(pkg.location, path.dirname(config.config.output.file)),
    path.basename(config.config.output.file, '.js') + '.d.ts'
  );

  return {
    name: `${config.name}/types`,
    options: {
      types: false,
    },
    config: {
      input,
      output: {
        file: output,
        format: 'cjs'
      },
      plugins: [
        nodeExternals(),
        dts(),
        del({
          targets: [output],
          hook: 'buildStart'
        }),
        del({
          targets: declarationDir,
          hook: 'buildEnd'
        })
      ],
    }
  };
}

function getPackageRollupConfigs(pkg) {
  const configs = [];
  const localRollupConfigPath = path.join(pkg.location, 'rollup.config.js');

  if (fs.existsSync(localRollupConfigPath)) {
    const localRollupConfig = require(localRollupConfigPath);
    const localConfigs = localRollupConfig.map(config => ({
      ...config,
      name: `${pkg.name}/${config.name}`,
    }));
    const mergedConfigs = localConfigs.map(config => {
      const merged = {
        ...config,
        config: deepmerge(getPackageDefaultRollupConfig(pkg, config.options), config.config, {
          customMerge: key => {
            if (key === 'output') {
              return (a, b) => deepmerge(a, b, { arrayMerge: (target, source) => source });
            }

            if (key === 'external') {
              return (a, b) => b;
            }

            return undefined;
          }
        })
      };

      merged.config.plugins.push(
        del({
          targets: merged.config.output.dir || merged.config.output.file,
          hook: 'buildStart'
        })
      );

      return merged;
    });

    configs.push(...mergedConfigs);
  } else {
    configs.push({ name: `${pkg.name}/main`, config: getPackageDefaultRollupConfig(pkg) });
  }

  return configs;
}

async function rollupPackageConfig(config) {
  const bundle = await rollup(config.config);
  await bundle.write(config.config.output);
  await bundle.close();

  const { types = true } = config.options || {};

  if (types) {
    await getPackageTypesRollupConfig(config)
      .then(rollupPackageConfig);
  }
}

async function getPackageDependentPackages(target) {
  const packages = await getPackages();
  const dependentPackages = [];

  packages.forEach(pkg => {
    const json = pkg.toJSON();

    for (const dependencyType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (json[dependencyType] && json[dependencyType][target.name]) {
        dependentPackages.push(pkg);
      }
    }
  });

  return dependentPackages;
}

async function upIrrelevantPackagesVersions() {
  const irrelevantPackages = await getIrrelevantPackages()
    .then(packages => packages.map(item => item.pkg));
  if (!irrelevantPackages.length) return [];

  const sortedIrrelevantPackages = await sortPackagesTopologically(irrelevantPackages);
  const needToUpdatePackagesMap = new Map();

  for (const pkg of sortedIrrelevantPackages) {
    needToUpdatePackagesMap.set(pkg.name, pkg);
    const dependentPackages = await getPackageDependentPackages(pkg);
    sortedIrrelevantPackages.push(...dependentPackages);
  }

  const sortedNeedToUpdatePackages = await sortPackagesTopologically(
    Array.from(needToUpdatePackagesMap.values()));
  const updatedPackagesMap = new Map();
  for (const pkg of sortedNeedToUpdatePackages) {
    const json = pkg.toJSON();
    json.version = await pickPackageNewVersionFromPrompt(pkg);

    for (const [, updatedPkgJson] of updatedPackagesMap.values()) {
      updatePackageDependencyVersion(
        json,
        updatedPkgJson.name,
        updatedPkgJson.version
      );
    }
    updatedPackagesMap.set(pkg.name, [pkg, json]);
  }

  return Array.from(updatedPackagesMap.values());
}

module.exports = {
  getPackages: getPackagesCacheDecorator(),
  getPackageLatestVersionFromNexus,
  sortPackagesTopologically,
  getChangedPackages,
  getIrrelevantPackages,
  pickPackageNewVersionFromPrompt,
  writeToPackageJsonFile,
  updatePackageDependencyVersion,
  getPackageRollupConfigs,
  rollupPackageConfig,
  getPackageDependentPackages,
  upIrrelevantPackagesVersions,
  getChangedPackagesFiles
};

require('module-alias/register');
const { Command } = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');

const { name: scope } = require('~/package.json');
const {
  getPackages,
  sortPackagesTopologically,
  getPackageRollupConfigs,
  rollupPackageConfig
} = require('~/helpers/packages');

const program = new Command();

program
  .name('build')
  .description('CLI for picking packages and their configs for building')
  .argument('[packages...]', 'Packages to build divided by comma and their configs divided by slash', [])
  .action(async (arPackages) => {
    const packages = await getPackages();
    const sortedPackages = await sortPackagesTopologically(packages);
    const rollupConfigs = sortedPackages.reduce((configs, pkg) => {
      configs.push(...getPackageRollupConfigs(pkg));
      return configs;
    }, []);
    const rollupConfigsToBuild = arPackages.length
      ? rollupConfigs.filter(config => arPackages.some(pickedConfig => {
        const [pkgName, configName] = config.name.replace(`${scope}-`, '').split('/');
        const [pickedPkgName, pickedConfigName] = pickedConfig.replace(`${scope}-`, '').split('/');

        return (
          pickedPkgName === pkgName &&
          (!pickedConfigName || pickedConfigName === configName)
        );
      }))
      : rollupConfigs;

    for (const config of rollupConfigsToBuild) {
      await rollupPackageConfig(config);
    }
  });

program
  .command('cli-packages')
  .description('Pick packages you want to build:')
  .action(async () => {
    const spinner = ora({ spinner: 'moon' });

    try {
      spinner.start('Getting packages to build...');
      const packages = await getPackages();
      const sortedPackages = await sortPackagesTopologically(packages)
        .then(packages => packages.map(pkg => ({ name: pkg.name, value: pkg })));
      spinner.succeed();

      const { pickedPackages } = await inquirer.prompt({
        type: 'checkbox',
        name: 'pickedPackages',
        message: 'Select packages which you want to build:',
        choices: sortedPackages,
        loop: false,
        validate: (input) => input.length ? true : 'You need to choose at least one package.'
      });

      spinner.start('Getting configs to build...');
      const rollupConfigsToBuild = pickedPackages.reduce((configs, pkg) => {
        configs.push(...getPackageRollupConfigs(pkg));
        return configs;
      }, []);
      spinner.succeed();

      for (const config of rollupConfigsToBuild) {
        await rollupPackageConfig(config);
      }
    } catch (e) {
      spinner.fail(e.message);
    }
  });

program
  .command('cli-configs')
  .description('Pick configs you want to build:')
  .action(async () => {
    const spinner = ora({ spinner: 'moon' });

    try {
      spinner.start('Getting configs to build...');
      const packages = await getPackages();
      const sortedPackages = await sortPackagesTopologically(packages);
      const rollupConfigs = sortedPackages.reduce((configs, pkg) => {
        configs.push(...getPackageRollupConfigs(pkg));
        return configs;
      }, []);
      spinner.succeed();

      const { rollupConfigsToBuild } = await inquirer.prompt({
        type: 'checkbox',
        name: 'rollupConfigsToBuild',
        message: 'Select packages configs which you want to build:',
        choices: rollupConfigs.map(config => ({ name: config.name, value: config })),
        loop: false,
        validate: (input) => input.length ? true : 'You need to choose at least one config.'
      });

      for (const config of rollupConfigsToBuild) {
        await rollupPackageConfig(config);
      }
    } catch (e) {
      spinner.fail(e.message);
    }
  });

program
  .parseAsync()
  .catch(e => {
    console.log(e.message);
    process.exit(1);
  });

import { Command } from 'commander';
import { S3, Screenshots } from '@bx-fe/e2e-runner-app';
import inquirer from 'inquirer';
import * as path from 'path';
import ora from 'ora';

import type { Cli } from '~/src';

export class S3CliCommand extends Command {
  constructor(program: Cli) {
    super('s3');

    this.description('Interactive files downloading from s3');
    this.action(async () => {
      const spinner = ora({
        spinner: 'moon',
      });

      try {
        spinner.start('Reading config file...');
        const s3 = new S3(program.config);
        spinner.succeed();

        spinner.start('Getting list of branches...');
        const branches = await s3.listBranches();
        spinner.succeed();

        const { branch }: Record<string, string> = await inquirer.prompt({
          type: 'list',
          name: 'branch',
          message: 'Select a branch from which you want to download files:',
          choices: branches,
        });

        const { shouldSelectFiles }: Record<string, boolean> = await inquirer.prompt({
          type: 'confirm',
          name: 'shouldSelectFiles',
          message: 'Do you want to select files to download? Otherwise all files will be downloaded:',
          default: true,
        });

        let pulledFilesPromise: (outputPath: string) => Promise<(string | null)[]>;
        if (shouldSelectFiles) {
          spinner.start('Getting list of files...');
          const objects = await s3.listObjects(branch);
          spinner.succeed();

          const { fileSelectType }: Record<string, string> = await inquirer.prompt({
            type: 'list',
            name: 'fileSelectType',
            message: 'Choose how do you want to select files:',
            choices: [
              { name: 'Enter manually', value: 'input' },
              { name: 'Pick from list', value: 'checkbox' }
            ],
          });
          const files: string[] = [];

          if (fileSelectType === 'input') {
            const objectsSet = new Set();
            objects.forEach(item => objectsSet.add(item.name));

            const parseInputString = (input: string): string[] => input.split(',').map(item => item.trim());
            const { data }: Record<string, string> = await inquirer.prompt({
              type: 'input',
              name: 'data',
              message: 'Enter file names separated by comma (whitespaces are allowed):',
              validate: (input: string) => {
                const inputFiles = parseInputString(input);

                for (const file of inputFiles) {
                  if (!objectsSet.has(file)) return `There is no such file as "${file}"`;
                }

                return true;
              }

            });

            files.push(...parseInputString(data));
          } else {
            const { data }: Record<string, string[]> = await inquirer.prompt({
              type: 'checkbox',
              name: 'data',
              message: 'Select files which you want to download:',
              choices: objects,
              validate: (input: string[]) =>
                input.length ? true : 'You need to choose at least one file.'
            });

            files.push(...data);
          }

          pulledFilesPromise = (outputPath) => Promise.all(
            files.map(file => s3.getObject(branch, file, path.resolve(process.cwd(), outputPath, file)))
          );
        } else {
          pulledFilesPromise = outputPath => s3.getBranch(branch, outputPath);
        }

        const screenshots = new Screenshots(program.config);
        const { outputPath }: Record<string, string> = await inquirer.prompt({
          type: 'input',
          name: 'outputPath',
          message: 'Enter a path where you want to save files:',
          default: screenshots.screenshotsPath
        });

        spinner.start('Downloading requested files...');
        const pulledFiles = await pulledFilesPromise(outputPath);
        pulledFiles.forEach(file => {
          if (!file || !file.endsWith('.zip')) return;

          const filePath = path.resolve(process.cwd(), outputPath, file);
          Screenshots.unzipScreenshotsS3Archive(filePath);
        });
        spinner.succeed(
          `The following files have been successfully pulled from branch ${branch} and saved on path ${outputPath}:\n` +
          pulledFiles.join('\n')
        );
      } catch (e) {
        spinner.fail((e as Error).message);
      }
    });
  }
}

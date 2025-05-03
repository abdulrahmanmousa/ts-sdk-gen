#!/usr/bin/env node

'use strict';

const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('path');

const { program } = require('commander');
const pkg = require('../package.json');

const stringToBoolean = (value) => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
};

const processParams = (obj, booleanKeys) => {
  for (const key of booleanKeys) {
    const value = obj[key];
    if (typeof value === 'string') {
      const parsedValue = stringToBoolean(value);
      delete obj[key];
      obj[key] = parsedValue;
    }
  }
  if (obj.file) {
    obj.configFile = obj.file;
  }
  return obj;
};

async function runGenerate(params) {
  let userConfig;
  try {
    const { createClient, initConfigs } = require(
      resolve(__dirname, '../dist/index.cjs'),
    );
    userConfig = processParams(params, [
      'dryRun',
      'experimentalParser',
      'exportCore',
      'useOptions',
    ]);
    if (params.plugins === true) {
      userConfig.plugins = [];
    } else if (params.plugins) {
      userConfig.plugins = params.plugins;
    }

    const configs = await initConfigs(userConfig);
    await createClient(userConfig);
    let watchEnabled = false;
    for (const config of configs) {
      if (config.watch.enabled) {
        watchEnabled = true;
      }
    }

    if (!watchEnabled) {
      process.exit(0);
    }
  } catch (error) {
    if (!userConfig?.dryRun) {
      const logDir = resolve(process.cwd(), 'ts-sdk-errors');
      const logName = `openapi-ts-error-${Date.now()}.log`;
      const logPath = resolve(logDir, logName);

      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      writeFileSync(logPath, `${error.message}\n${error.stack}`);
      console.error(`🔥 Unexpected error occurred. Log saved to ${logPath}`);
    }
    console.error(`🔥 Unexpected error occurred. ${error.message}`);
    process.exit(1);
  }
}

// Create a basic command structure
program.name(Object.keys(pkg.bin)[0]).version(pkg.version);

// Add the init command
program
  .command('init')
  .description('Initialize @ts-sdk-gen/openapi-ts in your project')
  .option('-f, --force', 'Overwrite existing configuration files')
  .action(async (options) => {
    try {
      const { initCommand } = require(resolve(__dirname, '../dist/index.cjs'));
      await initCommand(options);
    } catch (error) {
      console.error(
        `🔥 Unexpected error occurred during init: ${error.message}`,
      );
      process.exit(1);
    }
  });

// Add the default command for backward compatibility
program
  .command('generate', { hidden: true, isDefault: true })
  .description('Generate SDK from OpenAPI specification')
  .option(
    '-c, --client <value>',
    'HTTP client to generate [@ts-sdk-gen/client-axios, @ts-sdk-gen/client-fetch, legacy/angular, legacy/axios, legacy/fetch, legacy/node, legacy/xhr]',
  )
  .option('-d, --debug', 'Run in debug mode?')
  .option('--dry-run [value]', 'Skip writing files to disk?')
  .option(
    '-e, --experimental-parser [value]',
    'Opt-in to the experimental parser?',
  )
  .option('-f, --file [value]', 'Path to the config file')
  .option(
    '-i, --input <value>',
    'OpenAPI specification (path, url, or string content)',
  )
  .option('-o, --output <value>', 'Output folder')
  .option('-p, --plugins [value...]', "List of plugins you'd like to use")
  .option(
    '--base [value]',
    'DEPRECATED. Manually set base in OpenAPI config instead of inferring from server value',
  )
  .option('--exportCore [value]', 'DEPRECATED. Write core files to disk')
  .option('--name <value>', 'DEPRECATED. Custom client class name')
  .option('--request <value>', 'DEPRECATED. Path to custom request file')
  .option(
    '--useOptions [value]',
    'DEPRECATED. Use options instead of arguments?',
  )
  .action(async (options) => {
    await runGenerate(options);
  });

// For backward compatibility, support options directly on the program
const mainOptions = program.opts();
if (Object.keys(mainOptions).length > 0) {
  runGenerate(mainOptions);
} else {
  program.parse(process.argv);
}

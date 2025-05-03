import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import prompts from 'prompts';

async function generateOpenApiTsConfig(answers: {
  framework: string;
  outputPath: string;
  schemaPath: string;
}) {
  return `import { defineConfig } from '@ts-sdk-gen/openapi-ts';

const config = defineConfig({
  apiConfigFile: './api.config.ts',
  client: {
    name: '@ts-sdk-gen/client-fetch',
  },
  input: {
    path: '${answers.schemaPath}',
  },
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: '${answers.outputPath}',
  },
  plugins: [${answers.framework ? `'${answers.framework}'` : ''}],
  watch: true, // Enable watch mode
});

export default config;`;
}

async function generateApiConfig(answers: { baseUrl: string }) {
  return `import type { Config } from '@ts-sdk-gen/client-fetch';

export default {
  baseUrl: '${answers.baseUrl}',
} satisfies Config;`;
}

interface InitOptions {
  force?: boolean;
}

export async function initCommand(options: InitOptions = {}): Promise<void> {
  console.log('🚀 Initializing @ts-sdk-gen/openapi-ts in your project...');

  const cwd = process.cwd();
  const openapiConfigPath = path.join(cwd, 'openapi-ts.config.ts');
  const apiConfigPath = path.join(cwd, 'api.config.ts');

  // Check if files already exist
  if (fs.existsSync(openapiConfigPath) && !options.force) {
    console.log(
      '⚠️ openapi-ts.config.ts already exists. Use --force to overwrite.',
    );
    return;
  }

  if (fs.existsSync(apiConfigPath) && !options.force) {
    console.log('⚠️ api.config.ts already exists. Use --force to overwrite.');
    return;
  }

  // Interactive prompts
  const answers = await prompts(
    [
      {
        choices: [
          { title: 'npm', value: 'npm' },
          { title: 'pnpm', value: 'pnpm' },
          { title: 'yarn', value: 'yarn' },
          { title: 'bun', value: 'bun' },
        ],
        initial: 1,
        message: 'Select a package manager',
        name: 'packageManager',
        type: 'select', // pnpm as default
      },
      {
        choices: [
          {
            title: 'React Query (TanStack Query)',
            value: '@tanstack/react-query',
          },
          { title: 'SWR', value: '@ts-sdk-gen/swr' },
          { title: 'None', value: '' },
        ],
        hint: 'React Query (TanStack Query)',
        initial: 0,
        message: 'Select a TypeScript framework integration',
        name: 'framework',
        type: 'select',
      },
      {
        hint: './openapi-schema.json',
        initial: './openapi-schema.json',
        message: 'Enter the path to your OpenAPI schema',
        name: 'schemaPath',
        type: 'text',
        validate: (value: string) => (value ? true : 'Schema path is required'),
      },
      {
        hint: './src/sdk',
        initial: './src/sdk',
        message: 'Enter the output directory for generated SDK',
        name: 'outputPath',
        type: 'text',
        validate: (value: string) => (value ? true : 'Output path is required'),
      },
      {
        hint: 'http://localhost:8080',
        initial: 'http://localhost:8080',
        message: 'Enter the base URL for your API',
        name: 'baseUrl',
        type: 'text',
        validate: (value: string) => (value ? true : 'Base URL is required'),
      },
    ],
    { onCancel: () => process.exit(0) },
  );

  // Create config files with user-provided values
  try {
    const openapiTsConfig = await generateOpenApiTsConfig(answers);
    fs.writeFileSync(openapiConfigPath, openapiTsConfig);
    console.log('✅ Created openapi-ts.config.ts');

    const apiConfig = await generateApiConfig(answers);
    fs.writeFileSync(apiConfigPath, apiConfig);
    console.log('✅ Created api.config.ts');
  } catch (error) {
    console.error('❌ Error creating config files:', error);
    return;
  }

  // Install dependencies
  try {
    console.log('📦 Installing dependencies...');

    const { packageManager } = answers;
    const clientPackage = '@ts-sdk-gen/client-fetch';
    const frameworkPackage = answers.framework || '';

    // Make sure pnpm is installed if selected but not available
    if (packageManager === 'pnpm') {
      try {
        execSync('pnpm --version', { stdio: 'ignore' });
      } catch (error) {
        console.log('pnpm not found, installing it first...');
        execSync('npm install -g pnpm', { stdio: 'inherit' });
      }
    }

    // Install command based on selected package manager
    const installCommands: Record<string, { dev: string; prod: string }> = {
      bun: {
        dev: 'bun add -d',
        prod: 'bun add',
      },
      npm: {
        dev: 'npm install --save-dev',
        prod: 'npm install',
      },
      pnpm: {
        dev: 'pnpm add -D',
        prod: 'pnpm add',
      },
      yarn: {
        dev: 'yarn add --dev',
        prod: 'yarn add',
      },
    };

    // Install the core package
    execSync(`${installCommands[packageManager].dev} @ts-sdk-gen/openapi-ts`, {
      stdio: 'inherit',
    });

    // Install the client
    execSync(`${installCommands[packageManager].prod} ${clientPackage}`, {
      stdio: 'inherit',
    });

    // Install framework integration if selected
    if (frameworkPackage) {
      execSync(`${installCommands[packageManager].prod} ${frameworkPackage}`, {
        stdio: 'inherit',
      });
    }

    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error);
    console.error('Please install dependencies manually:');
    console.error('pnpm add -D @ts-sdk-gen/openapi-ts');
    console.error('pnpm add @ts-sdk-gen/client-fetch');
    if (answers.framework) {
      console.error(`pnpm add ${answers.framework}`);
    }
  }

  console.log('\n🎉 Setup complete! Now you can run:');

  const runCommand =
    answers.packageManager === 'npm'
      ? 'npx openapi-ts'
      : answers.packageManager === 'yarn'
        ? 'yarn openapi-ts'
        : answers.packageManager === 'bun'
          ? 'bunx openapi-ts'
          : 'pnpm openapi-ts';

  console.log(`\n${runCommand}\n`);
  console.log('to generate your SDK from your OpenAPI schema.');
}

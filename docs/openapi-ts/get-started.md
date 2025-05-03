---
title: Get Started
description: Get started with @ts-sdk-gen/openapi-ts.
---

<script setup>
import { embedProject } from '../embed'
</script>

# Get Started

@ts-sdk-gen/openapi-ts is an OpenAPI to TypeScript codegen that generates reliable API clients and SDKs from your OpenAPI specifications.

## Features

- Interactive CLI setup with guided initialization
- Support for OpenAPI 2.0, 3.0, and 3.1 specifications
- TypeScript interfaces, SDKs, and JSON Schemas generation
- Multiple HTTP client options (Fetch API, Axios)
- Framework integrations (React Query, SWR)
- Customizable code output with formatting and linting
- Watch mode for automatic regeneration

## Quick Start

The fastest way to get started is with our interactive init command:

```sh
npx @ts-sdk-gen/openapi-ts init
```

This interactive setup will:

1. Prompt you to select your package manager (npm, pnpm, yarn, bun)
2. Ask which TypeScript framework integration you'd like to use
3. Let you specify your OpenAPI schema path
4. Configure the output directory for generated code
5. Set up your API base URL

After completion, you'll have a fully configured project with all necessary files and dependencies installed.

### Manual Setup

If you prefer to set up manually, you can install the packages and create the configuration files yourself:

::: code-group

```sh [npm]
npm install @ts-sdk-gen/client-fetch && npm install @ts-sdk-gen/openapi-ts -D
```

```sh [pnpm]
pnpm add @ts-sdk-gen/client-fetch && pnpm add @ts-sdk-gen/openapi-ts -D
```

```sh [yarn]
yarn add @ts-sdk-gen/client-fetch && yarn add @ts-sdk-gen/openapi-ts -D
```

```sh [bun]
bun add @ts-sdk-gen/client-fetch && bun add @ts-sdk-gen/openapi-ts -D
```

:::

## Configuration

Create an `openapi-ts.config.ts` file in your project root:

```typescript
import { defineConfig } from '@ts-sdk-gen/openapi-ts';

const config = defineConfig({
  apiConfigFile: './api.config.ts',
  client: {
    name: '@ts-sdk-gen/client-fetch',
  },
  input: {
    path: './openapi-schema.json',
  },
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './src/sdk',
  },
  plugins: ['@tanstack/react-query'],
  watch: {
    enabled: true,
    interval: 1000,
    timeout: 0,
  },
});

export default config;
```

Then create an `api.config.ts` file:

```typescript
import type { Config } from '@ts-sdk-gen/client-fetch';

export default {
  baseUrl: 'http://localhost:8080',
} satisfies Config;
```

## CLI

Add a script to your `package.json` file to make running the generator easier:

```json
"scripts": {
  "openapi-ts": "openapi-ts"
}
```

Then you can generate your SDK by running:

```sh
pnpm openapi-ts
```

## Node.js API

You can also generate clients programmatically:

```typescript
import { createClient } from '@ts-sdk-gen/openapi-ts';

createClient({
  client: '@ts-sdk-gen/client-fetch',
  input: './openapi-schema.json',
  output: './src/sdk',
});
```

For more detailed configuration options, see the [Configuration](/openapi-ts/configuration) page.

<!--@include: ../examples.md-->
<!--@include: ../sponsorship.md-->

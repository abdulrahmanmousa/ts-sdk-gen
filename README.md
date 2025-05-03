<div align="center">
  <h1 align="center"><b>@ts-sdk-gen/openapi-ts</b></h1>
  <p align="center">🚀 The OpenAPI to TypeScript codegen. Generate clients, SDKs, validators, and more.</p>
</div>

## Features

- Interactive CLI setup with `npx @ts-sdk-gen/openapi-ts init`
- Support for OpenAPI 2.0, 3.0, and 3.1 specifications
- Generate TypeScript interfaces, SDKs, and JSON Schemas
- Multiple HTTP client options (Fetch API, Axios)
- Framework integrations (React Query, SWR, etc.)
- Customizable code output with formatting and linting
- Watch mode for automatic regeneration during development

## Quick Start

The fastest way to get started is with our interactive init command:

```bash
npx @ts-sdk-gen/openapi-ts init
```

This will guide you through setting up your project with:

- Package manager selection (npm, pnpm, yarn, or bun)
- TypeScript framework integration options
- Schema path configuration
- Output directory settings
- API base URL configuration

After completing the setup, you'll have:

1. A properly configured `openapi-ts.config.ts` file
2. An `api.config.ts` file with your base URL
3. All necessary dependencies installed

## Manual Installation

If you prefer to set up manually:

```bash
# Install the required packages
pnpm add -D @ts-sdk-gen/openapi-ts
pnpm add @ts-sdk-gen/client-fetch
```

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
    path: './openapi-schema.json', // Path to your OpenAPI schema
  },
  output: {
    format: 'prettier', // Optional code formatting
    lint: 'eslint', // Optional code linting
    path: './src/sdk', // Where to output generated files
  },
  plugins: ['@tanstack/react-query'], // Optional framework integration
  watch: {
    enabled: true, // Auto-regenerate on schema changes
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
  baseUrl: 'http://localhost:8080', // Your API base URL
} satisfies Config;
```

## Running the Generator

Once configured, you can run the generator:

```bash
# Using npx
npx openapi-ts

# Or if you've set up a script in package.json
pnpm openapi-ts
```

## Framework Integrations

@ts-sdk-gen/openapi-ts supports various framework integrations:

- **React Query (TanStack Query)**: Add `'@tanstack/react-query'` to your plugins
- **SWR**: Add `'@ts-sdk-gen/swr'` to your plugins

Example with React Query:

```typescript
plugins: ['@tanstack/react-query'],
```

This generates custom hooks like `useGetUsers()` that leverage React Query's features.

## Available Clients

- `@ts-sdk-gen/client-fetch`: Modern Fetch API client
- `@ts-sdk-gen/client-axios`: Axios-based client

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

```bash
# Clone the repository
git clone https://github.com/abdulrahmanmousa/ts-sdk-gen.git
cd ts-sdk-gen

# Install dependencies
pnpm install

# Build the project
pnpm run --recursive build
```

## License

MIT

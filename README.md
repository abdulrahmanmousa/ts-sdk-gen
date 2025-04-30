<div align="center">
  <img width="150" height="150" src="https://heyapi.dev/logo.png" alt="Logo">
  <h1 align="center"><b>OpenAPI TypeScript</b></h1>
  <p align="center">🚀 The OpenAPI to TypeScript codegen. Generate clients, SDKs, validators, and more.</p>
</div>

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ts-sdk-gen
```

2. Install dependencies:

```bash
pnpm install
```

## if you ran into node version error change to latest node version

```bash
nvm use 23
```

## Configuration

```typescript
// Example configuration
export default {
  client: '@hey-api/client-fetch',
  input: './openapi-schema.json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './generated',
  },
  plugins: ['@tanstack/react-query'],
};
```

## Building and Running

To build the project and run the generator with your configuration:

```bash
pnpm run --recursive build && node packages/openapi-ts/bin/index.cjs -f openapi-ts.config.ts
```

also run

```bash
pnpm add @hey-api/client-fetch
```

this will install the client

This command will:

1. Build all packages in the project
2. Run the generator using your configuration file

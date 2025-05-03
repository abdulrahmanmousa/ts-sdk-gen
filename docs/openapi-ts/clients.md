---
title: Clients
description: REST clients for @ts-sdk-gen/openapi-ts. Compatible with all features.
---

<script setup>
import { embedProject } from '../embed'
</script>

# REST Clients

@ts-sdk-gen/openapi-ts provides flexible HTTP client options for your API integrations. Choose the client that best fits your project needs - all seamlessly integrated with our interactive init flow and framework plugins.

## Features

- Seamless integration with the interactive init flow
- Type-safe response data and error handling
- Access to original request and response objects
- Granular request and response customization
- Minimal learning curve by extending familiar technologies
- Framework integration with React Query, SWR, and more
- Support for bundling inside the generated output

## Available Clients

- `@ts-sdk-gen/client-fetch`: Modern Fetch API client
- `@ts-sdk-gen/client-axios`: Axios-based client

## Client Selection

When running the init command, you'll be working with `@ts-sdk-gen/client-fetch` by default:

```bash
npx @ts-sdk-gen/openapi-ts init
```

You can switch to a different client by modifying your configuration:

```typescript
import { defineConfig } from '@ts-sdk-gen/openapi-ts';

const config = defineConfig({
  apiConfigFile: './api.config.ts',
  client: {
    name: '@ts-sdk-gen/client-axios', // Using Axios instead of Fetch
  },
  // ... other configuration
});

export default config;
```

## Client Configuration

Each client is configured through the `api.config.ts` file, which is automatically created during initialization. This file allows you to set common options like base URL and default headers:

```typescript
import type { Config } from '@ts-sdk-gen/client-fetch';

export default {
  baseUrl: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  // Client-specific options
} satisfies Config;
```

## Framework Integration

Our clients work seamlessly with framework integrations selected during initialization:

```typescript
// In openapi-ts.config.ts
plugins: ['@tanstack/react-query'], // or '@ts-sdk-gen/swr', etc.
```

This generates framework-specific hooks and utilities that leverage the selected client's capabilities for an optimized developer experience.

If you'd like @ts-sdk-gen/openapi-ts to support additional clients or framework integrations, please [open an issue](https://github.com/abdulrahmanmousa/ts-sdk-gen/issues).

```
<!--@include: ../examples.md-->
<!--@include: ../sponsorship.md-->
```

<div align="center">
  <h1 align="center"><b>@ts-sdk-gen/client-fetch</b></h1>
  <p align="center">🚀 Fetch API client for @ts-sdk-gen/openapi-ts codegen.</p>
</div>

## Features

- Seamless integration with @ts-sdk-gen/openapi-ts interactive initialization
- Type-safe response data and error handling
- Access to the original request and response objects
- Request and response interceptors
- Granular request and response customization options
- Framework integration with React Query, SWR, and more
- Support for bundling inside the generated output

## Quick Start

The fastest way to get started is with our interactive init command:

```bash
npx @ts-sdk-gen/openapi-ts init
```

This will guide you through setting up your project, including installing this client.

## Manual Installation

```bash
# Install with your preferred package manager
pnpm add @ts-sdk-gen/client-fetch
```

## Configuration

Configure the client through the `api.config.ts` file:

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

## Advanced Features

### Request Interceptors

You can add request interceptors to modify requests before they're sent:

```typescript
import { createClient } from '@ts-sdk-gen/client-fetch';

const client = createClient({
  baseUrl: 'https://api.example.com',
});

client.interceptors.request.use((request) => {
  // Modify request
  request.headers.set('Authorization', `Bearer ${getToken()}`);
  return request;
});
```

### Response Interceptors

Add response interceptors to process responses:

```typescript
client.interceptors.response.use((response) => {
  // Process response
  if (response.status === 401) {
    // Handle unauthorized
  }
  return response;
});
```

### Error Interceptors

Handle errors consistently:

```typescript
client.interceptors.error.use((error) => {
  // Log or transform errors
  console.error('API Error:', error);
  return error;
});
```

### URL Building

Build URLs programmatically (requires experimental parser):

```typescript
const url = client.buildUrl({
  path: {
    id: 123,
  },
  query: {
    filter: 'active',
  },
  url: '/users/{id}',
});
// Result: '/users/123?filter=active'
```

## Framework Integration

This client works seamlessly with framework integrations like React Query when used with @ts-sdk-gen/openapi-ts.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

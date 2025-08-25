---
title: Axios client
description: Axios client for Hey API. Compatible with all our features.
---

<script setup>
import { embedProject } from '../../embed'
</script>

# Axios

::: warning
Axios client is currently in beta. The interface might change before it becomes stable. We encourage you to leave feedback on [GitHub](https://github.com/ts-sdk-gen/openapi-ts/issues).
:::

[Axios](https://axios-http.com/) is a simple promise based HTTP client for the browser and Node.js. Axios provides a simple to use library in a small package with a very extensible interface.

<button class="buttonLink" @click="(event) => embedProject('hey-api-client-axios-example')(event)">
Live demo
</button>

## Installation

Start by adding `@ts-sdk-gen/client-axios` to your dependencies.

::: code-group

```sh [npm]
npm install @ts-sdk-gen/client-axiosios
```

```sh [pnpm]
pnpm add @ts-sdk-gen/client-axiosios
```

```sh [yarn]
yarn add @ts-sdk-gen/client-axiosios
```

```sh [bun]
bun add @ts-sdk-gen/client-axiosios
```

:::

Ensure you have already [configured](/openapi-ts/get-started) `@ts-sdk-gen/openapi-ts`. Update your configuration to use the Axios client package.

```js
export default {
  client: '@ts-sdk-gen/client-axiosios', // [!code ++]
  input: 'path/to/openapi.json',
  output: 'src/client',
};
```

You can now run `openapi-ts` to use the new Axios client. 🎉

## Configuration

If you're using SDKs, you will want to configure the internal client instance. You can do that with the `setConfig()` method. Call it at the beginning of your application.

```js
import { client } from 'client/sdk.gen';

client.setConfig({
  baseURL: 'https://example.com',
});
```

If you aren't using SDKs, you can create your own client instance.

```js
import { createClient } from '@ts-sdk-gen/client-axiosios';

const client = createClient({
  baseURL: 'https://example.com',
});
```

## Interceptors

Interceptors (middleware) can be used to modify requests before they're sent or responses before they're returned to the rest of your application. Axios provides interceptors, please refer to their documentation on [interceptors](https://axios-http.com/docs/interceptors).

We expose the Axios instance through the `instance` field.

```js
import { client } from 'client/sdk.gen';

client.instance.interceptors.request.use((config) => {
  config.headers.set('Authorization', 'Bearer <my_token>');
  return config;
});
```

## Customization

The Axios client is built as a thin wrapper on top of Axios, extending its functionality to work with Hey API. If you're already familiar with Axios, customizing your client will feel like working directly with Axios. You can customize requests in three ways – through SDKs, per client, or per request.

### SDKs

This is the most common requirement. Our generated SDKs consume an internal Axios instance, so you will want to configure that.

```js
import { client } from 'client/sdk.gen';

client.setConfig({
  baseURL: 'https://example.com',
});
```

You can pass any Axios configuration option to `setConfig()`, and even your own Axios implementation.

### Client

If you need to create a client pointing to a different domain, you can create your own client instance.

```js
import { createClient } from '@ts-sdk-gen/client-axiosios';

const myClient = createClient({
  baseURL: 'https://example.com',
});
```

You can then pass this instance to any SDK function through the `client` option. This will override the internal instance.

```js
const response = await getFoo({
  client: myClient,
});
```

### Request

Alternatively, you can pass the Axios configuration options to each SDK function. This is useful if you don't want to create a client instance for one-off use cases.

```js
const response = await getFoo({
  baseURL: 'https://example.com', // <-- override internal configuration
});
```

## Bundling

Sometimes, you may not want to declare client packages as a dependency. This scenario is common if you're using Hey API to generate output that is repackaged and published for other consumers under your own brand. For such cases, our clients support bundling through the `client.bundle` configuration option.

```js
export default {
  client: {
    bundle: true, // [!code ++]
    name: '@ts-sdk-gen/client-axiosios',
  },
  input: 'path/to/openapi.json',
  output: 'src/client',
};
```

<!--@include: ../../examples.md-->
<!--@include: ../../sponsorship.md-->

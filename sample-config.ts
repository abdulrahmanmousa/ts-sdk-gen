import { defineConfig } from './packages/openapi-ts/src';

export default defineConfig({
  client: '@fork-hey-sdk/client-fetch',
  experimentalParser: true,
  input: './openapi-schema.json',
  output: './generated-client',
});

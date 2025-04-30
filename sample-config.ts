import { defineConfig } from './packages/openapi-ts/src';

export default defineConfig({
  client: '@ts-sdk-gen/client-fetch',
  experimentalParser: true,
  input: './openapi-schema.json',
  output: './generated-client',
});

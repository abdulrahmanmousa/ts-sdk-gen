import { defineConfig } from '@ts-sdk-gen/openapi-ts';

export default defineConfig({
  client: '@ts-sdk-gen/client-fetch',
  input:
    'https://raw.githubusercontent.com/swagger-api/swagger-petstore/master/src/main/resources/openapi.yaml',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './src/client',
  },
  plugins: [
    '@ts-sdk-gen/schemas',
    '@ts-sdk-gen/sdk',
    {
      enums: 'javascript',
      name: '@ts-sdk-gen/typescript',
    },
    '@tanstack/angular-query-experimental',
  ],
});

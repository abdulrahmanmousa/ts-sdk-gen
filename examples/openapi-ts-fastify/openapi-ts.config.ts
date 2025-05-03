import { defineConfig } from '@ts-sdk-gen/openapi-ts';

export default defineConfig({
  client: '@ts-sdk-gengen/client-fetch',
  experimentalParser: true,
  input:
    'https://gist.githubusercontent.com/seriousme/55bd4c8ba2e598e416bb5543dcd362dc/raw/cf0b86ba37bb54bf1a6bf047c0ecf2a0ce4c62e0/petstore-v3.1.json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: './src/client',
  },
  plugins: ['fastify', '@ts-sdk-gen/sdk'],
});

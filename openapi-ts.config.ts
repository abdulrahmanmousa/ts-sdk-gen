export default {
  client: '@ts-sdk-gen/client-fetch',
  input: './openapi-schema.json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: '../../../frontend-gen/frontend-gen/sdk',
  },
  plugins: ['@tanstack/react-query'],
};

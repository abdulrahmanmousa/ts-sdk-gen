export default {
  client: '@hey-api/client-fetch',
  input: './openapi-schema.json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: '../../../sdk-tool/the_outfitters_frontned/src/sdk',
  },
  plugins: ['@tanstack/react-query'],
};

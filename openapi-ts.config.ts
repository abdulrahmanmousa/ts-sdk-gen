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

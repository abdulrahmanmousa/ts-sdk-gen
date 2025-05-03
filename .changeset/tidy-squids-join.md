---
'@ts-sdk-gen/openapi-ts': minor
---

feat: add output.clean option

### Added `output.clean` option

By default, the `output.path` folder will be emptied on every run. To preserve the previous behavior, set `output.clean` to `false`.

```js
export default {
  client: '@ts-sdk-gen/client-fetch',
  input: 'path/to/openapi.json',
  output: {
    clean: false, // [!code ++]
    path: 'src/client',
  },
};
```

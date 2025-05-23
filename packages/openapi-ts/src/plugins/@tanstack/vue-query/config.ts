import type { DefineConfig, PluginConfig } from '../../types';
import { handler } from '../query-core/plugin';
import { handlerLegacy } from '../query-core/plugin-legacy';
import type { Config } from './types';

export const defaultConfig: PluginConfig<Config> = {
  _dependencies: ['@hey-api/sdk', '@hey-api/typescript'],
  _handler: handler,
  _handlerLegacy: handlerLegacy,
  infiniteQueryOptions: false,
  mutationOptions: true,
  name: '@tanstack/vue-query',
  output: '@tanstack/vue-query',
  queryOptions: true,
};

/**
 * Type helper for `@tanstack/vue-query` plugin, returns {@link PluginConfig} object
 */
export const defineConfig: DefineConfig<Config> = (config) => ({
  ...defaultConfig,
  ...config,
});

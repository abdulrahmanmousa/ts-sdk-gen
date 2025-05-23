import pluralize from 'pluralize';

import { compiler } from '../../../../compiler';
import { clientApi, clientModulePath } from '../../../../generate/client';
import { TypeScriptFile } from '../../../../generate/files';
import { relativeModulePath } from '../../../../generate/utils';
import { paginationKeywordsRegExp } from '../../../../ir/pagination';
import { isOperationParameterRequired } from '../../../../openApi';
import type { Method, Operation } from '../../../../types/client';
import { getConfig, isLegacyClient } from '../../../../utils/config';
import { transformServiceName } from '../../../../utils/transform';
import { serviceFunctionIdentifier } from '../../../@hey-api/sdk/plugin-legacy';
import type { PluginLegacyHandler } from '../../../types';
import {
  infiniteQueryOptionsFn,
  // mutationOptionsFn,
  queryOptionsFn,
  toInfiniteQueryOptionsName,
  toQueryKeyName,
  toQueryOptionsName,
} from './constants';
import { createInfiniteParamsFunction } from './infinite-query';
import { createMutationOptions } from './mutation';
import {
  createQueryKeyFunction,
  createQueryKeyLiteral,
  createQueryKeyType,
} from './query';
import type { SupportedQueryConfig } from './types';
import {
  createTypeData,
  createTypeError,
  createTypeResponse,
  createUseItemHook,
} from './utils';

export const handlerLegacy: PluginLegacyHandler<SupportedQueryConfig> = ({
  client,
  files,
  plugin,
}) => {
  const config = getConfig();

  if (isLegacyClient(config)) {
    throw new Error('🚫 TanStack Query plugin does not support legacy clients');
  }

  const typesModulePath = relativeModulePath({
    moduleOutput: files.types.nameWithoutExtension(),
    sourceOutput: plugin.output,
  });

  const mutationsType =
    plugin.name === '@tanstack/angular-query-experimental' ||
    plugin.name === '@tanstack/svelte-query' ||
    plugin.name === '@tanstack/solid-query'
      ? 'MutationOptions'
      : 'UseMutationOptions';

  for (const service of client.services) {
    // Group operations by resource/entity name
    const operationsByResource = new Map<string, Operation[]>();

    // Extract resource name from operation
    for (const operation of service.operations) {
      // Get resource name from operation name or path
      let resourceName = '';

      // Try to extract from operation name by removing "Controller" and potential actions
      const nameParts = operation.name.split('Controller');
      if (nameParts.length > 0) {
        resourceName = pluralize.singular(nameParts[0].toLowerCase());
      } else {
        // Fallback to path-based resource extraction
        const pathParts = operation.path.split('/');
        // Find a part that looks like a resource name (not a parameter)
        resourceName =
          pathParts
            .find((part) => !part.startsWith(':') && part.length > 0)
            ?.toLowerCase() || '';
      }

      // Default to "common" if no resource name found
      resourceName = resourceName || 'common';

      // Add to map
      if (!operationsByResource.has(resourceName)) {
        operationsByResource.set(resourceName, []);
      }
      operationsByResource.get(resourceName)?.push(operation);
    }

    // Create files for each resource
    for (const [resourceName, operations] of operationsByResource) {
      // Create file
      const file = new TypeScriptFile({
        dir: `${config.output.path}/modules`,
        name: `${resourceName}.ts`,
      });

      // Set up basic imports
      file.import({
        ...clientApi.OptionsLegacyParser,
        module: clientModulePath({ config, sourceOutput: plugin.output }),
      });

      const sdkModulePath = relativeModulePath({
        moduleOutput: files.sdk.nameWithoutExtension(),
        sourceOutput: plugin.output,
      });

      file.import({
        module: sdkModulePath,
        name: 'client',
      });

      // Set up type utilities
      createQueryKeyType({ file });
      createQueryKeyFunction({ file });

      // Track feature usage to optimize imports
      let hasInfiniteQueries = false;
      let hasMutations = false;
      let hasQueries = false;
      // let hasUsedQueryFn = false;
      // let typeInfiniteData;

      // Process operations
      for (const operation of operations) {
        const queryFn = [
          config.plugins['@hey-api/sdk']?.asClass &&
            transformServiceName({
              config,
              name: service.name,
            }),
          serviceFunctionIdentifier({
            config,
            handleIllegal: !config.plugins['@hey-api/sdk']?.asClass,
            id: operation.name,
            operation,
          }),
        ]
          .filter(Boolean)
          .join('.');

        // Import the service function
        if (queryFn.split('.')[0]) {
          file.import({
            module: sdkModulePath,
            name: queryFn.split('.')[0],
          });
        }

        // Generate regular queries
        if (
          plugin.queryOptions &&
          (['GET'] as ReadonlyArray<Method>).includes(operation.method)
        ) {
          if (!hasQueries) {
            hasQueries = true;
            file.import({
              module: plugin.name,
              name: queryOptionsFn,
            });
          }

          // hasUsedQueryFn = true;

          const { typeData } = createTypeData({
            client,
            file,
            operation,
            typesModulePath,
          });

          const { typeResponse } = createTypeResponse({
            client,
            file,
            operation,
            typesModulePath,
          });

          const isRequired = isOperationParameterRequired(operation.parameters);

          // Create query key function
          const queryKeyStatement = compiler.constVariable({
            exportConst: true,
            expression: compiler.arrowFunction({
              parameters: [
                {
                  isRequired,
                  name: 'options',
                  type: typeData,
                },
              ],
              statements: createQueryKeyLiteral({
                id: operation.name,
              }),
            }),
            name: toQueryKeyName({
              config,
              id: operation.name,
              operation,
            }),
          });
          file.add(queryKeyStatement);

          // Create query options function
          const statement = compiler.constVariable({
            exportConst: true,
            expression: compiler.arrowFunction({
              parameters: [
                {
                  isRequired,
                  name: 'options',
                  type: typeData,
                },
                {
                  isRequired: false,
                  name: 'hookOptions',
                  type: `Omit<QueryOptions<${typeResponse} | undefined>, 'queryKey' | 'queryFn'>`,
                },
              ],
              statements: [
                compiler.returnFunctionCall({
                  args: [
                    compiler.objectExpression({
                      obj: [
                        {
                          key: 'queryFn',
                          value: compiler.arrowFunction({
                            async: true,
                            multiLine: true,
                            statements: [
                              compiler.constVariable({
                                destructure: true,
                                expression: compiler.awaitExpression({
                                  expression: compiler.callExpression({
                                    functionName: queryFn,
                                    parameters: [
                                      compiler.objectExpression({
                                        multiLine: true,
                                        obj: [
                                          { spread: 'options' },
                                          // { spread: 'queryKey[0]' },
                                          // { key: 'signal', shorthand: true },
                                          // { key: 'throwOnError', value: true },
                                        ],
                                      }),
                                    ],
                                  }),
                                }),
                                name: 'data',
                              }),
                              compiler.returnVariable({
                                expression: 'data',
                              }),
                            ],
                          }),
                        },
                        {
                          key: 'queryKey',
                          value: compiler.callExpression({
                            functionName: toQueryKeyName({
                              config,
                              id: operation.name,
                              operation,
                            }),
                            parameters: ['options'],
                          }),
                        },
                        {
                          spread: 'hookOptions',
                        },
                      ],
                    }),
                  ],
                  name: queryOptionsFn,
                }),
              ],
            }),
            name: toQueryOptionsName({
              config,
              id: operation.name,
              operation,
            }),
          });
          file.add(statement);

          // Create the corresponding hook function
          createUseItemHook({
            file,
            hookType: 'useQuery',
            operation,
            plugin,
            typeData,
            // typeError: typeError.name,
            typeResponse,
          });
        }

        // Generate infinite queries
        if (
          plugin.infiniteQueryOptions &&
          (['GET'] as ReadonlyArray<Method>).includes(operation.method)
        ) {
          // Find potential pagination fields
          const paginationParameter = operation.parameters.find((parameter) => {
            paginationKeywordsRegExp.lastIndex = 0;
            if (paginationKeywordsRegExp.test(parameter.name)) {
              return true;
            }

            if (parameter.in !== 'body') {
              return false;
            }

            if (parameter.export === 'reference') {
              const ref = parameter.$refs[0];
              const refModel = client.models.find(
                (model) => model.meta?.$ref === ref,
              );
              return refModel?.properties.find((property) => {
                paginationKeywordsRegExp.lastIndex = 0;
                return paginationKeywordsRegExp.test(property.name);
              });
            }

            return parameter.properties.find((property) => {
              paginationKeywordsRegExp.lastIndex = 0;
              return paginationKeywordsRegExp.test(property.name);
            });
          });

          let paginationField;
          if (paginationParameter) {
            // Find the actual field
            if (paginationKeywordsRegExp.test(paginationParameter.name)) {
              paginationField = paginationParameter;
            } else if (paginationParameter.in === 'body') {
              if (paginationParameter.export === 'reference') {
                const ref = paginationParameter.$refs[0];
                const refModel = client.models.find(
                  (model) => model.meta?.$ref === ref,
                );
                paginationField = refModel?.properties.find((property) => {
                  paginationKeywordsRegExp.lastIndex = 0;
                  return paginationKeywordsRegExp.test(property.name);
                });
              } else {
                paginationField = paginationParameter.properties.find(
                  (property) => {
                    paginationKeywordsRegExp.lastIndex = 0;
                    return paginationKeywordsRegExp.test(property.name);
                  },
                );
              }
            }
          }

          if (paginationParameter && paginationField) {
            if (!hasInfiniteQueries) {
              hasInfiniteQueries = true;
              createInfiniteParamsFunction({ file });

              file.import({
                module: plugin.name,
                name: infiniteQueryOptionsFn,
              });

              // typeInfiniteData = file.import({
              //   asType: true,
              //   module: plugin.name,
              //   name: 'InfiniteData',
              // });
            }

            // hasUsedQueryFn = true;

            const { typeData } = createTypeData({
              client,
              file,
              operation,
              typesModulePath,
            });

            const { typeResponse } = createTypeResponse({
              client,
              file,
              operation,
              typesModulePath,
            });
            const { typeError } = createTypeError({
              client,
              file,
              operation,
              pluginName: plugin.name,
              typesModulePath,
            });
            // const { typeResponse } = createTypeResponse({
            //   client,
            //   file,
            //   operation,
            //   typesModulePath,
            // });

            const isRequired = isOperationParameterRequired(
              operation.parameters,
            );

            // Setup infinite query key
            const typeQueryKey = `QueryKey<${typeData}>`;
            // const typePageObjectParam = `Pick<${typeQueryKey}[0], 'body' | 'headers' | 'path' | 'query'>`;
            // const typePageParam = `${paginationField.base} | ${typePageObjectParam}`;

            const queryKeyStatement = compiler.constVariable({
              exportConst: true,
              expression: compiler.arrowFunction({
                parameters: [
                  {
                    isRequired,
                    name: 'options',
                    type: typeData,
                  },
                ],
                returnType: typeQueryKey,
                statements: createQueryKeyLiteral({
                  id: operation.name,
                  isInfinite: true,
                }),
              }),
              name: toQueryKeyName({
                config,
                id: operation.name,
                isInfinite: true,
                operation,
              }),
            });
            file.add(queryKeyStatement);

            // Create infinite query options function
            const infiniteOptionsStatement = compiler.constVariable({
              exportConst: true,
              expression: compiler.arrowFunction({
                parameters: [
                  {
                    isRequired,
                    name: 'options',
                    type: typeData,
                  },
                  {
                    isRequired: false,
                    name: 'hookOptions',
                    type: `Omit<InfiniteQueryOptions<${typeResponse} | undefined>, 'queryKey' | 'queryFn'>`,
                  },
                ],
                statements: [
                  compiler.returnFunctionCall({
                    args: [
                      compiler.objectExpression({
                        obj: [
                          {
                            key: 'queryFn',
                            value: compiler.arrowFunction({
                              async: true,
                              multiLine: true,
                              statements: [
                                compiler.constVariable({
                                  destructure: true,
                                  expression: compiler.awaitExpression({
                                    expression: compiler.callExpression({
                                      functionName: queryFn,
                                      parameters: [
                                        compiler.objectExpression({
                                          multiLine: true,
                                          obj: [{ spread: 'options' }],
                                        }),
                                      ],
                                    }),
                                  }),
                                  name: 'data',
                                }),
                                compiler.returnVariable({
                                  expression: 'data',
                                }),
                              ],
                            }),
                          },
                          {
                            key: 'queryKey',
                            value: compiler.callExpression({
                              functionName: toQueryKeyName({
                                config,
                                id: operation.name,
                                isInfinite: true,
                                operation,
                              }),
                              parameters: ['options'],
                            }),
                          },
                          {
                            spread: 'hookOptions',
                          },
                        ],
                      }),
                    ],
                    name: infiniteQueryOptionsFn,
                  }),
                ],
              }),
              name: toInfiniteQueryOptionsName(operation),
            });
            file.add(infiniteOptionsStatement);

            // Create the corresponding hook function
            createUseItemHook({
              file,
              hookType: 'useInfiniteQuery',
              operation,
              plugin,
              typeData,
              typeError: typeError.name,
              typeResponse,
            });
          }
        }

        // Generate mutations
        if (
          plugin.mutationOptions &&
          (
            ['DELETE', 'PATCH', 'POST', 'PUT'] as ReadonlyArray<Method>
          ).includes(operation.method)
        ) {
          if (!hasMutations) {
            hasMutations = true;
            file.import({
              asType: true,
              module: plugin.name,
              name: mutationsType,
            });
          }

          // hasUsedQueryFn = true;

          const { typeData } = createTypeData({
            client,
            file,
            operation,
            typesModulePath,
          });
          const { typeError } = createTypeError({
            client,
            file,
            operation,
            pluginName: plugin.name,
            typesModulePath,
          });
          const { typeResponse } = createTypeResponse({
            client,
            file,
            operation,
            typesModulePath,
          });

          // Create mutation options
          createMutationOptions({
            file,
            mutationsType,
            operation,
            queryFn,
            typeData,
            typeError,
            typeResponse,
          });

          // Create the corresponding hook function
          createUseItemHook({
            file,
            hookType: 'useMutation',
            operation,
            plugin,
            typeData,
            typeError: typeError.name,
            typeResponse,
          });
        }
      }

      // Write the generated file
      file.write();
    }
  }
};

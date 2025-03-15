import { compiler } from '../../../../compiler';
import type { ImportExportItemObject } from '../../../../compiler/utils';
import type { Client, Operation } from '../../../../types/client';
import type { Files } from '../../../../types/utils';
import { getConfig } from '../../../../utils/config';
import {
  generateImport,
  operationDataTypeName,
  operationErrorTypeName,
  operationOptionsLegacyParserType,
  operationResponseTypeName,
  serviceFunctionIdentifier,
} from '../../../@hey-api/sdk/plugin-legacy';
import {
  toInfiniteQueryOptionsName,
  toMutationOptionsName,
  toQueryOptionsName,
} from './constants';

export const createTypeData = ({
  client,
  file,
  operation,
  typesModulePath,
}: {
  client: Client;
  file: Files[keyof Files];
  operation: Operation;
  typesModulePath: string;
}) => {
  const { name: nameTypeData } = generateImport({
    client,
    meta: operation.parameters.length
      ? {
          $ref: operation.name,
          name: operation.name,
        }
      : undefined,
    nameTransformer: operationDataTypeName,
    onImport: (name) => {
      file.import({
        asType: true,
        module: typesModulePath,
        name,
      });
    },
  });

  const typeData = operationOptionsLegacyParserType({
    importedType: nameTypeData,
  });

  return { typeData };
};

export const createTypeError = ({
  client,
  file,
  operation,
  pluginName,
  typesModulePath,
}: {
  client: Client;
  file: Files[keyof Files];
  operation: Operation;
  pluginName: string;
  typesModulePath: string;
}) => {
  const config = getConfig();

  const { name: nameTypeError } = generateImport({
    client,
    meta: {
      $ref: operation.name,
      name: operation.name,
    },
    nameTransformer: operationErrorTypeName,
    onImport: (name) => {
      file.import({
        asType: true,
        module: typesModulePath,
        name,
      });
    },
  });

  let typeError = {
    asType: true,
    name: nameTypeError,
  } as ImportExportItemObject;
  if (!typeError.name) {
    typeError = file.import({
      asType: true,
      module: pluginName,
      name: 'DefaultError',
    });
  }

  if (config.client.name === '@hey-api/client-axios') {
    const axiosError = file.import({
      asType: true,
      module: 'axios',
      name: 'AxiosError',
    });
    typeError = {
      ...axiosError,
      name: `${axiosError.name}<${typeError.name}>`,
    };
  }

  return { typeError };
};

export const createTypeResponse = ({
  client,
  file,
  operation,
  typesModulePath,
}: {
  client: Client;
  file: Files[keyof Files];
  operation: Operation;
  typesModulePath: string;
}) => {
  const { name: nameTypeResponse } = generateImport({
    client,
    meta: {
      $ref: operation.name,
      name: operation.name,
    },
    nameTransformer: operationResponseTypeName,
    onImport: (imported) => {
      file.import({
        asType: true,
        module: typesModulePath,
        name: imported,
      });
    },
  });

  const typeResponse = nameTypeResponse || 'void';

  return { typeResponse };
};

export const createUseItemHook = ({
  file,
  hookType,
  operation,
  plugin,
  typeData,
  // typeError,
}: {
  file: Files[keyof Files];
  hookType: 'useQuery' | 'useMutation' | 'useInfiniteQuery';
  operation: Operation;
  plugin: any;
  typeData: string;
  // typeError?: string;
}) => {
  const config = getConfig();

  const generateHookName = (hookType: string, operation: Operation) => {
    const identifier =
      serviceFunctionIdentifier({
        config,
        id: operation.name,
        operation,
      })
        .charAt(0)
        .toUpperCase() +
      serviceFunctionIdentifier({
        config,
        id: operation.name,
        operation,
      }).slice(1);
    switch (hookType) {
      case 'useQuery':
        return `use${identifier}Query`;
      case 'useMutation':
        return `use${identifier}`;
      case 'useInfiniteQuery':
        return `useInfinite${identifier}Query`;
      default:
        return '';
    }
  };

  const hookName = generateHookName(hookType, operation);
  if (!hookName) return;

  // Get the existing query/mutation options function
  const OptionsFunctionName = (() => {
    if (hookType === 'useQuery') {
      return toQueryOptionsName({
        config,
        id: operation.name,
        operation,
      });
    } else if (hookType === 'useMutation') {
      return toMutationOptionsName(operation);
    } else if (hookType === 'useInfiniteQuery') {
      return toInfiniteQueryOptionsName(operation);
    } else {
      return '';
    }
  })();

  // Determine the hook options parameter type
  const hookOptionsType =
    hookType === 'useMutation'
      ? `Omit<AnyUseMutationOptions, 'mutationKey' | 'mutationFn'>`
      : `Omit<AnyUseQueryOptions, 'queryKey' | 'queryFn'>`;

  const useQueryHookStatement = compiler.constVariable({
    exportConst: true,
    expression: compiler.arrowFunction({
      parameters: [
        {
          isRequired: hookType !== 'useMutation',
          name: 'dataOptions',
          type: typeData,
        },
        {
          isRequired: false,
          name: 'hookOptions',
          type: hookOptionsType,
        },
      ],
      statements: [
        compiler.returnFunctionCall({
          args: [
            compiler.objectExpression({
              multiLine: true,
              obj: [
                {
                  spread: compiler.callExpression({
                    functionName: OptionsFunctionName,
                    parameters: ['dataOptions'],
                  }),
                },
                {
                  spread: 'hookOptions',
                },
              ],
            }),
          ],
          name: hookType,
        }),
      ],
    }),
    name: hookName,
  });

  // Add the hook to the file
  file.add(useQueryHookStatement);
  file.import({
    module: plugin.name,
    name: hookType,
  });
  file.import({
    module: '@tanstack/react-query',
    name: 'AnyUseQueryOptions',
  });
  file.import({
    module: '@tanstack/react-query',
    name: 'AnyUseMutationOptions',
  });
};

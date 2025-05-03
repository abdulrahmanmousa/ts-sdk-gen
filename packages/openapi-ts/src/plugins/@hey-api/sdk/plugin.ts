import type ts from 'typescript';

import { compiler } from '../../../compiler';
import type { ObjectValue } from '../../../compiler/types';
import { clientApi, clientModulePath } from '../../../generate/client';
import type { IRContext } from '../../../ir/context';
import type { IROperationObject } from '../../../ir/ir';
import { hasOperationDataRequired } from '../../../ir/operation';
import { escapeComment } from '../../../utils/escape';
import { getServiceName } from '../../../utils/postprocess';
import { irRef } from '../../../utils/ref';
import { stringCase } from '../../../utils/stringCase';
import { transformServiceName } from '../../../utils/transform';
import type { PluginHandler } from '../../types';
import { operationTransformerIrRef } from '../transformers/plugin';
import { serviceFunctionIdentifier } from './plugin-legacy';
import type { Config } from './types';

interface OperationIRRef {
  /**
   * Operation ID
   */
  id: string;
}

export const operationIrRef = ({
  id,
  type,
}: OperationIRRef & {
  type: 'data' | 'error' | 'errors' | 'response' | 'responses';
}): string => {
  let affix = '';
  switch (type) {
    case 'data':
      affix = 'Data';
      break;
    case 'error':
      // error union
      affix = 'Error';
      break;
    case 'errors':
      // errors map
      affix = 'Errors';
      break;
    case 'response':
      // response union
      affix = 'Response';
      break;
    case 'responses':
      // responses map
      affix = 'Responses';
      break;
  }
  return `${irRef}${stringCase({
    case: 'PascalCase',
    value: id,
  })}-${affix}`;
};

export const operationOptionsType = ({
  importedType,
  throwOnError,
}: {
  importedType?: string | false;
  throwOnError?: string;
}) => {
  const optionsName = clientApi.Options.name;
  // TODO: refactor this to be more generic, works for now
  if (throwOnError) {
    return `${optionsName}<${importedType || 'unknown'}, ${throwOnError}>`;
  }
  return importedType ? `${optionsName}<${importedType}>` : optionsName;
};

const sdkId = 'sdk';

const operationStatements = ({
  context,
  operation,
}: {
  context: IRContext;
  operation: IROperationObject;
}): Array<ts.Statement> => {
  const file = context.file({ id: sdkId })!;
  const sdkOutput = file.nameWithoutExtension();
  const typesModule = file.relativePathToFile({ context, id: 'types' });

  const identifierError = context.file({ id: 'types' })!.identifier({
    $ref: operationIrRef({ id: operation.id, type: 'error' }),
    namespace: 'type',
  });
  if (identifierError.name) {
    file.import({
      asType: true,
      module: typesModule,
      name: identifierError.name,
    });
  }

  const identifierResponse = context.file({ id: 'types' })!.identifier({
    $ref: operationIrRef({ id: operation.id, type: 'response' }),
    namespace: 'type',
  });
  if (identifierResponse.name) {
    file.import({
      asType: true,
      module: typesModule,
      name: identifierResponse.name,
    });
  }

  // TODO: transform parameters
  // const query = {
  //   BarBaz: options.query.bar_baz,
  //   qux_quux: options.query.qux_quux,
  //   fooBar: options.query.foo_bar,
  // };

  // if (operation.parameters) {
  //   for (const name in operation.parameters.query) {
  //     const parameter = operation.parameters.query[name]
  //     if (parameter.name !== fieldName({ context, name: parameter.name })) {
  //       console.warn(parameter.name)
  //     }
  //   }
  // }

  const requestOptions: ObjectValue[] = [{ spread: 'options' }];

  if (operation.body) {
    switch (operation.body.type) {
      case 'form-data':
        requestOptions.push({ spread: 'formDataBodySerializer' });
        file.import({
          module: clientModulePath({
            config: context.config,
            sourceOutput: sdkOutput,
          }),
          name: 'formDataBodySerializer',
        });
        break;
      case 'json':
        break;
      case 'url-search-params':
        requestOptions.push({ spread: 'urlSearchParamsBodySerializer' });
        file.import({
          module: clientModulePath({
            config: context.config,
            sourceOutput: sdkOutput,
          }),
          name: 'urlSearchParamsBodySerializer',
        });
        break;
    }

    requestOptions.push({
      key: 'headers',
      value: [
        {
          key: 'Content-Type',
          // form-data does not need Content-Type header, browser will set it automatically
          value:
            operation.body.type === 'form-data'
              ? null
              : operation.body.mediaType,
        },
        {
          spread: 'options?.headers',
        },
      ],
    });
  }

  // TODO: parser - set parseAs to skip inference if every response has the same
  // content type. currently impossible because successes do not contain
  // header information

  requestOptions.push({
    key: 'url',
    value: operation.path,
  });

  const fileTransformers = context.file({ id: 'transformers' });
  if (fileTransformers) {
    const identifier = fileTransformers.identifier({
      $ref: operationTransformerIrRef({ id: operation.id, type: 'response' }),
      namespace: 'value',
    });
    if (identifier.name) {
      file.import({
        module: file.relativePathToFile({ context, id: 'transformers' }),
        name: identifier.name,
      });
      requestOptions.push({
        key: 'responseTransformer',
        value: identifier.name,
      });
    }
  }

  for (const name in operation.parameters?.query) {
    const parameter = operation.parameters.query[name];
    if (
      (parameter.schema.type === 'array' ||
        parameter.schema.type === 'tuple') &&
      (parameter.style !== 'form' || !parameter.explode)
    ) {
      // override the default settings for `querySerializer`
      if (context.config.client.name === '@ts-sdk-gen/client-fetch') {
        requestOptions.push({
          key: 'querySerializer',
          value: [
            {
              key: 'array',
              value: [
                {
                  key: 'explode',
                  value: false,
                },
                {
                  key: 'style',
                  value: 'form',
                },
              ],
            },
          ],
        });
      }
      break;
    }
  }

  return [
    compiler.returnFunctionCall({
      args: [
        compiler.objectExpression({
          identifiers: ['responseTransformer'],
          obj: requestOptions,
        }),
      ],
      name: `(options?.client ?? client).${operation.method}`,
      types: [
        identifierResponse.name || 'unknown',
        identifierError.name || 'unknown',
        'ThrowOnError',
      ],
    }),
  ];
};

const generateClassSdk = ({ context }: { context: IRContext }) => {
  const file = context.file({ id: sdkId })!;
  const typesModule = file.relativePathToFile({ context, id: 'types' });

  const sdks = new Map<string, Array<ts.MethodDeclaration>>();

  context.subscribe('operation', ({ operation }) => {
    const identifierData = context.file({ id: 'types' })!.identifier({
      $ref: operationIrRef({ id: operation.id, type: 'data' }),
      namespace: 'type',
    });
    if (identifierData.name) {
      file.import({
        asType: true,
        module: typesModule,
        name: identifierData.name,
      });
    }

    const node = compiler.methodDeclaration({
      accessLevel: 'public',
      comment: [
        operation.deprecated && '@deprecated',
        operation.summary && escapeComment(operation.summary),
        operation.description && escapeComment(operation.description),
      ],
      isStatic: true,
      name: serviceFunctionIdentifier({
        config: context.config,
        handleIllegal: false,
        id: operation.id,
        operation,
      }),
      parameters: [
        {
          isRequired: hasOperationDataRequired(operation),
          name: 'options',
          type: operationOptionsType({
            importedType: identifierData.name,
            throwOnError: 'ThrowOnError',
          }),
        },
      ],
      returnType: undefined,
      statements: operationStatements({ context, operation }),
      types: [
        {
          default: false,
          extends: 'boolean',
          name: 'ThrowOnError',
        },
      ],
    });

    const uniqueTags = Array.from(new Set(operation.tags));
    if (!uniqueTags.length) {
      uniqueTags.push('default');
    }

    for (const tag of uniqueTags) {
      const name = getServiceName(tag);
      const nodes = sdks.get(name) ?? [];
      nodes.push(node);
      sdks.set(name, nodes);
    }
  });

  context.subscribe('after', () => {
    for (const [name, nodes] of sdks) {
      const node = compiler.classDeclaration({
        decorator: undefined,
        members: nodes,
        name: transformServiceName({
          config: context.config,
          name,
        }),
      });
      file.add(node);
    }
  });
};

const generateFlatSdk = ({ context }: { context: IRContext }) => {
  const file = context.file({ id: sdkId })!;
  const typesModule = file.relativePathToFile({ context, id: 'types' });

  context.subscribe('operation', ({ operation }) => {
    const identifierData = context.file({ id: 'types' })!.identifier({
      $ref: operationIrRef({ id: operation.id, type: 'data' }),
      namespace: 'type',
    });
    if (identifierData.name) {
      file.import({
        asType: true,
        module: typesModule,
        name: identifierData.name,
      });
    }

    const node = compiler.constVariable({
      comment: [
        operation.deprecated && '@deprecated',
        operation.summary && escapeComment(operation.summary),
        operation.description && escapeComment(operation.description),
      ],
      exportConst: true,
      expression: compiler.arrowFunction({
        parameters: [
          {
            isRequired: hasOperationDataRequired(operation),
            name: 'options',
            type: operationOptionsType({
              importedType: identifierData.name,
              throwOnError: 'ThrowOnError',
            }),
          },
        ],
        returnType: undefined,
        statements: operationStatements({ context, operation }),
        types: [
          {
            default: false,
            extends: 'boolean',
            name: 'ThrowOnError',
          },
        ],
      }),
      name: serviceFunctionIdentifier({
        config: context.config,
        handleIllegal: true,
        id: operation.id,
        operation,
      }),
    });
    file.add(node);
  });
};

export const handler: PluginHandler<Config> = ({ context, plugin }) => {
  if (!context.config.client.name) {
    throw new Error(
      '🚫 client needs to be set to generate SDKs - which HTTP client do you want to use?',
    );
  }

  const file = context.createFile({
    id: sdkId,
    path: plugin.output,
  });
  const sdkOutput = file.nameWithoutExtension();

  // import required packages and core files
  file.import({
    module: clientModulePath({
      config: context.config,
      sourceOutput: sdkOutput,
    }),
    name: 'createClient',
  });
  file.import({
    module: clientModulePath({
      config: context.config,
      sourceOutput: sdkOutput,
    }),
    name: 'createConfig',
  });
  file.import({
    ...clientApi.Options,
    module: clientModulePath({
      config: context.config,
      sourceOutput: sdkOutput,
    }),
  });

  // define client first
  const configParams = [];

  if (
    context.config.apiConfig &&
    Object.keys(context.config.apiConfig).length > 0 &&
    !context.config.apiConfigFile
  ) {
    configParams.push(
      compiler.objectExpression({
        obj: context.config.apiConfig,
      }),
    );
  }

  if (context.config.apiConfigFile) {
    const path = require('path');

    // Calculate the relative path from the SDK file to the config file
    const sdkFullPath = path.resolve(
      context.config.output.path,
      plugin.output + '.ts',
    );
    const configFullPath = path.resolve(context.config.apiConfigFile);

    // Get the directory of the SDK file
    const sdkDir = path.dirname(sdkFullPath);

    // Calculate the relative path from SDK to the config file
    const relativePath = path
      .relative(sdkDir, configFullPath)
      .replace(/\.ts$/, '');

    // Make sure the path has the proper format (starts with ./ or ../)
    const formattedPath = relativePath.startsWith('.')
      ? relativePath
      : './' + relativePath;

    file.import({
      alias: 'ApiConfig',
      module: formattedPath,
      name: 'default',
    });

    configParams.push(compiler.identifier({ text: 'ApiConfig' }));
  }

  const statement = compiler.constVariable({
    exportConst: true,
    expression: compiler.callExpression({
      functionName: 'createClient',
      parameters: [
        compiler.callExpression({
          functionName: 'createConfig',
          parameters: configParams,
        }),
      ],
    }),
    name: 'client',
  });
  file.add(statement);

  if (plugin.asClass) {
    generateClassSdk({ context });
  } else {
    generateFlatSdk({ context });
  }
};

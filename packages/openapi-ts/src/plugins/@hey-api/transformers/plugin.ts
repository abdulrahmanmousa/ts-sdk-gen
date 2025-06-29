import ts from 'typescript';

import { compiler } from '../../../compiler';
import type { IRContext } from '../../../ir/context';
import type { IRSchemaObject } from '../../../ir/ir';
import { operationResponsesMap } from '../../../ir/operation';
import { irRef } from '../../../utils/ref';
import { stringCase } from '../../../utils/stringCase';
import type { PluginHandler } from '../../types';
import { operationIrRef } from '../sdk/plugin';
import type { Config } from './types';

interface OperationIRRef {
  /**
   * Operation ID
   */
  id: string;
}

export const operationTransformerIrRef = ({
  id,
  type,
}: OperationIRRef & {
  type: 'data' | 'error' | 'response';
}): string => {
  let affix = '';
  switch (type) {
    case 'data':
      affix = 'DataResponseTransformer';
      break;
    case 'error':
      affix = 'ErrorResponseTransformer';
      break;
    case 'response':
      affix = 'ResponseTransformer';
      break;
  }
  return `${irRef}${stringCase({
    // TODO: parser - do not pascalcase for functions, only for types
    case: 'camelCase',
    value: id,
  })}${affix}`;
};

const schemaIrRef = ({
  $ref,
  type,
}: {
  $ref: string;
  type: 'response';
}): string => {
  let affix = '';
  switch (type) {
    case 'response':
      affix = 'SchemaResponseTransformer';
      break;
  }
  const parts = $ref.split('/');
  return `${parts.slice(0, parts.length - 1).join('/')}/${stringCase({
    case: 'camelCase',
    value: parts[parts.length - 1],
  })}${affix}`;
};

export const schemaResponseTransformerRef = ({
  $ref,
}: {
  $ref: string;
}): string => schemaIrRef({ $ref, type: 'response' });

const transformersId = 'transformers';
const dataVariableName = 'data';

const ensureStatements = (
  nodes: Array<ts.Expression | ts.Statement>,
): Array<ts.Statement> =>
  nodes.map((node) =>
    ts.isStatement(node)
      ? node
      : compiler.expressionToStatement({ expression: node }),
  );

const schemaResponseTransformerNodes = ({
  context,
  schema,
}: {
  context: IRContext;
  schema: IRSchemaObject;
}): Array<ts.Expression | ts.Statement> => {
  const identifierData = compiler.identifier({ text: dataVariableName });
  const nodes = processSchemaType({
    context,
    dataExpression: identifierData,
    schema,
  });
  // append return statement if one does not already exist
  if (
    nodes.length &&
    nodes[nodes.length - 1].kind !== ts.SyntaxKind.ReturnStatement
  ) {
    nodes.push(compiler.returnStatement({ expression: identifierData }));
  }
  return nodes;
};

const processSchemaType = ({
  context,
  dataExpression,
  schema,
}: {
  context: IRContext;
  dataExpression?: ts.Expression | string;
  schema: IRSchemaObject;
}): Array<ts.Expression | ts.Statement> => {
  const file = context.file({ id: transformersId })!;

  if (schema.$ref) {
    let identifier = file.identifier({
      $ref: schemaResponseTransformerRef({ $ref: schema.$ref }),
      create: true,
      namespace: 'value',
    });

    if (identifier.created && identifier.name) {
      // create each schema response transformer only once
      const refSchema = context.resolveIrRef<IRSchemaObject>(schema.$ref);
      const nodes = schemaResponseTransformerNodes({
        context,
        schema: refSchema,
      });
      if (nodes.length) {
        const node = compiler.constVariable({
          expression: compiler.arrowFunction({
            async: false,
            multiLine: true,
            parameters: [
              {
                name: dataVariableName,
                // TODO: parser - add types, generate types without transformed dates
                type: compiler.keywordTypeNode({ keyword: 'any' }),
              },
            ],
            statements: ensureStatements(nodes),
          }),
          name: identifier.name,
        });
        file.add(node);
      } else {
        // the created schema response transformer was empty, do not generate
        // it and prevent any future attempts
        identifier = file.blockIdentifier({
          $ref: schemaResponseTransformerRef({ $ref: schema.$ref }),
          namespace: 'value',
        });
      }
    }

    if (identifier.name) {
      const callExpression = compiler.callExpression({
        functionName: identifier.name,
        parameters: [dataExpression],
      });

      if (typeof dataExpression === 'string') {
        return [callExpression];
      }

      if (dataExpression) {
        return [
          compiler.assignment({
            left: dataExpression,
            right: callExpression,
          }),
        ];
      }
    }

    return [];
  }

  if (schema.type === 'array') {
    if (!dataExpression || typeof dataExpression === 'string') {
      return [];
    }

    // TODO: parser - handle tuples and complex arrays
    const nodes = !schema.items
      ? []
      : processSchemaType({
          context,
          schema: {
            ...schema,
            type: undefined,
          },
        });

    if (!nodes.length) {
      return [];
    }

    return [
      compiler.assignment({
        left: dataExpression,
        right: compiler.callExpression({
          functionName: compiler.propertyAccessExpression({
            expression: dataExpression,
            name: 'map',
          }),
          parameters: [
            compiler.arrowFunction({
              multiLine: true,
              parameters: [
                {
                  name: 'item',
                  type: 'any',
                },
              ],
              statements:
                nodes.length === 1
                  ? ts.isStatement(nodes[0])
                    ? []
                    : [
                        compiler.returnStatement({
                          expression: nodes[0],
                        }),
                      ]
                  : ensureStatements(nodes),
            }),
          ],
        }),
      }),
    ];
  }

  if (schema.type === 'object') {
    let nodes: Array<ts.Expression | ts.Statement> = [];
    const required = schema.required ?? [];

    for (const name in schema.properties) {
      const property = schema.properties[name];
      const propertyAccessExpression = compiler.propertyAccessExpression({
        expression: dataExpression || dataVariableName,
        name,
      });
      const propertyNodes = processSchemaType({
        context,
        dataExpression: propertyAccessExpression,
        schema: property,
      });
      if (propertyNodes.length) {
        if (required.includes(name)) {
          nodes = nodes.concat(propertyNodes);
        } else {
          nodes.push(
            compiler.ifStatement({
              expression: propertyAccessExpression,
              thenStatement: compiler.block({
                statements: ensureStatements(propertyNodes),
              }),
            }),
          );
        }
      }
    }

    nodes.push(
      compiler.returnStatement({
        expression:
          typeof dataExpression === 'string'
            ? compiler.identifier({ text: dataExpression })
            : dataExpression,
      }),
    );

    return nodes;
  }

  if (
    schema.type === 'string' &&
    (schema.format === 'date' || schema.format === 'date-time')
  ) {
    const identifierDate = compiler.identifier({ text: 'Date' });

    if (typeof dataExpression === 'string') {
      return [
        compiler.newExpression({
          argumentsArray: [compiler.identifier({ text: dataExpression })],
          expression: identifierDate,
        }),
      ];
    }

    if (dataExpression) {
      return [
        compiler.assignment({
          left: dataExpression,
          right: compiler.newExpression({
            argumentsArray: [dataExpression],
            expression: identifierDate,
          }),
        }),
      ];
    }

    return [];
  }

  if (schema.items) {
    if (schema.items.length === 1) {
      return processSchemaType({
        context,
        dataExpression: 'item',
        schema: schema.items[0],
      });
    }

    let arrayNodes: Array<ts.Expression | ts.Statement> = [];
    if (
      schema.items.length === 2 &&
      schema.items.find((item) => item.type === 'null' || item.type === 'void')
    ) {
      // process 2 items if one of them is null
      for (const item of schema.items) {
        const nodes = processSchemaType({
          context,
          dataExpression: dataExpression || 'item',
          schema: item,
        });
        if (nodes.length) {
          if (dataExpression) {
            arrayNodes = arrayNodes.concat(nodes);
          } else {
            const identifierItem = compiler.identifier({ text: 'item' });
            // processed means the item was transformed
            arrayNodes.push(
              compiler.ifStatement({
                expression: identifierItem,
                thenStatement: compiler.block({
                  statements:
                    nodes.length === 1
                      ? ts.isStatement(nodes[0])
                        ? []
                        : [
                            compiler.returnStatement({
                              expression: nodes[0],
                            }),
                          ]
                      : ensureStatements(nodes),
                }),
              }),
              compiler.returnStatement({ expression: identifierItem }),
            );
          }
        }
      }
      return arrayNodes;
    }

    console.warn(
      `❗️ Transformers warning: schema ${JSON.stringify(schema)} is too complex and won't be currently processed. This will likely produce an incomplete transformer which is not what you want. Please open an issue if you'd like this improved https://github.com/ts-sdk-gen/openapi-ts/issues`,
    );
  }

  return [];
};

// handles only response transformers for now
export const handler: PluginHandler<Config> = ({ context, plugin }) => {
  const file = context.createFile({
    id: transformersId,
    path: plugin.output,
  });

  context.subscribe('operation', ({ operation }) => {
    const { response } = operationResponsesMap(operation);

    if (!response) {
      return;
    }

    if (response.items && response.items.length > 1) {
      if (context.config.debug) {
        console.warn(
          `❗️ Transformers warning: route ${`${operation.method.toUpperCase()} ${operation.path}`} has ${response.items.length} non-void success responses. This is currently not handled and we will not generate a response transformer. Please open an issue if you'd like this feature https://github.com/ts-sdk-gen/openapi-ts/issues`,
        );
      }
      return;
    }

    const identifierResponse = context.file({ id: 'types' })!.identifier({
      $ref: operationIrRef({ id: operation.id, type: 'response' }),
      namespace: 'type',
    });
    if (!identifierResponse.name) {
      return;
    }

    let identifierResponseTransformer = file.identifier({
      $ref: operationTransformerIrRef({ id: operation.id, type: 'response' }),
      create: true,
      namespace: 'value',
    });
    if (!identifierResponseTransformer.name) {
      return;
    }

    // TODO: parser - consider handling simple string response which is also a date
    const nodes = schemaResponseTransformerNodes({
      context,
      schema: response,
    });
    if (nodes.length) {
      file.import({
        asType: true,
        module: file.relativePathToFile({ context, id: 'types' }),
        name: identifierResponse.name,
      });
      const responseTransformerNode = compiler.constVariable({
        exportConst: true,
        expression: compiler.arrowFunction({
          async: true,
          multiLine: true,
          parameters: [
            {
              name: dataVariableName,
              // TODO: parser - add types, generate types without transformed dates
              type: compiler.keywordTypeNode({ keyword: 'any' }),
            },
          ],
          returnType: compiler.typeReferenceNode({
            typeArguments: [
              compiler.typeReferenceNode({
                typeName: identifierResponse.name,
              }),
            ],
            typeName: 'Promise',
          }),
          statements: ensureStatements(nodes),
        }),
        name: identifierResponseTransformer.name,
      });
      file.add(responseTransformerNode);
    } else {
      // the created schema response transformer was empty, do not generate
      // it and prevent any future attempts
      identifierResponseTransformer = file.blockIdentifier({
        $ref: operationTransformerIrRef({
          id: operation.id,
          type: 'response',
        }),
        namespace: 'value',
      });
    }
  });
};

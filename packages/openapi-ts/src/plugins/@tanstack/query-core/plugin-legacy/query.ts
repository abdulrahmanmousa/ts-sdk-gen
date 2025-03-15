import type { Property } from '../../../../compiler';
import { compiler } from '../../../../compiler';
import { clientApi } from '../../../../generate/client';
import type { Files } from '../../../../types/utils';
import {
  createQueryKeyFn,
  getClientBaseUrlKey,
  queryKeyName,
  TOptionsType,
} from './constants';

export const createQueryKeyLiteral = ({
  id,
  isInfinite,
}: {
  id: string;
  isInfinite?: boolean;
}) => {
  const queryKeyLiteral = compiler.arrayLiteralExpression({
    elements: [
      compiler.callExpression({
        functionName: createQueryKeyFn,
        parameters: [
          compiler.ots.string(id),
          'options',
          isInfinite ? compiler.ots.boolean(true) : undefined,
        ],
      }),
    ],
    multiLine: false,
  });
  return queryKeyLiteral;
};

export const createQueryKeyType = ({ file }: { file: Files[keyof Files] }) => {
  const properties: Property[] = [
    {
      name: '_id',
      type: compiler.keywordTypeNode({
        keyword: 'string',
      }),
    },
    {
      isRequired: false,
      name: '_infinite',
      type: compiler.keywordTypeNode({
        keyword: 'boolean',
      }),
    },
  ];

  const queryKeyType = compiler.typeAliasDeclaration({
    name: queryKeyName,
    type: compiler.typeTupleNode({
      types: [
        compiler.typeIntersectionNode({
          types: [
            compiler.typeReferenceNode({
              typeName: `Pick<${TOptionsType}, '${getClientBaseUrlKey()}' | 'body' | 'headers' | 'path' | 'query'>`,
            }),
            compiler.typeInterfaceNode({
              properties,
              useLegacyResolution: true,
            }),
          ],
        }),
      ],
    }),
    typeParameters: [
      {
        extends: compiler.typeReferenceNode({
          typeName: compiler.identifier({
            text: clientApi.OptionsLegacyParser.name,
          }),
        }),
        name: TOptionsType,
      },
    ],
  });
  file.add(queryKeyType);
};

export const createQueryKeyFunction = ({
  file,
}: {
  file: Files[keyof Files];
}) => {
  const returnType = compiler.indexedAccessTypeNode({
    indexType: compiler.typeNode(0),
    objectType: compiler.typeNode(queryKeyName, [
      compiler.typeNode(TOptionsType),
    ]),
  });

  const infiniteIdentifier = compiler.identifier({ text: 'infinite' });

  const fn = compiler.constVariable({
    expression: compiler.arrowFunction({
      multiLine: true,
      parameters: [
        {
          name: 'id',
          type: compiler.typeNode('string'),
        },
        {
          isRequired: false,
          name: 'options',
          type: compiler.typeNode(TOptionsType),
        },
        {
          isRequired: false,
          name: 'infinite',
          type: compiler.typeNode('boolean'),
        },
      ],
      returnType,
      statements: [
        compiler.constVariable({
          assertion: returnType,
          expression: compiler.objectExpression({
            multiLine: false,
            obj: [
              {
                key: '_id',
                value: compiler.identifier({ text: 'id' }),
              },
              {
                key: getClientBaseUrlKey(),
                value: compiler.identifier({
                  text: `(options?.client ?? client).getConfig().${getClientBaseUrlKey()}`,
                }),
              },
            ],
          }),
          name: 'params',
          typeName: returnType,
        }),
        compiler.ifStatement({
          expression: infiniteIdentifier,
          thenStatement: compiler.block({
            statements: [
              compiler.expressionToStatement({
                expression: compiler.binaryExpression({
                  left: compiler.propertyAccessExpression({
                    expression: 'params',
                    name: '_infinite',
                  }),
                  right: infiniteIdentifier,
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({ text: 'options' }),
            isOptional: true,
            name: compiler.identifier({ text: 'body' }),
          }),
          thenStatement: compiler.block({
            statements: [
              compiler.expressionToStatement({
                expression: compiler.binaryExpression({
                  left: compiler.propertyAccessExpression({
                    expression: 'params',
                    name: 'body',
                  }),
                  right: compiler.propertyAccessExpression({
                    expression: 'options',
                    name: 'body',
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({ text: 'options' }),
            isOptional: true,
            name: compiler.identifier({ text: 'headers' }),
          }),
          thenStatement: compiler.block({
            statements: [
              compiler.expressionToStatement({
                expression: compiler.binaryExpression({
                  left: compiler.propertyAccessExpression({
                    expression: 'params',
                    name: 'headers',
                  }),
                  right: compiler.propertyAccessExpression({
                    expression: 'options',
                    name: 'headers',
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({ text: 'options' }),
            isOptional: true,
            name: compiler.identifier({ text: 'path' }),
          }),
          thenStatement: compiler.block({
            statements: [
              compiler.expressionToStatement({
                expression: compiler.binaryExpression({
                  left: compiler.propertyAccessExpression({
                    expression: 'params',
                    name: 'path',
                  }),
                  right: compiler.propertyAccessExpression({
                    expression: 'options',
                    name: 'path',
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({ text: 'options' }),
            isOptional: true,
            name: compiler.identifier({ text: 'query' }),
          }),
          thenStatement: compiler.block({
            statements: [
              compiler.expressionToStatement({
                expression: compiler.binaryExpression({
                  left: compiler.propertyAccessExpression({
                    expression: 'params',
                    name: 'query',
                  }),
                  right: compiler.propertyAccessExpression({
                    expression: 'options',
                    name: 'query',
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.returnVariable({
          expression: 'params',
        }),
      ],
      types: [
        {
          extends: compiler.typeReferenceNode({
            typeName: compiler.identifier({
              text: clientApi.OptionsLegacyParser.name,
            }),
          }),
          name: TOptionsType,
        },
      ],
    }),
    name: createQueryKeyFn,
  });
  file.add(fn);
};

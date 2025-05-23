import ts from 'typescript';

import { compiler } from '../../../../compiler';
import { clientApi } from '../../../../generate/client';
import type { Files } from '../../../../types/utils';
import { createInfiniteParamsFn } from './constants';

export const createInfiniteParamsFunction = ({
  file,
}: {
  file: Files[keyof Files];
}) => {
  // Original createInfiniteParamsFn (which may still be used elsewhere)
  const fn = compiler.constVariable({
    expression: compiler.arrowFunction({
      multiLine: true,
      parameters: [
        {
          name: 'queryKey',
          type: compiler.typeNode(
            `QueryKey<${clientApi.OptionsLegacyParser.name}>`,
          ),
        },
        {
          name: 'page',
          type: compiler.typeNode('K'),
        },
      ],
      statements: [
        compiler.constVariable({
          expression: compiler.identifier({
            text: 'queryKey[0]',
          }),
          name: 'params',
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({
              text: 'page',
            }),
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
                  right: compiler.objectExpression({
                    multiLine: true,
                    obj: [
                      {
                        assertion: 'any',
                        spread: 'queryKey[0].body',
                      },
                      {
                        assertion: 'any',
                        spread: 'page.body',
                      },
                    ],
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({
              text: 'page',
            }),
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
                  right: compiler.objectExpression({
                    multiLine: true,
                    obj: [
                      {
                        spread: 'queryKey[0].headers',
                      },
                      {
                        spread: 'page.headers',
                      },
                    ],
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({
              text: 'page',
            }),
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
                  right: compiler.objectExpression({
                    multiLine: true,
                    obj: [
                      {
                        spread: 'queryKey[0].path',
                      },
                      {
                        spread: 'page.path',
                      },
                    ],
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.ifStatement({
          expression: compiler.propertyAccessExpression({
            expression: compiler.identifier({
              text: 'page',
            }),
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
                  right: compiler.objectExpression({
                    multiLine: true,
                    obj: [
                      {
                        spread: 'queryKey[0].query',
                      },
                      {
                        spread: 'page.query',
                      },
                    ],
                  }),
                }),
              }),
            ],
          }),
        }),
        compiler.returnVariable({
          expression: ts.factory.createAsExpression(
            ts.factory.createAsExpression(
              compiler.identifier({ text: 'params' }),
              ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
            ),
            ts.factory.createTypeQueryNode(
              compiler.identifier({ text: 'page' }),
            ),
          ),
        }),
      ],
      types: [
        {
          extends: compiler.typeReferenceNode({
            typeName: compiler.identifier({
              text: `Pick<QueryKey<${clientApi.OptionsLegacyParser.name}>[0], 'body' | 'headers' | 'path' | 'query'>`,
            }),
          }),
          name: 'K',
        },
      ],
    }),
    name: createInfiniteParamsFn,
  });
  file.add(fn);
};

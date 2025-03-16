import { compiler } from '../../../../compiler';
import type { Operation } from '../../../../types/client';
import type { Files } from '../../../../types/utils';
import { mutationOptionsFn, toMutationOptionsName } from './constants';

export const createMutationOptions = ({
  file,
  mutationsType,
  operation,
  queryFn,
  typeData,
  typeError,
  typeResponse,
}: {
  file: Files[keyof Files];
  mutationsType: string;
  operation: Operation;
  queryFn: string;
  typeData: string;
  typeError: { name: string };
  typeResponse: string;
}) => {
  const expression = compiler.arrowFunction({
    parameters: [
      {
        isRequired: false,
        name: 'options',
        type: `Partial<${typeData}>`,
      },
      {
        isRequired: false,
        name: 'hookOptions',
        type: `Omit<MutationOptions<${typeResponse}, ${typeError.name}, ${typeData}>, 'mutationKey' | 'mutationFn'>`,
      },
    ],
    statements: [
      compiler.constVariable({
        expression: compiler.objectExpression({
          obj: [
            {
              key: 'mutationFn',
              value: compiler.arrowFunction({
                async: true,
                multiLine: true,
                parameters: [
                  {
                    name: 'localOptions',
                  },
                ],
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
                              {
                                spread: 'options',
                              },
                              {
                                spread: 'localOptions',
                              },
                              {
                                key: 'throwOnError',
                                value: true,
                              },
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
              spread: 'hookOptions',
            },
          ],
        }),
        name: mutationOptionsFn,
        typeName: `${mutationsType}<${typeResponse}, ${typeError.name}, ${typeData}>`,
      }),
      compiler.returnVariable({
        expression: mutationOptionsFn,
      }),
    ],
  });

  const statement = compiler.constVariable({
    comment: [],
    exportConst: true,
    expression,
    name: toMutationOptionsName(operation),
  });

  file.add(statement);
};

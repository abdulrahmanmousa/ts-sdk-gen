import type { IROperationObject } from '../../../../ir/ir';
import type { Operation, OperationParameter } from '../../../../types/client';
import type { Config } from '../../../../types/config';
import { getConfig } from '../../../../utils/config';
import { serviceFunctionIdentifier } from '../../../@hey-api/sdk/plugin-legacy';

export const createInfiniteParamsFn = 'createInfiniteParams';
export const createQueryKeyFn = 'createQueryKey';
export const infiniteQueryOptionsFn = 'infiniteQueryOptions';
export const mutationOptionsFn = 'mutationOptions';
export const queryKeyName = 'QueryKey';
export const queryOptionsFn = 'queryOptions';
export const TOptionsType = 'TOptions';

export const toInfiniteQueryOptionsName = (operation: Operation) =>
  `${serviceFunctionIdentifier({
    config: getConfig(),
    id: operation.name,
    operation,
  })}InfiniteOptions`;

export const toMutationOptionsName = (operation: Operation) =>
  `${serviceFunctionIdentifier({
    config: getConfig(),
    id: operation.name,
    operation,
  })}Mutation`;

export const toQueryOptionsName = ({
  config,
  id,
  operation,
}: {
  config: Config;
  id: string;
  operation: IROperationObject | Operation;
}) =>
  `${serviceFunctionIdentifier({
    config,
    id,
    operation,
  })}Options`;

export const toQueryKeyName = ({
  config,
  id,
  isInfinite,
  operation,
}: {
  config: Config;
  id: string;
  isInfinite?: boolean;
  operation: IROperationObject | Operation;
}) =>
  `${serviceFunctionIdentifier({
    config,
    id,
    operation,
  })}${isInfinite ? 'Infinite' : ''}QueryKey`;

export const getClientBaseUrlKey = () => {
  const config = getConfig();
  return config.client.name === '@hey-api/client-axios' ? 'baseURL' : 'baseUrl';
};

export const getPaginationIn = (parameter: OperationParameter) => {
  switch (parameter.in) {
    case 'formData':
      return 'body';
    case 'header':
      return 'headers';
    default:
      return parameter.in;
  }
};

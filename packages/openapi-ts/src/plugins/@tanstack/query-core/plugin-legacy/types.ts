import type { ImportExportItemObject } from '../../../../compiler/utils';
import type { OperationParameter } from '../../../../types/client';
import type { Config as AngularQueryConfig } from '../../angular-query-experimental';
import type { Config as ReactQueryConfig } from '../../react-query';
import type { Config as SolidQueryConfig } from '../../solid-query';
import type { Config as SvelteQueryConfig } from '../../svelte-query';
import type { Config as VueQueryConfig } from '../../vue-query';

export type SupportedQueryConfig =
  | ReactQueryConfig
  | AngularQueryConfig
  | SolidQueryConfig
  | SvelteQueryConfig
  | VueQueryConfig;

export interface TypeData {
  typeData: string;
}

export interface TypeError {
  typeError: ImportExportItemObject;
}

export interface TypeResponse {
  typeResponse: string;
}

export interface PaginationInfo {
  field: any;
  parameter: OperationParameter; // Could be Model | OperationParameter
}

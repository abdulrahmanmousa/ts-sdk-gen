import qs from 'qs';

import type { Config } from './types';

interface PathSerializer {
  path: Record<string, unknown>;
  url: string;
}

const PATH_PARAM_RE = /\{[^{}]+\}/g;

type ArrayStyle = 'form' | 'spaceDelimited' | 'pipeDelimited';
type MatrixStyle = 'label' | 'matrix' | 'simple';
type ArraySeparatorStyle = ArrayStyle | MatrixStyle;
type ObjectStyle = 'form' | 'deepObject';
type ObjectSeparatorStyle = ObjectStyle | MatrixStyle;

export type QuerySerializer = (query: Record<string, unknown>) => string;

export type BodySerializer = (body: any) => any;

interface SerializerOptions<T> {
  /**
   * @default true
   */
  explode: boolean;
  style: T;
}

interface SerializeOptions<T>
  extends SerializePrimitiveOptions,
    SerializerOptions<T> {}
interface SerializePrimitiveOptions {
  allowReserved?: boolean;
  name: string;
}
interface SerializePrimitiveParam extends SerializePrimitiveOptions {
  value: string;
}

export interface QuerySerializerOptions {
  allowReserved?: boolean;
  array?: SerializerOptions<ArrayStyle>;
  object?: SerializerOptions<ObjectStyle>;
}

const serializePrimitiveParam = ({
  allowReserved,
  name,
  value,
}: SerializePrimitiveParam) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'object') {
    throw new Error(
      'Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.',
    );
  }

  return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
};

const separatorArrayExplode = (style: ArraySeparatorStyle) => {
  switch (style) {
    case 'label':
      return '.';
    case 'matrix':
      return ';';
    case 'simple':
      return ',';
    default:
      return '&';
  }
};

const separatorArrayNoExplode = (style: ArraySeparatorStyle) => {
  switch (style) {
    case 'form':
      return ',';
    case 'pipeDelimited':
      return '|';
    case 'spaceDelimited':
      return '%20';
    default:
      return ',';
  }
};

const separatorObjectExplode = (style: ObjectSeparatorStyle) => {
  switch (style) {
    case 'label':
      return '.';
    case 'matrix':
      return ';';
    case 'simple':
      return ',';
    default:
      return '&';
  }
};

const serializeArrayParam = ({
  allowReserved,
  explode,
  name,
  style,
  value,
}: SerializeOptions<ArraySeparatorStyle> & {
  value: unknown[];
}) => {
  if (!explode) {
    const joinedValues = (
      allowReserved ? value : value.map((v) => encodeURIComponent(v as string))
    ).join(separatorArrayNoExplode(style));
    switch (style) {
      case 'label':
        return `.${joinedValues}`;
      case 'matrix':
        return `;${name}=${joinedValues}`;
      case 'simple':
        return joinedValues;
      default:
        return `${name}=${joinedValues}`;
    }
  }

  const separator = separatorArrayExplode(style);
  const joinedValues = value
    .map((v) => {
      if (style === 'label' || style === 'simple') {
        return allowReserved ? v : encodeURIComponent(v as string);
      }

      return serializePrimitiveParam({
        allowReserved,
        name,
        value: v as string,
      });
    })
    .join(separator);
  return style === 'label' || style === 'matrix'
    ? separator + joinedValues
    : joinedValues;
};

const serializeObjectParam = ({
  allowReserved,
  explode,
  name,
  style,
  value,
}: SerializeOptions<ObjectSeparatorStyle> & {
  value: Record<string, unknown> | Date;
}) => {
  if (value instanceof Date) {
    return `${name}=${value.toISOString()}`;
  }

  if (style !== 'deepObject' && !explode) {
    let values: string[] = [];
    Object.entries(value).forEach(([key, v]) => {
      values = [
        ...values,
        key,
        allowReserved ? (v as string) : encodeURIComponent(v as string),
      ];
    });
    const joinedValues = values.join(',');
    switch (style) {
      case 'form':
        return `${name}=${joinedValues}`;
      case 'label':
        return `.${joinedValues}`;
      case 'matrix':
        return `;${name}=${joinedValues}`;
      default:
        return joinedValues;
    }
  }

  const separator = separatorObjectExplode(style);
  const joinedValues = Object.entries(value)
    .map(([key, v]) =>
      serializePrimitiveParam({
        allowReserved,
        name: style === 'deepObject' ? `${name}[${key}]` : key,
        value: v as string,
      }),
    )
    .join(separator);
  return style === 'label' || style === 'matrix'
    ? separator + joinedValues
    : joinedValues;
};

const defaultPathSerializer = ({ path, url: _url }: PathSerializer) => {
  let url = _url;
  const matches = _url.match(PATH_PARAM_RE);
  if (matches) {
    for (const match of matches) {
      let explode = false;
      let name = match.substring(1, match.length - 1);
      let style: ArraySeparatorStyle = 'simple';

      if (name.endsWith('*')) {
        explode = true;
        name = name.substring(0, name.length - 1);
      }

      if (name.startsWith('.')) {
        name = name.substring(1);
        style = 'label';
      } else if (name.startsWith(';')) {
        name = name.substring(1);
        style = 'matrix';
      }

      const value = path[name];

      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        url = url.replace(
          match,
          serializeArrayParam({ explode, name, style, value }),
        );
        continue;
      }

      if (typeof value === 'object') {
        url = url.replace(
          match,
          serializeObjectParam({
            explode,
            name,
            style,
            value: value as Record<string, unknown>,
          }),
        );
        continue;
      }

      if (style === 'matrix') {
        url = url.replace(
          match,
          `;${serializePrimitiveParam({
            name,
            value: value as string,
          })}`,
        );
        continue;
      }

      const replaceValue = encodeURIComponent(
        style === 'label' ? `.${value as string}` : (value as string),
      );
      url = url.replace(match, replaceValue);
    }
  }
  return url;
};

export const createQuerySerializer = <T = unknown>({
  allowReserved,
  array,
  object,
}: QuerySerializerOptions = {}) => {
  const querySerializer = (queryParams: T) => {
    let search: string[] = [];
    if (queryParams && typeof queryParams === 'object') {
      for (const name in queryParams) {
        const value = queryParams[name];

        if (value === undefined || value === null) {
          continue;
        }

        if (Array.isArray(value)) {
          search = [
            ...search,
            serializeArrayParam({
              allowReserved,
              explode: true,
              name,
              style: 'form',
              value,
              ...array,
            }),
          ];
          continue;
        }

        if (typeof value === 'object') {
          search = [
            ...search,
            serializeObjectParam({
              allowReserved,
              explode: true,
              name,
              style: 'deepObject',
              value: value as Record<string, unknown>,
              ...object,
            }),
          ];
          continue;
        }

        search = [
          ...search,
          serializePrimitiveParam({
            allowReserved,
            name,
            value: value as string,
          }),
        ];
      }
    }
    return search.join('&');
  };
  return querySerializer;
};

// Helper function to map array styles to qs arrayFormat
function mapArrayFormatStyle(
  style?: ArrayStyle,
): qs.IStringifyOptions['arrayFormat'] {
  switch (style) {
    case 'form':
      return 'brackets';
    case 'spaceDelimited':
      return 'repeat'; // closest approximation
    case 'pipeDelimited':
      return 'comma'; // closest approximation
    default:
      return 'brackets';
  }
}

/**
 * Creates a query serializer using the qs library
 */
export const createQsQuerySerializer = <T = unknown>({
  allowReserved,
  array,
  object,
}: QuerySerializerOptions = {}) => {
  // Map our options to qs options
  const qsOptions: qs.IStringifyOptions = {
    allowDots: object?.style === 'deepObject',
    arrayFormat: mapArrayFormatStyle(array?.style),
    encode: !allowReserved,
    // explode: array?.explode ?? true,
  };

  // Return the serializer function
  const querySerializer = (queryParams: T) => {
    if (!queryParams || typeof queryParams !== 'object') return '';
    let finalQueryParams = queryParams;
    if ((queryParams as any)?.query?.query) {
      finalQueryParams = (queryParams as any)?.query?.query;
    } else if ((queryParams as any)?.query) {
      finalQueryParams = (queryParams as any)?.query;
    }

    return qs.stringify(finalQueryParams as Record<string, any>, qsOptions);
  };

  return querySerializer;
};

/**
 * Infers parseAs value from provided Content-Type header.
 */
export const getParseAs = (
  contentType: string | null,
): Exclude<Config['parseAs'], 'auto' | 'stream'> => {
  if (!contentType) {
    return;
  }

  const cleanContent = contentType.split(';')[0].trim();

  if (
    cleanContent.startsWith('application/json') ||
    cleanContent.endsWith('+json')
  ) {
    return 'json';
  }

  if (cleanContent === 'multipart/form-data') {
    return 'formData';
  }

  if (
    ['application/', 'audio/', 'image/', 'video/'].some((type) =>
      cleanContent.startsWith(type),
    )
  ) {
    return 'blob';
  }

  if (cleanContent.startsWith('text/')) {
    return 'text';
  }
};

export const getUrl = ({
  baseUrl,
  path,
  query,
  querySerializer,
  url: _url,
}: {
  baseUrl: string;
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  querySerializer: QuerySerializer;
  url: string;
}) => {
  const pathUrl = _url.startsWith('/') ? _url : `/${_url}`;
  let url = baseUrl + pathUrl;
  if (path) {
    url = defaultPathSerializer({ path, url });
  }
  let search = query ? querySerializer(query) : '';
  if (search.startsWith('?')) {
    search = search.substring(1);
  }
  if (search) {
    url += `?${search}`;
  }
  return url;
};

export const mergeConfigs = (a: Config, b: Config): Config => {
  const config = { ...a, ...b };
  if (config.baseUrl?.endsWith('/')) {
    config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
  }
  config.headers = mergeHeaders(a.headers, b.headers);
  return config;
};

export const mergeHeaders = (
  ...headers: Array<Required<Config>['headers'] | undefined>
) => {
  const mergedHeaders = new Headers();
  for (const header of headers) {
    if (!header || typeof header !== 'object') {
      continue;
    }

    const iterator =
      header instanceof Headers ? header.entries() : Object.entries(header);

    for (const [key, value] of iterator) {
      if (value === null) {
        mergedHeaders.delete(key);
      } else if (Array.isArray(value)) {
        for (const v of value) {
          mergedHeaders.append(key, v as string);
        }
      } else if (value !== undefined) {
        // assume object headers are meant to be JSON stringified, i.e. their
        // content value in OpenAPI specification is 'application/json'
        mergedHeaders.set(
          key,
          typeof value === 'object' ? JSON.stringify(value) : (value as string),
        );
      }
    }
  }
  return mergedHeaders;
};

type ErrInterceptor<Err, Res, Req, Options> = (
  error: Err,
  response: Res,
  request: Req,
  options: Options,
) => Err | Promise<Err>;

type ReqInterceptor<Req, Options> = (
  request: Req,
  options: Options,
) => Req | Promise<Req>;

type ResInterceptor<Res, Req, Options> = (
  response: Res,
  request: Req,
  options: Options,
) => Res | Promise<Res>;

class Interceptors<Interceptor> {
  _fns: Interceptor[];

  constructor() {
    this._fns = [];
  }

  clear() {
    this._fns = [];
  }

  exists(fn: Interceptor) {
    return this._fns.indexOf(fn) !== -1;
  }

  eject(fn: Interceptor) {
    const index = this._fns.indexOf(fn);
    if (index !== -1) {
      this._fns = [...this._fns.slice(0, index), ...this._fns.slice(index + 1)];
    }
  }

  use(fn: Interceptor) {
    this._fns = [...this._fns, fn];
  }
}

// `createInterceptors()` response, meant for external use as it does not
// expose internals
export interface Middleware<Req, Res, Err, Options> {
  error: Pick<
    Interceptors<ErrInterceptor<Err, Res, Req, Options>>,
    'eject' | 'use'
  >;
  request: Pick<Interceptors<ReqInterceptor<Req, Options>>, 'eject' | 'use'>;
  response: Pick<
    Interceptors<ResInterceptor<Res, Req, Options>>,
    'eject' | 'use'
  >;
}

// do not add `Middleware` as return type so we can use _fns internally
export const createInterceptors = <Req, Res, Err, Options>() => ({
  error: new Interceptors<ErrInterceptor<Err, Res, Req, Options>>(),
  request: new Interceptors<ReqInterceptor<Req, Options>>(),
  response: new Interceptors<ResInterceptor<Res, Req, Options>>(),
});

const serializeFormDataPair = (data: FormData, key: string, value: unknown) => {
  if (typeof value === 'string' || value instanceof Blob) {
    data.append(key, value);
  } else {
    data.append(key, JSON.stringify(value));
  }
};

export const formDataBodySerializer = {
  bodySerializer: <T extends Record<string, any> | Array<Record<string, any>>>(
    body: T,
  ) => {
    const data = new FormData();

    Object.entries(body).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v) => serializeFormDataPair(data, key, v));
      } else {
        serializeFormDataPair(data, key, value);
      }
    });

    return data;
  },
};

export const jsonBodySerializer = {
  bodySerializer: <T>(body: T) => JSON.stringify(body),
};

const serializeUrlSearchParamsPair = (
  data: URLSearchParams,
  key: string,
  value: unknown,
) => {
  if (typeof value === 'string') {
    data.append(key, value);
  } else {
    data.append(key, JSON.stringify(value));
  }
};

export const urlSearchParamsBodySerializer = {
  bodySerializer: <T extends Record<string, any> | Array<Record<string, any>>>(
    body: T,
  ) => {
    const data = new URLSearchParams();

    Object.entries(body).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v) => serializeUrlSearchParamsPair(data, key, v));
      } else {
        serializeUrlSearchParamsPair(data, key, value);
      }
    });

    return data;
  },
};

const defaultQuerySerializer = createQuerySerializer({
  allowReserved: false,
  array: {
    explode: true,
    style: 'form',
  },
  object: {
    explode: true,
    style: 'deepObject',
  },
});

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export const createConfig = (override: Config = {}): Config => ({
  ...jsonBodySerializer,
  baseUrl: '',
  fetch: globalThis.fetch,
  headers: defaultHeaders,
  parseAs: 'auto',
  querySerializer:
    override.useQsSerializer !== false
      ? createQsQuerySerializer()
      : defaultQuerySerializer,
  ...override,
});

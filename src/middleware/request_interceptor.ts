import type { Class, JsonValue } from "type-fest";
import type { TRequestBody, TRequestCookies, THeadersSchema, TRequestQueryParams, TRequestType, TUrlParamsSchema } from "../request/request.class";
import type { Response } from "../response/response.class";

export type TRequestInterceptor<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  > = IInterceptRequest<Body, Headers, Cookies, URLParams, QueryParams> | TInterceptRequestFn<Body, Headers, Cookies, URLParams, QueryParams>;


interface IInterceptRequest<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > {
  name: string;

  body?: Body;
  headers?: Headers;
  cookies?: Cookies;
  urlParams?: URLParams;
  queryParams?: QueryParams;

  interceptor: TInterceptRequestFn<Body, Headers, Cookies, URLParams, QueryParams, Services>;

  provide? : {
    [name : string] : Class<unknown> | ((...args : any) => any) | JsonValue;
  };
}

export type TInterceptRequestFn<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = (req: TRequestType<Body, Headers, Cookies, URLParams, QueryParams>, ...services: Services) =>
    | TRequestType<Body, Headers, Cookies, URLParams, QueryParams> | Response | Error
    | Promise<TRequestType<Body, Headers, Cookies, URLParams, QueryParams> | Response | Error>;

export function createRequestInterceptor<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  >(options: IInterceptRequest<Body, Headers, Cookies, URLParams, QueryParams, Services>) {
  const g: IInterceptRequest<Body, Headers, Cookies, URLParams, QueryParams, Services> = {
    ...options
  };
  return g;
}
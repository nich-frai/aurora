import type { Class, JsonValue } from "type-fest";
import type { TRequestBody, TRequestCookies, TRequestHeaders, TRequestQueryParams, TRequestType, TRequestURLParams } from "../request/request.class";
import type { HTTPResponse } from "../response/response.class";

export type HTTPRequestInterceptor<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  > = IInterceptHTTPRequest<Body, Headers, Cookies, URLParams, QueryParams> | TInterceptHTTPRequestFn<Body, Headers, Cookies, URLParams, QueryParams>;


interface IInterceptHTTPRequest<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > {
  name: string;

  body?: Body;
  headers?: Headers;
  cookies?: Cookies;
  urlParams?: URLParams;
  queryParams?: QueryParams;

  interceptor: TInterceptHTTPRequestFn<Body, Headers, Cookies, URLParams, QueryParams, Services>;

  provide? : {
    [name : string] : Class<unknown> | ((...args : any) => any) | JsonValue;
  };
}

export type TInterceptHTTPRequestFn<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = (req: TRequestType<Body, Headers, Cookies, URLParams, QueryParams>, ...services: Services) =>
    | TRequestType<Body, Headers, Cookies, URLParams, QueryParams> | HTTPResponse | Error
    | Promise<TRequestType<Body, Headers, Cookies, URLParams, QueryParams> | HTTPResponse | Error>;

export function createRequestInterceptor<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  >(options: IInterceptHTTPRequest<Body, Headers, Cookies, URLParams, QueryParams, Services>) {
  const g: IInterceptHTTPRequest<Body, Headers, Cookies, URLParams, QueryParams, Services> = {
    ...options
  };
  return g;
}
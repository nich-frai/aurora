import type { TRequestBody, TRequestCookies, TRequestHeaders, TRequestQueryParams, TRequestType, TRequestURLParams } from "../request/request.class";
import type { HTTPResponse } from "../response/response.class";

export type RouteGuard<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = IRouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services> | TRouteGuardFn<Body, Headers, Cookies, URLParams, QueryParams, Services>;

export interface IRouteGuard<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > {
  name?: string;

  body?: Body;
  headers?: Headers;
  cookies?: Cookies;
  urlParams?: URLParams;
  queryParams?: QueryParams;

  guard: TRouteGuardFn<Body, Headers, Cookies, URLParams, QueryParams, Services>;
}

export type TRouteGuardFn<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = (
    req: TRequestType<Body, Headers, Cookies, URLParams, QueryParams>,
    ...services: Services
  ) =>
    | boolean | HTTPResponse
    | Promise<boolean | HTTPResponse>;

export function createGuard<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  >(options: IRouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services>) {

  const g: IRouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services> = {
    ...options
  };
  return g;
}
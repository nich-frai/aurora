import type { TRequestBody, TRequestCookies, THeadersSchema, TRequestQueryParams, TRequestType, TUrlParamsSchema } from "../request/request.class";
import type { Response } from "../response/response.class";

export type RouteGuard<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = IRouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services> | TRouteGuardFn<Body, Headers, Cookies, URLParams, QueryParams, Services>;

export interface IRouteGuard<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
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
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = (
    req: TRequestType<Body, Headers, Cookies, URLParams, QueryParams>,
    ...services: Services
  ) =>
    | boolean | Response
    | Promise<boolean | Response>;

export function createGuard<
  Body extends TRequestBody | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  >(options: IRouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services>) {

  const g: IRouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services> = {
    ...options
  };
  return g;
}
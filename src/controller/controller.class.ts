import type { RouteGuard } from "../middleware/guard";
import type { HTTPRequestInterceptor } from "../middleware/request_interceptor";
import type { HTTPResponseInterceptor } from "../middleware/response_interceptor";
import type { TRequestBody, TRequestCookies, TRequestHeaders, TRequestQueryParams, TRequestURLParams } from "../request/request.class";
import type { Route } from "../route/route.class";

export class Controller<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[]
  > {

  register?: Record<string, unknown>;

  interceptRequest?: (HTTPRequestInterceptor<Body, Headers, Cookies, URLParams, QueryParams>)[] = [];
  interceptResponse?: HTTPResponseInterceptor[] = [];
  guard?: RouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services>[] = [];

  // require schema
  headers?: Headers;
  cookies?: Cookies;
  body?: Body;
  queryParams?: QueryParams;
  urlParams?: URLParams;

  applyToRoute(...routes: Route<Body, Headers, Cookies, URLParams, QueryParams>[]) {
    routes.forEach(route => {
      // preppend interceptors and guards
      route.requestInterceptor = [...this.interceptRequest ?? [], ...route.requestInterceptor ?? []];
      route.responseInterceptor = [...this.interceptResponse ?? [], ...route.responseInterceptor ?? []];
      route.guards = [...this.guard ?? [], ...route.guards ?? []] as any[];

      // merge schemas
      if (route.body != null) {
        if (this.body != null) {
          route.body = route.body!
        } else {
          route.body = route.body!.merge(this.body!) as any;
        }
      } else {
        route.body = this.body;
      }

      if(route.cookies != null) {
        route.cookies = {
          ...this.cookies!,
          ...route.cookies
        };
      } else {
        route.cookies = this.cookies;
      }

      if(route.headers != null) {
        route.headers = {
          ...this.headers!,
          ...route.headers
        };
      } else {
        route.headers = this.headers;
      }

      if(route.urlParams != null) {
        route.urlParams = {
          ...this.urlParams!,
          ...route.urlParams
        };
      } else {
        route.urlParams = this.urlParams;
      }

      if(route.queryParams != null) {
        route.queryParams = {
          ...this.queryParams!,
          ...route.queryParams
        };
      } else {
        route.queryParams = this.queryParams;
      }

      if(route.register != null) {
        route.register = {
          ...this.register,
          ...route.register
        };
      } else {
        route.register = this.register;
      }

    });
  }
}

export function createController<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  >(options: ICreateController<Body, Headers, Cookies, URLParams, QueryParams, Services>) {
  const ctrl = new Controller<Body, Headers, Cookies, URLParams, QueryParams, Services>();

  ctrl.body = options.body;
  ctrl.headers = options.headers;
  ctrl.cookies = options.cookies;
  ctrl.urlParams = options.urlParams;
  ctrl.queryParams = options.queryParams;

  ctrl.register = options.register;

  ctrl.guard = options.guard;
  ctrl.interceptRequest = options.interceptRequest;
  ctrl.interceptResponse = options.interceptResponse;

  return ctrl;
}

export interface ICreateController<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Services extends unknown[] = unknown[],
  > {
  register?: Record<string, unknown>;

  interceptRequest?: HTTPRequestInterceptor<Body, Headers, Cookies, URLParams, QueryParams>[];
  interceptResponse?: HTTPResponseInterceptor[];
  guard?: RouteGuard<Body, Headers, Cookies, URLParams, QueryParams, Services>[];

  // require schema
  headers?: Headers;
  cookies?: Cookies;
  body?: Body;
  queryParams?: QueryParams;
  urlParams?: URLParams;
}


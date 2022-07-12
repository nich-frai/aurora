import type { TRequestBody, TRequestCookies, TRequestHeaders, TRequestQueryParams, TRequestType, TRequestURLParams } from "../request/request.class";
import type { HTTPResponse } from "../response/response.class";

export type HTTPResponseInterceptor = IInterceptHTTPResponse | TInterceptHTTPResponseFn;


interface IInterceptHTTPResponse {
  name: string;
  interceptor: TInterceptHTTPResponseFn;
  interceptWhen?: TResponseInterceptionMoment | TResponseInterceptionMoment[];
}

export type TResponseInterceptionMoment =
  | 'data-validation-failed'

  | 'interceptor-prevented-progression'
  | 'interceptor-prevented-progression-with-ok-response'
  | 'interceptor-prevented-progression-with-error-response'

  | 'guard-prevented-progression'

  | 'handler-finished'
  | 'handler-finished-with-ok-response'
  | 'handler-finished-with-error-response'

  | 'before-writing-to-client'
  | 'always'
  ;

export type TInterceptHTTPResponseFn<
Body extends TRequestBody | undefined = undefined,
Headers extends TRequestHeaders | undefined = undefined,
Cookies extends TRequestCookies | undefined = undefined,
URLParams extends TRequestURLParams | undefined = undefined,
QueryParams extends TRequestQueryParams | undefined = undefined,
Services extends unknown[] = unknown[],
> = (res: HTTPResponse, req : TRequestType<Body, Headers, Cookies, URLParams, QueryParams>, ...services: Services) =>
  | HTTPResponse
  | Promise<HTTPResponse>;

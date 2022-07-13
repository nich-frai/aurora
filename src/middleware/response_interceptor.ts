import type { TRequestBody, TRequestCookies, TRequestHeaders, TRequestQueryParams, TRequestType, TRequestURLParams } from "../request/request.class";
import type { Response } from "../response/response.class";

export type TResponseInterceptor = IInterceptResponse | TInterceptResponseFn;

interface IInterceptResponse {
  name: string;
  interceptor: TInterceptResponseFn;
}

export type TResponseInterceptionMoment =
  | 'data-validation-failed'

  | 'raw-interceptor-prevented-progression-with-error-response' 
  | 'raw-interceptor-prevented-progression-with-ok-response' 
  
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

export type TInterceptResponseFn<
Body extends TRequestBody | undefined = undefined,
Headers extends TRequestHeaders | undefined = undefined,
Cookies extends TRequestCookies | undefined = undefined,
URLParams extends TRequestURLParams | undefined = undefined,
QueryParams extends TRequestQueryParams | undefined = undefined,
Services extends unknown[] = unknown[],
> = (res: Response, req : TRequestType<Body, Headers, Cookies, URLParams, QueryParams>, ...services: Services) =>
  | Response
  | Promise<Response>;

export function createResponseInterceptor(options : IInterceptResponse) {
  return options;
}
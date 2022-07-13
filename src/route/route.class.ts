import type { HTTPMethod } from "find-my-way";
import type { RouteGuard } from "middleware/guard";
import type { TRawInterceptor } from "middleware/raw";
import type { TBodySchema } from "schema/body";
import type { TFileSchema } from "schema/file";
import type { PartialDeep } from "type-fest";
import type { THttpConfiguration } from "../config/http.config";
import type { TRequestInterceptor } from "../middleware/request_interceptor";
import type { TResponseInterceptor } from "../middleware/response_interceptor";
import type { TRequestCookies, TRequestHeaders, TRequestQueryParams, TRequestType, TRequestURLParams } from "../request/request.class";

/**
 * [HTTP] Route
 * ------------
 * Holds the instructions to serve a route endpoint to the client,
 * the HTTP server generates a handler function based on the "configuration"
 * of this route, applying in a known way each attribute described in this class
 * properties;
 * 
 */
export class Route<
  Body extends TBodySchema | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Files extends TFileSchema | undefined = undefined,
  Services extends unknown[] = unknown[],
  > {

  /**
   * Method
   * ------
   * Describe which HTTP Method this route will listen to
   * (If CORS is enabled the  other required methods for preflight are generated accordingly)
   */
  method?: Lowercase<HTTPMethod> = undefined;

  /**
   * URL
   * ----
   * Describe the pathname this route will listen to, the path is
   * analyzed by "find-my-way" router and all path parameters supported can be found
   * in their documentation in GitHub
   * @link https://github.com/delvedor/find-my-way
   */
  url?: string;

  // request incoming data schema
  /**
   * Body (schema)
   * -------------
   * Describes the shape of incoming data from the request body using Zod
   * 
   * NOTICE: "Files" are treated separetly since their validation differs from 
   * the usual JSON validation present from Zod, if a multipart/form-data is passed
   * all non-file should have its schema described here
   */
  body?: Body;
  /**
   * Headers (schema)
   * ----------------
   * Describe the shape of "required" headers using Zod
   * 
   * All headers of the incoming http request will  be present in here but only the 
   * required/described ones will have their value validated by the schema
   */
  headers?: Headers;
  /**
   * Cookies (schema)
   * ----------------
   * Describe the shape of cookies
   * 
   * Cookies will only be here if described by the route, otherwise they will no be populated
   * even if present in the incoming HTTP request
   */
  cookies?: Cookies;
  /**
   * URL Params (schema)
   * -------------------
   * Describe validations for the URL parameters (eg: /user/:name)
   * 
   * URL params are present here even if not described in the schema
   */
  urlParams?: URLParams;
  /**
   * Query Params (schema)
   * ---------------------
   * Describe the shape of query params (eg: url?a=b)
   * 
   * Query values will only be present if described by the route, otherwise they will not be populated
   * even if present in the incoming HTTP request URL
   */
  queryParams?: QueryParams;
  /**
   * Files (schema)
   * --------------
   * Describe the requirements for the incoming files, can be either a single file or an array of files
   * 
   * NOTICE: when using with form data all non-file properties should be described in the body schema
   */
  files?: Files;

  // config
  config?: PartialDeep<THttpConfiguration['route']>;

  register? : Record<string, unknown>;

  // lifecycle interceptors
  rawInterceptor? : TRawInterceptor[];

  /**
   * Request Interceptor
   * --------------------
   * a.k.a as "middlewares", request interceptors have a chance to modify the incoming request just as
   * prevent further progression in the handling of the request by either returning an error or
   * a HTTPResponse instance;
   * 
   * Request interceptors are called AFTER incoming data validation and BEFORE route guards
   */
  requestInterceptor?: TRequestInterceptor<Body, Headers, Cookies, URLParams, QueryParams>[];

  /**
   * Route Guard
   * -----------
   * Act the same as middlewares but are not expected to change the request data (changes are discarded
   * since multiple guard functions may run in "parallel").
   * May prevent the handler from being invoked with a default message by returning false or more 
   * complex responses by returning HTTPErrors or HTTPResponse instances 
   */
  guards?: RouteGuard[];

  /**
   * Response Interceptor
   * --------------------
   * a.k.a as "middlewares", response interceptors have a chance to modify the outgoing response
   * generated by the route handler before writing it to the client;
   * 
   * Useful for checking the response, adding security headers, firing success hooks and so on;
   * Are triggered AFTER the route handler finished, short-circuiting the request-response
   * will NOT go through response interceptors;
   */
  responseInterceptor?: TResponseInterceptor[];

  // actual route handler
  handler!: HTTPRequestHandler<Body, Headers, Cookies, URLParams, QueryParams, Files, Services>;

}

/**
 * [HTTP] Route request handler function
 * --------------------------------------
 * Function that defines the behaviour of a route in the server,
 * it can accepts the shape of the various incoming data sources,
 * the enforcement and actual validation of such data with zod is performed
 * by the server itself before the invokation of this function just as the
 * service registration/resolution;
 * 
 */
type HTTPRequestHandler<
  Body extends TBodySchema | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Files extends TFileSchema | undefined = undefined,
  Services extends unknown[] = unknown[],
  > = (req: TRequestType<Body, Headers, Cookies, URLParams, QueryParams, Files>, ...services: Services) => unknown | Promise<unknown>;


export function createRoute<
  Body extends TBodySchema | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Files extends TFileSchema | undefined = undefined,
  Services extends unknown[] = unknown[]
>(options: Omit<ICreateRouteOptions<Body, Headers, Cookies, URLParams, QueryParams, Files, Services>, "provide">) {

  const route = new Route<Body, Headers, Cookies, URLParams, QueryParams, Files, Services>();

  route.url = options.url;
  route.method = options.method;
  route.config = options.config;

  route.headers = options.headers;
  route.body = options.body;
  route.cookies = options.cookies;
  route.files = options.files;
  route.queryParams = options.queryParams;
  route.urlParams = options.urlParams;

  route.rawInterceptor = options.rawInterceptor ?? [];
  route.guards = options.guards ?? [];
  route.requestInterceptor = options.requestInterceptor as any[] ?? [];
  route.responseInterceptor = options.responseInterceptor ?? [];

  route.handler = options.handler ?? (() => {
    return 'Default route handler, provide a function to override this behaviour!';
  }) as any;

  return route;
}

export type ICreateRouteOptions<
  Body extends TBodySchema | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Files extends TFileSchema | undefined = undefined,
  Services extends unknown[] = unknown[]
  > = {
    method?: Lowercase<HTTPMethod>;
    url?: string;

    // request incoming data schema
    body?: Body;
    headers?: Headers;
    cookies?: Cookies;
    urlParams?: URLParams;
    queryParams?: QueryParams;
    files?: Files;

    // config
    config?: PartialDeep<THttpConfiguration['route']>;

    // lifecycle interceptors
    rawInterceptor? : TRawInterceptor[];
    requestInterceptor?: TRequestInterceptor<
      NonNullable<Body>,
      NonNullable<Headers>,
      NonNullable<Cookies>,
      NonNullable<URLParams>,
      NonNullable<QueryParams>
    >[];
    responseInterceptor?: TResponseInterceptor[];
    guards?: RouteGuard[];

    // actual route handler
    handler?: HTTPRequestHandler<Body, Headers, Cookies, URLParams, QueryParams, Files, Services>;
  }

export type HTTPIncomingHeaders =

  | 'accept-language'
  | 'accept-patch'
  | 'accept-ranges'
  | 'access-control-allow-credentials'
  | 'access-control-allow-headers'
  | 'access-control-allow-methods'
  | 'access-control-allow-origin'
  | 'access-control-expose-headers'
  | 'access-control-max-age'
  | 'access-control-request-headers'
  | 'access-control-request-method'
  | 'age'
  | 'allow'
  | 'alt-svc'
  | 'authorization'
  | 'cache-control'
  | 'connection'
  | 'content-disposition'
  | 'content-encoding'
  | 'content-language'
  | 'content-length'
  | 'content-location'
  | 'content-range'
  | 'content-type'
  | 'cookie'
  | 'date'
  | 'etag'
  | 'expect'
  | 'expires'
  | 'forwarded'
  | 'from'
  | 'host'
  | 'if-match'
  | 'if-modified-since'
  | 'if-none-match'
  | 'if-unmodified-since'
  | 'last-modified'
  | 'location'
  | 'origin'
  | 'pragma'
  | 'proxy-authenticate'
  | 'proxy-authorization'
  | 'public-key-pins'
  | 'range'
  | 'referer'
  | 'retry-after'
  | 'sec-websocket-accept'
  | 'sec-websocket-extensions'
  | 'sec-websocket-key'
  | 'sec-websocket-protocol'
  | 'sec-websocket-version'
  | 'set-cookie'
  | 'strict-transport-security'
  | 'tk'
  | 'trailer'
  | 'transfer-encoding'
  | 'upgrade'
  | 'user-agent'
  | 'vary'
  | 'via'
  | 'warning'
  | 'www-authenticate'
  | string & {};

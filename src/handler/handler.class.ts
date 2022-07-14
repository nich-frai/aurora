import type { RouteGuard, TRawInterceptor } from "aurora.lib";
import type { AwilixContainer } from "awilix";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { TBodySchema } from "schema/body";
import type { TFileSchema } from "schema/file";
import type { AnyZodObject } from "zod";
import { BadRequest, InternalServerError, Unauthorized } from "../error/http_error";
import { MissingServiceInContainer } from "../error/missing_service.error";
import { Logger } from "../logger";
import type { TRequestInterceptor } from "../middleware/request_interceptor";
import type { TResponseInterceptionMoment, TResponseInterceptor } from "../middleware/response_interceptor";
import { createBodyParser } from "../parser/body";
import { createCookieParser, type TCookiesSchema } from "../parser/cookies";
import { createQueryParser, TQueryParamsSchema } from "../parser/queryParams";
import { Request, THeadersSchema, TUrlParamsSchema } from "../request/request.class";
import { Response } from "../response/response.class";
import type { Route } from "../route/route.class";

export class Handler {

  static fromRoute = createHandlerFromRoutefromRoute;

  #cachedFunctionParameters = new Map<Function, string[]>();

  #logger: Logger;

  acceptsContentType : string | string[] | undefined = undefined;

  // -- schemas, contributed by route handlers, guards and interceptor
  body?: TBodySchema;
  headers?: THeadersSchema;
  cookies?: TCookiesSchema;
  urlParams?: TUrlParamsSchema;
  queryParams?: TQueryParamsSchema;
  files? : TFileSchema;

  // -- interceptors
  rawInterceptors: TRawInterceptor[] = [];
  requestInterceptors: TRequestInterceptor[] = [];
  guards: RouteGuard[] = [];
  responseInterceptors: TResponseInterceptor[] = [];

  handler: Route['handler'] = () => {
    return 'default handler return!';
  }

  get injector() {
    return this.container;
  }

  constructor(
    private container: AwilixContainer,
    private method: string,
    private url: string,
    //private route: Route
  ) {
    this.#logger = new Logger(
      container,
      `${Handler.name}::${this.method?.toLocaleUpperCase() ?? 'GET'}"${this.url ?? '/'}"`
    );
  }

  addResponseInterceptor(interceptor: TResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  addRequestInterceptor(interceptor: TRequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addSchema(contributor: IContributeSchema) {
    if (contributor.body != null) {
      if (this.body != null) this.body = (contributor.body as AnyZodObject).merge(this.body);
      else this.body = contributor.body;
    }

    if (contributor.headers != null) {
      if (this.headers != null) this.headers = { ...contributor.headers! as THeadersSchema, ...this.headers };
      else this.headers = contributor.headers;
    }

    if (contributor.cookies != null) {
      if (this.cookies != null) this.cookies = { ...contributor.cookies! as TCookiesSchema, ...this.cookies };
      else this.cookies = contributor.cookies;
    }

    if (contributor.urlParams != null) {
      if (this.urlParams != null)
        this.urlParams = { ...contributor.urlParams! as TUrlParamsSchema, ...this.urlParams };
      else this.urlParams = contributor.urlParams;
    }

    if (contributor.queryParams != null) {
      if (this.queryParams != null) this.queryParams = { ...contributor.queryParams! as TUrlParamsSchema, ...this.queryParams };
      else this.queryParams = contributor.queryParams;
    }
  }

  async handle(req: IncomingMessage, res: ServerResponse, urlParams: Record<string, string | undefined>) {
    // make a dependency injection scope only for this request
    const container = this.container.createScope();

    let request = await this.forgeRequest(req, urlParams, container);

    // If it returned a http response or an error a validation error ocurred!
    if (request instanceof Response || request instanceof Error) {
      let response = await this.applyResponseInterceptors(
        request,
        'data-validation-failed',
        container,
        new Request(
          container, req.url!, req.method!
        ),
      );
      return response.send(res);
    }

    // apply raw interceptors
    for (let interceptor of this.rawInterceptors ?? []) {
      const fn = typeof interceptor === 'function' ? interceptor : interceptor.interceptor;
      let intercepted = await fn(req, res, request as any);

      if (intercepted instanceof Response || intercepted instanceof Error) {

        const isErrorResponse = intercepted instanceof Error || (intercepted instanceof Response && intercepted.status() >= 400);
        const moment = isErrorResponse
          ? 'raw-interceptor-prevented-progression-with-error-response'
          : 'raw-interceptor-prevented-progression-with-ok-response';

        const response = await this.applyResponseInterceptors(
          intercepted,
          moment,
          container,
          request
        );

        return response.send(res);
      }
    }

    let interceptedRequest = await this.applyRequestInterceptors(request, container);

    // again, interceptors can short circuit the request cycle
    if (interceptedRequest instanceof Response || interceptedRequest instanceof Error) {
      const isReturnValueOfInterceptorAnError = !(interceptedRequest instanceof Error) && interceptedRequest.status() < 400;
      const moment: TResponseInterceptionMoment = isReturnValueOfInterceptorAnError
        ? 'interceptor-prevented-progression-with-error-response'
        : 'interceptor-prevented-progression-with-ok-response';
      const response = await this.applyResponseInterceptors(
        interceptedRequest,
        moment,
        container,
        request,
      );
      return response.send(res);
    }

    // update request
    request = interceptedRequest;

    // apply guards
    const canContinue = await this.applyGuards(request, container);
    const didGuardPreventedAccess = canContinue !== true;
    if (didGuardPreventedAccess) {
      let response = await this.applyResponseInterceptors(
        canContinue as Response | Error,
        'guard-prevented-progression',
        container,
        request,
      );
      return response.send(res);
    }

    // call route handler function
    let handlerResponse;
    let handlerServices: unknown[] | Error;
    handlerServices = this.resolveServices(container, this.getFunctionServices(this.handler, 1));
    if (handlerServices instanceof Error) {
      this.#logger.fatal(
        'Failed to resolve services from route handler ',
        { url: this.url, method: this.method },
        "List of route hanlder dependencies:",
        this.getFunctionServices(this.handler, 1)
      );
      return Response.error(
        new InternalServerError("Missing/unresolved required service for this route")
      ).send(res);
    }
    try {
      handlerResponse = await this.handler(request, ...handlerServices);
    } catch (err) {
      if (err instanceof Error) {
        handlerResponse = Response.error(err)
      } else {
        // TODO: throw something inside a function, should I create a new error?
        this.#logger.dev('Handler threw a non error value!', err);
      }
    }

    // transform handlerResponse into a payload if it's not already an Error or a HTTPResponse
    if (
      !(handlerResponse instanceof Response)
      && !(handlerResponse instanceof Error)
    ) {
      handlerResponse = Response.ok(handlerResponse);
    }

    const handlerRespondedWithAnError = handlerResponse instanceof Error
      || (handlerResponse instanceof Response && handlerResponse.status() >= 400);

    const moment = handlerRespondedWithAnError
      ? 'handler-finished-with-error-response'
      : 'handler-finished-with-ok-response';

    const response = await this.applyResponseInterceptors(
      handlerResponse,
      moment,
      container,
      request,
    );
    return response.send(res);
  }

  private async forgeRequest(req: IncomingMessage, urlParams: Record<string, string | undefined>, container: AwilixContainer) {

    // 1: define id, method and url
    const request: Request = new Request(container, req.url!, req.method!);

    // 2: initialize data with empty objects

    //@ts-ignore should check the "cookie" header which will come as string[]! 
    request.headers = { ...req.headers };
    request.queryParams = {};
    request.body = {};
    request.urlParams = urlParams ?? {};
    request.files = {};

    //  3: check if there are required headers
    if (this.headers != null) {
      for (let headerKey in (this.headers as THeadersSchema)) {
        let parser = (this.headers as THeadersSchema)[headerKey]!;
        let value = request.headers[headerKey];
        if(parser === true) {
          if(value != null) continue;
          else return new BadRequest(`This route requires a header named "${headerKey}" to be present!\nAll of the expected headers: ${Object.keys(this.headers).join(', ')}.`);
        }
        let parsed = parser.safeParse(value);
        if (!parsed.success) {
          return new BadRequest(`The provided header "${headerKey}" could not be validated!\n"${value}" presents the following issues: ${parsed.error.toString()}`);
        }
        request.headers[headerKey] = parsed.data;
      }
    }

    // 4: check for url params
    if (this.urlParams != null) {
      for (let urlKey in (this.urlParams as TUrlParamsSchema)) {
        let parser = (this.urlParams as TUrlParamsSchema)[urlKey];
        let value = urlParams[urlKey];
        if(parser === true) {
          if(value != null) continue;
          else return new InternalServerError(`There was an error collecting ifnromation from the url!`);
        }
        let parsed = parser.safeParse(value);
        if (!parsed.success) {
          return new BadRequest(`The provided URL is considered invalid, a piece of it does not conform with the required validations!\n"${value}" presents the following issues: ${parsed.error.toString()}`);
        }
        request.urlParams[urlKey] = parsed.data;
      }
    }

    return request;

  }

  private async applyRequestInterceptors(request: Request, container: AwilixContainer): Promise<Request | Error | Response> {

    for (let interceptor of this.requestInterceptors ?? []) {
      let interceptorFn = typeof interceptor === 'function' ? interceptor : interceptor.interceptor;
      let injectServices = this.resolveServices(container, this.getFunctionServices(interceptorFn, 1));
      if (injectServices instanceof Error) {
        this.#logger.fatal(
          'Failed to resolve services from response interceptor!',
          { url: this.url, method: this.method },
          this.getParamNames(interceptorFn)
        );
        return Response.error(new InternalServerError("Missing/unresolved required service for this route"));
      }
      let newRequest = await interceptorFn(request, ...injectServices);
      // check return from interceptor
      if (newRequest instanceof Error || newRequest instanceof Response) {
        return newRequest;
      }
      request = newRequest as any;
    }

    return request;
  }

  private async applyResponseInterceptors(
    responseOrError: Response | Error,
    moment: TResponseInterceptionMoment,
    container: AwilixContainer,
    request: Request
  ) {

    let response: Response;
    if (responseOrError instanceof Error) {
      response = Response.error(responseOrError);
    } else {
      response = responseOrError;
    }

    const interceptors = this.responseInterceptors ?? [];

    for (const interceptor of interceptors) {
      const interceptorFn = typeof interceptor === 'function' ? interceptor : interceptor.interceptor;
      let injectServices = this.resolveServices(container, this.getFunctionServices(interceptorFn, 2));
      if (injectServices instanceof Error) {
        this.#logger.fatal(
          'Failed to resolve services from response interceptor!',
          { url: this.url, method: this.method },
          this.getParamNames(interceptorFn)
        );
        return Response.error(new InternalServerError("Missing/unresolved required service for this route"));
      }
      let interceptedResponse = await interceptorFn(response, request, ...injectServices);
      if (!(interceptedResponse instanceof Response)) {
        this.#logger.warn("Response interceptor failed to return a HTTP response! Using previous reference for it!");
      } else {
        response = interceptedResponse;
      }
    }

    response.setGenerationMoment(moment);

    return response;
  }

  private async applyGuards(
    request: Request,
    container: AwilixContainer,
  ) {
    for (let guard of this.guards ?? []) {
      let guardFn = typeof guard === 'function' ? guard : guard.guard;
      let guardServices = this.resolveServices(container, this.getFunctionServices(guardFn, 1));
      if (guardServices instanceof Error) {
        this.#logger.fatal(
          'Failed to resolve services from request guard!',
          { url: this.url, method: this.method },
          this.getParamNames(guardFn),
        );
        return new InternalServerError("Missing/unresolved required service for this route");
      }
      const canContinue = await guardFn(request, ...guardServices);
      if (!canContinue || canContinue instanceof Response) {
        if (typeof canContinue == 'boolean') {
          return new Unauthorized("You may not access this endpoint!");
        }
        return canContinue;
      }
    }

    return true as true;
  }

  private resolveServices(container: AwilixContainer, serviceNames: string[]): unknown[] | MissingServiceInContainer {
    try {
      return serviceNames.map(name => container.resolve(name));
    } catch (err) {
      return new MissingServiceInContainer("Could not resolve service by its name! " + serviceNames.join(', '))
    }
  }

  private getFunctionServices(fromFunction: Function, offsetParams: number): string[] {

    if (this.#cachedFunctionParameters.has(fromFunction)) {
      return this.#cachedFunctionParameters.get(fromFunction)!;
    }

    let paramNames = this.getParamNames(fromFunction).map(a => String(a));
    if (offsetParams > 0) {
      paramNames = paramNames.slice(offsetParams);
    }

    this.#cachedFunctionParameters.set(fromFunction, paramNames);
    return paramNames;
  }

  private getParamNames(func: Function) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null)
      result = [];
    return result;
  }

  buildDataParsers() {
    // remove previous ones
    this.rawInterceptors = this.rawInterceptors.filter(
      (interceptor => {
        return ![
          'aurora.body.parser',
          'aurora.cookies.parser',
          'aurora.queryParams.parser',
        ].includes(interceptor.name)
      })
    );

    // generate based on schema

    // 1. the body parser (includes file parsing!)
    if(this.body != null) {
      const bodyParser = createBodyParser(
        { body : this.body, files : this.files, },
        this.acceptsContentType
      );
      this.rawInterceptors = [
        bodyParser,
        ...this.rawInterceptors
      ];
    }

    // 2. the cookie parser
    if(this.cookies != null) {
      const cookieParser = createCookieParser(
        this.cookies
      );
      this.rawInterceptors = [
        cookieParser,
        ...this.rawInterceptors
      ];
    }

    // 3. the query parser
    if(this.queryParams != null) {
      const queryParser = createQueryParser(
        this.queryParams
      );
      this.rawInterceptors = [
        queryParser,
        ...this.rawInterceptors
      ];
    }
  }
}

export function createHandlerFromRoutefromRoute(
  useContainer: AwilixContainer,
  route: Route
) {

  const handler = new Handler(
    useContainer,
    route.method ?? 'GET',
    route.url ?? '/'
  );

  // 1. Schemas contributions from interceptors
  for (let contributor of route.requestInterceptor ?? []) {
    // ignore interceptor functions
    if (typeof contributor === 'function') continue;
    handler.addSchema(contributor);
  }

  // 2. Schemas contributions from guards
  for (let contributor of route.guards ?? []) {
    // ignore guard functions
    if (typeof contributor === 'function') continue;
    handler.addSchema(contributor);
  }

  // 3. Schemas contribution from the route handler itself
  handler.addSchema(route);

  // 4. Based on schema create the necessary data parsers
  handler.buildDataParsers();

  return handler;
}

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

interface IContributeSchema {
  body?: TBodySchema;
  headers?: THeadersSchema;
  cookies?: TCookiesSchema;
  urlParams?: TUrlParamsSchema;
  queryParams?: TQueryParamsSchema;
  files? : TFileSchema;
}
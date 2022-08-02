import { Lifetime, type AwilixContainer } from 'awilix';
import { randomUUID } from 'node:crypto';
import type { TQueryParamsSchema } from 'parser/queryParams';
import type { TBodySchema } from 'schema/body';
import type { IFile, TFileSchema } from 'schema/file';
import type { Class, JsonValue, Merge } from 'type-fest';
import type { TypeOf, ZodOptional, ZodString, ZodType } from 'zod';
import type { TCookiesSchema } from '../parser/cookies';
import type { HTTPIncomingHeaders, Route } from '../route/route.class';
import { toDependencyResolver } from '../utils/to_dependency_resolver';

export type THeadersSchema = { [name in HTTPIncomingHeaders]?: ZodString | true | ZodOptional<ZodString> };
export type TUrlParamsSchema = { [name: string]: ZodString | ZodOptional<ZodString> | true };

export class Request<
  Body extends TBodySchema | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TCookiesSchema | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TQueryParamsSchema | undefined = undefined,
  Files extends TFileSchema | undefined = undefined
  > {

  id!: string;

  _metadata!: Record<string, unknown>;

  issuedAt!: Date;

  headers!: Headers extends NonNullable<Headers>
    ? Merge<
      { [name in HTTPIncomingHeaders]?: string },
      { [name in keyof NonNullable<Headers>]: string }
    >
    : { [name in HTTPIncomingHeaders]?: string };

  body!: Body extends NonNullable<Body>
    ? TypeOf<Body>
    : {};

  urlParams!: URLParams extends NonNullable<URLParams>
    ? { [name in keyof URLParams]: string }
    : { [name: string]: string | undefined }

  queryParams!: QueryParams extends NonNullable<QueryParams>
    ? { [name in keyof QueryParams]: QueryParams[name] extends ZodType ? TypeOf<QueryParams[name]> : string }
    : {};

  cookies!: Cookies extends NonNullable<Cookies>
    ? { [name in keyof Cookies]: string }
    : {};

  files!: Files extends NonNullable<Files>
    ? {
      [name in keyof Files['files']]:
      Files['files'][name]['multiple'] extends true | number
      ? Files['files'][name]['optional'] extends true ? IFile[] | undefined : IFile[]
      : Files['files'][name]['optional'] extends true ? IFile | undefined : IFile }
    : {};

  constructor(
    private container: AwilixContainer,
    public url: string,
    public method: string
  ) {
    this._metadata = {};
    this.id = randomUUID();
    this.issuedAt = new Date();
    this.method = method.toLocaleUpperCase();
  }

  provide(
    name: string,
    value: (Class<any> | ((...args: any) => any)) | JsonValue
  ): void {
    this.container.register(name, toDependencyResolver(value, Lifetime.SCOPED));
  }

}

export interface IHTTPRequestContext {
  route: Route;
  container: AwilixContainer;
}

export type TRequestType<
  Body extends TBodySchema | undefined = undefined,
  Headers extends THeadersSchema | undefined = undefined,
  Cookies extends TCookiesSchema | undefined = undefined,
  URLParams extends TUrlParamsSchema | undefined = undefined,
  QueryParams extends TQueryParamsSchema | undefined = undefined,
  Files extends TFileSchema | undefined = undefined,
  > = Omit<Request, "body" | "urlParams" | "queryParams" | "cookies" | "files">
  & (Body extends undefined ? {} : { body: TypeOf<NonNullable<Body>> })
  & (Headers extends undefined ? {} : {
    headers: Merge<
      { [name in HTTPIncomingHeaders]?: string },
      { [name in keyof NonNullable<Headers>]-?: string }
    >
  })
  & (Cookies extends undefined ? {} : {
    cookies: {
      [name in keyof NonNullable<Cookies>]: string
    }
  })
  & (URLParams extends NonNullable<URLParams> ? {
    urlParams: Merge<
    { [name in string]: string | undefined },
    { [name in keyof URLParams]: string }
    >;
  } : {}
  )
  & (QueryParams extends NonNullable<QueryParams>
    ? {
      queryParams: { [name in keyof NonNullable<QueryParams>]: QueryParams[name] extends ZodType ? TypeOf<QueryParams[name]> : string }
    }
    : {}
  )
  & (Files extends NonNullable<Files>
    ? {
      [name in keyof Files['files']]:
      Files['files'][name]['multiple'] extends true | number
      ? Files['files'][name]['optional'] extends true ? IFile[] | undefined : IFile[]
      : Files['files'][name]['optional'] extends true ? IFile | undefined : IFile }
    : {}
  );
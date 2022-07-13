import { type AwilixContainer, Lifetime } from 'awilix';
import { randomUUID } from 'node:crypto';
import type { File } from 'formidable';
import type PersistentFile from 'formidable/PersistentFile';
import type { Class, JsonValue, Merge } from 'type-fest';
import type { AnyZodObject, TypeOf, ZodBoolean, ZodNumber, ZodOptional, ZodString, ZodType, ZodTypeDef } from 'zod';
import type { HTTPIncomingHeaders, Route } from '../route/route.class';
import { toDependencyResolver } from '../utils/to_dependency_resolver';

export type TRequestBody = AnyZodObject;
export type TRequestHeaders = { [name in HTTPIncomingHeaders]?: ZodString };
export type TRequestCookies = { [name: string]: ZodString | ZodOptional<ZodString> };
export type TRequestURLParams = { [name: string]: ZodString | ZodOptional<ZodString> };
export type TRequestQueryParams = { [name: string]: ZodString | ZodNumber | ZodBoolean | ZodOptional<ZodString | ZodNumber | ZodBoolean> };
export type TRequestFiles = Record<string, ZodType<PersistentFile, ZodTypeDef, PersistentFile>>;

export class Request<
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Files extends TRequestFiles | undefined = undefined
  > {

  id!: string;

  _metadata!: Record<string, unknown>;

  issuedAt!: Date;

  headers!: Merge<
    { [name in HTTPIncomingHeaders]?: string },
    { [name in keyof NonNullable<Headers>]-?: string }
  >;

  body!: Body extends NonNullable<Body> 
   ? TypeOf<Body> 
   : never;

  urlParams?: URLParams extends NonNullable<URLParams>
    ? { [name in keyof URLParams]: string }
    : { [name: string]: string | undefined }

  queryParams?: QueryParams extends NonNullable<QueryParams> 
    ?  { [name in keyof QueryParams]: TypeOf<QueryParams[name]> }
    : never ;

  cookies?: Cookies extends NonNullable<Cookies> 
   ? {  [name in keyof Cookies]: string }
   : never;

  files?: Files extends null | undefined ? never : {
    [name in keyof NonNullable<Files>]: File
  };

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
  Body extends TRequestBody | undefined = undefined,
  Headers extends TRequestHeaders | undefined = undefined,
  Cookies extends TRequestCookies | undefined = undefined,
  URLParams extends TRequestURLParams | undefined = undefined,
  QueryParams extends TRequestQueryParams | undefined = undefined,
  Files extends TRequestFiles | undefined = undefined,
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
  & (URLParams extends undefined ? {} : {
    urlParams: Merge<
      { [name in keyof NonNullable<URLParams>]: string },
      { [name in string]: string | undefined }
    >
  })
  & (QueryParams extends undefined ? {} : {
    queryParams: {
      [name in keyof NonNullable<QueryParams>]: TypeOf<NonNullable<QueryParams>[name]>
    }
  })
  & (Files extends undefined ? {} : {
    files: {
      [name in keyof NonNullable<Files>]: File
    }
  });
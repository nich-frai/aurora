import type { TRawInterceptor } from "aurora.lib";
import { BadRequest } from "../error/http_error";
import type { ZodString, ZodNumber, ZodBoolean, ZodOptional } from "zod";

export function queryParamsParser(url : string) {

  const parsed = new URLSearchParams(url);
  let response = Object.create(null);
  for (let [k, v] of parsed.entries()) {
    // avoid proto polluting
    if (k !== '__proto__') {
      response[k] = v;
    }
  }

  return response;
}
export type TQueryParamsSchema = { 
  [name: string]: true | ZodString | ZodNumber | ZodBoolean | ZodOptional<ZodString | ZodNumber | ZodBoolean> };

export function createQueryParser(
  schema : TQueryParamsSchema
) : TRawInterceptor {
  return {
    name : 'aurora.queryParams.parser',
    interceptor(req, res, request) {
      
      const parsedQuery = queryParamsParser(req.url!);
      for(let name in schema) {
        const parser = schema[name];
        if (parser === true) {
          if (parsedQuery[name] != null) {
            continue;
          } else {
            return new BadRequest(`This route expects to receive a query parameter named ${name} that was not present in the request url!\nAll of the queryParams expected in this route: ${Object.keys(schema).join(', ')}`);
          }
        }
        const zodParse = parser.safeParse(parsedQuery[name]);
        if(!zodParse.success) {
          return new BadRequest(`Validation failed on query parameter ${name}!\nReason: ${zodParse.error.issues.toString()}`)
        }
        parsedQuery[name] = zodParse.data!;
      }
      request.queryParams = parsedQuery;
    }
  }
}
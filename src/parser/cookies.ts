import type { TRawInterceptor } from "aurora.lib";
import type { Request } from "http.lib";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AnyZodObject, ZodOptional, ZodString } from "zod";
import { BadRequest } from "../error/http_error";

export type TCookiesSchema = { [name: string]: ZodString | ZodOptional<ZodString> | true };

export function cookieParser(cookieStr: string): Record<string, string> {
  if (cookieStr.length === 0) {
    return {};
  }

  const pieces = cookieStr.split('; ');

  let response = Object.create(null);

  pieces.forEach(cookie => {
    let ioEqual = cookie.indexOf('=');
    if (ioEqual < 0) {
      throw new BadRequest('Cookie header is incorrectly formatted!');
    }
    let key = cookie.substring(0, ioEqual);
    let value = cookie.substring(ioEqual + 1);
    response[key] = value;
  });

  return response;
}

export function createCookieParser(schema: TCookiesSchema): TRawInterceptor {
  return {
    name: 'aurora.cookie.parser',
    interceptor(req: IncomingMessage, res: ServerResponse, request: Request<AnyZodObject>) {
      const parsedCookies = cookieParser(req.headers['cookie'] ?? '');
      // validate cookie schema
      for (let cookieName in schema) {
        const parser = schema[cookieName];
        if (parser === true) {
          if (parsedCookies[cookieName] != null) {
            continue;
          } else {
            return new BadRequest(`This route expects to receive a cookie named ${cookieName} that was not present in the request!\nAll of the cookies expected in this route: ${Object.keys(schema).join(', ')}`);
          }
        }
        const zodParse = parser.safeParse(parsedCookies[cookieName]);
        if(!zodParse.success) {
          return new BadRequest(`Validation failed on cookie ${cookieName}!\nReason: ${zodParse.error.issues.toString()}`)
        }
        parsedCookies[cookieName] = zodParse.data!;
      }
      request.cookies = parsedCookies;
    }
  };
}

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

export interface ISetCookieOptions {
  value: string;
  httpOnly?: boolean;
  maxAge?: number;
  domain?: string;
  path?: string;
  expires?: Date;
  secure?: boolean;
  priority?: 'low' | 'medium' | 'high';
  sameSite?: true | 'lax' | 'strict' | 'none';
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

export function serializeCookie(name: string, val: string, options: Omit<ISetCookieOptions, "value">) {
  var opt = options || {};
  var enc = encode;

  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  var value = enc(val);

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  var str = name + '=' + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;

    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError('option maxAge is invalid')
    }

    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  } else {
    str += '; Path=/';
  }

  if (opt.expires) {
    var expires = opt.expires

    if (!isDate(expires) || isNaN(expires.valueOf())) {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + expires.toUTCString()
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.priority) {
    var priority = typeof opt.priority === 'string'
      ? opt.priority.toLowerCase()
      : opt.priority

    switch (priority) {
      case 'low':
        str += '; Priority=Low'
        break
      case 'medium':
        str += '; Priority=Medium'
        break
      case 'high':
        str += '; Priority=High'
        break
      default:
        throw new TypeError('option priority is invalid')
    }
  }

  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === 'string'
      ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}



/**
 * URL-encode value.
 *
 * @param {string} str
 * @returns {string}
 */

function encode(val: string) {
  return encodeURIComponent(val)
}

/**
 * Determine if value is a Date.
 *
 * @param {*} val
 * @private
 */

function isDate(val: unknown): val is Date {
  return String(val) === '[object Date]' ||
    val instanceof Date
}

import type { TRawInterceptor } from "aurora.lib";
import formidable from "formidable";
import type IncomingForm from "formidable/Formidable";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import type { TBodySchema } from "schema/body";
import type { IFile, TFileSchema } from "schema/file";
import { zodSchemaToJSONShape } from "utils/schema_to_json_shape";
import { BadRequest, PayloadTooLarge, UnsupportedMediaType } from "../error/http_error";
import type { Route } from "../route/route.class";
import { Size } from "../utils/units";

type TBodyParserSchema = {
  body?: TBodySchema;
  files?: TFileSchema;
};

export type TBodyParser = (
  req: IncomingMessage,
  schema: TBodyParserSchema,
  options: IParseBodyOptions,
  ...args: any[]
) => Promise<{
  body?: unknown;
  files?: Record<string, IFile | IFile[]>;
}>

export interface IParseBodyOptions {
  maxBodySize?: number;
  charset?: 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex' | string & {};
}

export const DEFAULT_MAX_BODY_SIZE = 50 * Size.MB;

async function parseBodyAsString(
  request: IncomingMessage,
  options: IParseBodyOptions,
) {
  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;

  const rawBody = await new Promise<string>((resolve, reject) => {

    let fullBody: string = '';

    function concatenateChunk(chunk: any) {
      fullBody += String(chunk);
      if (fullBody.length > maxBodySize) {
        reportError(new PayloadTooLarge(`Request payload is bigger than ${options.maxBodySize}`));
      }
    }

    function reportError(err: Error) {
      // cleanup body
      fullBody = "";
      reject(err);
      disconnectListeners();
    }

    function disconnectListeners() {
      request.off('data', concatenateChunk);
      request.off('error', reportError);
      request.off('end', reportStreamEnd);
    }

    function reportStreamEnd() {
      resolve(fullBody);
      disconnectListeners();
    }

    /**
     * Check JSON validity
     * -------------------
     *  Eagerly checks if the initial body request string is correctly formed:
     * - string wrapped in ""
     * - a number (0,1...)
     * - a boolean (true | false)
     * - an array wrapped in []
     * - an object wrapped in {}
     * 
     * Useful when receiving an incorrent body content type, avoiding consuming the whole stream
     * into memory before failing
     * 
     * @param chunk 
     * @returns 
     */
    function checkForEarlyJSONValidity(chunk: any) {
      // if the content is still empty, schedule for next iteration
      if (fullBody.trim().length === 0) {
        request.once('data', checkForEarlyJSONValidity);
        return;
      }
    }

    // has a valid charset information ?
    if (['ascii', 'utf8', 'utf-8', 'utf16le', 'ucs2', 'ucs-2', 'base64', 'base64url', 'latin1', 'binary', 'hex'].includes(
      String(options?.charset).toLocaleLowerCase()
    )) {
      request.setEncoding(String(options?.charset).toLocaleLowerCase() as BufferEncoding);
    }

    request.on('data', concatenateChunk);
    request.on('error', reportError);
    request.on('end', reportStreamEnd);

    request.once('data', checkForEarlyJSONValidity);
  });

  return rawBody;
}

/**
 * [Body Parser] Application/JSON
 * ------------------------------
 * - Tries to parse "application/json" request body type
 * 
 * Use as limits/constraints:
 * - Max body size
 * - Charset (must be one of the accepted by node: 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex')
 * 
 */
async function parseApplicationJSON(
  request: IncomingMessage,
  schema: TBodyParserSchema,
  options: IParseBodyOptions,
) {

  let bodyStr = await parseBodyAsString(request, options);
  try {
    let parsedTarget = Object.create(null);
    // JSON.parse() creates a new object based on "Object" prototype
    let parsed = JSON.parse(bodyStr);
    // So we copy its contents whitout __proto__ (if is poisoned or not) to the target object that has no __proto__ at all (based on "null")
    for (let propName in parsed) {
      if (propName !== '__proto__') {
        parsedTarget[propName] = parsed[propName];
      }
    }
    return parsedTarget;
  } catch (err) {
    throw new BadRequest("Could not parse the payload as JSON content!");
  }

}

type MultipartResponse = {
  files: Record<string, IFile | IFile[]>;
  fields: Record<string, unknown>;
};

/**
 * [Body Parser] Multipart/Form-Data
 * ----------------------------------
 * - Tries to parse "multipart/form-data" request body type
 * Delegates to formidable
 * 
 * Use as limits/contraints
 * - Max body size (files + data)
 * - Max file size (singular file max size)
 * - Accepted mimes
 * - Max number of files (total)
 * - Minimum file size
 */
async function parseMultipartFormData(
  request: IncomingMessage,
  schema: TBodyParserSchema,
  options: IParseBodyOptions,
  parser: IncomingForm
): Promise<MultipartResponse> {

  return new Promise<MultipartResponse>((resolve, reject) => {
    parser.parse(request, (err, fields, files) => {
      if (err != null) reject(err);
      else {
        resolve({
          fields, files
        });
      }
    });
  });
}

async function parseURLEncoded(
  request: IncomingMessage,
  schema: TBodyParserSchema,
  options: IParseBodyOptions
) {

  const dataStr = await parseBodyAsString(request, options);
  const parsed = new URLSearchParams(dataStr);
  let response = Object.create(null);

  for (let [k, v] of parsed.entries()) {
    // avoid proto polluting
    if (k !== '__proto__') {
      response[k] = v;
    }
  }

  return response;
}

async function parsePlainText(
  request: IncomingMessage,
  schema: TBodyParserSchema,
  options: IParseBodyOptions
) {
  return parseBodyAsString(request, options).then(s => ({ body: s }));
}

export const bodyParser: Record<string, TBodyParser> = {
  'text/plain': parsePlainText,
  'application/json': parseApplicationJSON,
  'multipart/form-data': parseMultipartFormData,
  'application/x-www-form-urlencoded': parseURLEncoded
};

export function setContentTypeParser(type: string, parser: TBodyParser) {
  bodyParser[type] = parser;
}

/**
 * Parse "content-type" header
 * ----------------------------
 * 
 * Header should respect the following format:
 *  "type/subtype; paramKey=paramValue"
 * 
 * - If a mime type is "known" to the server we shall return the default charset defined by the RFC
 * - If a mime type is not "known" return utf8 as default
 * - For multipart the boundary is required and this function will throw when this condition is not met 
 * 
 * ___"known" actually means "know how to handle", a mime can be defined by IANA but may not be contemplated in the code___
 * @param typeString 
 * @returns {ContentTypeParams}
 */
export function parseContentType(typeString: string): ContentTypeParams {
  let type: string;

  let ioSeparator = typeString.indexOf(';');

  // no separator for content-type!
  if (ioSeparator < 0) {
    type = typeString.trim();
    switch (type) {
      /**
       * Default charset for urlencoded is '7bit' but, by the nodejs documentation:
       * "Generally, there should be no reason to use this encoding, as 'utf8' (or, if the data 
       * is known to always be ASCII-only, 'latin1') will be a better choice when encoding or 
       * decoding ASCII-only text. It is only provided for legacy compatibility."
       * 
       * @link https://www.iana.org/assignments/media-types/application/x-www-form-urlencoded
       * @link https://nodejs.org/api/buffer.html#buffers-and-character-encodings
       */
      case 'application/x-www-form-urlencoded':
        return { type, params: { charset: 'utf8' } };
      /**
       * Default charset for application/json is 'binary' in node it is an alias for 'latin1'
       * @link https://www.iana.org/assignments/media-types/application/json
       */
      case 'application/json':
        return { type, params: { charset: 'latin1' } };
      /**
       * Default charset for 'text/*' media is us-ascii, as denoted in previous comments 'utf-8' 
       * is best as a general purpose decoder
       */
      case 'text/plain':
        return { type, params: { charset: 'utf8' } };
      /**
       * In multipart the boundary is a required paramete!
       */
      case 'multipart/form-data':
        throw new BadRequest("multipart/form-data requires that the 'boundary' parameter in content-type header to be set, none found!");
      default:
        /**
         * For an unknown content type we shall default to utf8, the requets will probably panic
         * since there wont be a known parser for the content-type provided!
         * If there is this piece of code should be updated...
         */
        return { type, params: { charset: 'utf8' } } as CharsetParams;
    }
  } else {
    let type = typeString.substring(0, ioSeparator).trim();
    let params = typeString.substring(ioSeparator + 1).trim();
    switch (type) {
      case 'multipart/form-data':
        let matchesWithboundary = params.match(/^boundary=(?<boundary>.+)$/);
        if (matchesWithboundary != null) return { type, params: { boundary: matchesWithboundary.groups!.boundary } };
        else throw new BadRequest("multipart/form-data requires that the 'boundary' parameter in content-type header to be set, none found!");
      default:
        let ioEq = params.indexOf('=')
        if (ioEq < 0) {
          return { type, params: { charset: 'utf8' } } as CharsetParams;
        }
        let paramKey = params.substring(0, ioEq);
        let paramValue = paramKey.substring(ioEq + 1);
        return { type, params: { [paramKey]: paramValue } } as ContentTypeParams;
    }
  }
}

type ContentTypeParams = MultipartParams | CharsetParams | UnknownParams;

interface CharsetParams {
  type: 'text/plain' | 'application/json' | 'application/x-www-form-urlencoded';
  params: {
    charset: string;
  }
}

interface MultipartParams {
  type: 'multipart/form-data';
  params: {
    boundary: string;
  }
}

interface UnknownParams {
  type: string;
  params: Record<string, string>;
}

export function createBodyParser(
  schema: { body?: TBodySchema; files?: TFileSchema },
  acceptsContentType: string | string[] | undefined,
  maxBodySize?: number
): TRawInterceptor {

  // try and guess the content type if its null
  if (acceptsContentType == null) {
    if (schema.files != null) {
      acceptsContentType = 'multipart/form-data';
    } else if (schema.body != null) {
      acceptsContentType = ['application/json', 'application/x-www-form-urlencoded'];
    } else {
      // TODO: decide if we should throw here... a body parser with no schema was set...
      acceptsContentType = ['text/plain', ''];
    }
  }
  
  // create formidable for this parser
  let multipartParser: undefined | IncomingForm;
  if (schema.files != null) {
    multipartParser = formidable({
      allowEmptyFiles: false,
      multiples: true,
      maxFileSize: schema.files.maxFileSize,
      maxTotalFileSize: schema.files.maxTotalFileSize,
      minFileSize: 2 * Size.KB,
      uploadDir: schema.files.uploadLocation ?? tmpdir()
    });
  }

  return {
    name: 'aurora.body.parser',
    async interceptor(req, res, request) {
      // check content type
      const requestContentType = req.headers['content-type'] != null ? parseContentType(req.headers['content-type']).type : '';
      const matchesWithContentType = typeof acceptsContentType === 'string'
        ? requestContentType.trim() === acceptsContentType
        : acceptsContentType?.includes(requestContentType) ?? false;

      if (!matchesWithContentType) {
        return new BadRequest(`The provided content type is not handled by this route!\nThe accepted content-types are: ${typeof acceptsContentType === 'string'
          ? acceptsContentType
          : acceptsContentType?.join(', ') ?? 'no acceptable content-type!'};`);
      }

      if (!(requestContentType in bodyParser)) {
        return new UnsupportedMediaType(
          `There is no known parser for the content-type of ${requestContentType}!\nThe known content parsers are: ${Object.keys(bodyParser).join(', ')}.\nThis route accepts the following content-types: ${typeof acceptsContentType === 'string'
            ? acceptsContentType
            : acceptsContentType?.join(', ') ?? 'no acceptable content-type!'}.`
        );
      }


      const parser = bodyParser[requestContentType];

      const parsed = await parser(
        req,
        schema,
        { maxBodySize: maxBodySize },
        multipartParser
      );

      // check parsed values
      if (schema.body != null) {
        let safeParse = schema.body.safeParse(parsed.body);
        if (!safeParse.success) {
          return new BadRequest(`The provided body have an incorrect shape!\nThe expected body shape is the following: ${JSON.stringify(zodSchemaToJSONShape(schema.body))}`)
        }
        request.body = safeParse.data;
      }

      if (schema.files != null) {
        for (let fileField in schema.files.files) {
          let fileOptions = schema.files.files[fileField];

          // make sure that the file field is present if non optional
          if (fileOptions.optional !== true) {
            if (parsed.files?.[fileField] == null) {
              return new BadRequest(`The provided body lacks a file field named as ${fileField} that is required!`);
            }
          }

          // check if multiple file were sent on a non-multiple file
          if (fileOptions.multiple !== true) {

          }
          // else normalize incoming files to ALWAYS be an array when multiple is set!
          else {

          }
        }
      }


    }
  };
}

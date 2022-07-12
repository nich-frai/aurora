import type { IncomingMessage, ServerResponse } from "http";
import type { Request } from "request/request.class";
import type { HTTPResponse } from "response/response.class";
import type { Class, JsonValue } from "type-fest";
import type { AnyZodObject } from "zod";

export type TRawInterceptor = IInterceptRaw | TRawInterceptorFn;

export interface IInterceptRaw {
	name: string;

	interceptor: TRawInterceptorFn;

	provide?: {
		[name: string]: Class<unknown> | ((...args: any) => any) | JsonValue;
	};
}

export type TRawInterceptorFn = (
	req: IncomingMessage,
	res: ServerResponse,
	request: Request<AnyZodObject>
) =>
	| void
	| Error
	| HTTPResponse
	| Promise<void | HTTPResponse | Error>;

export function createRawInterceptor(options: IInterceptRaw) {
	return options;
}
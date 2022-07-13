import type { z } from "zod";
import type { TBodySchema } from '../request/request.class';

export function mergeBodySchema(
	schemas : TBodySchema[]
) {

}

export type TBodySchema = z.SomeZodObject;
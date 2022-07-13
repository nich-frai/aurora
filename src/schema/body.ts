import type { z } from "zod";
import type { TBodySchema } from '../request/request.class';

export function mergeBodySchema(
	...schemas : (TBodySchema | undefined)[]
) : undefined | TBodySchema {
	
	let mergedSchema : undefined | TBodySchema = undefined;

	for(let schema in schemas) {
		if(schema == null) continue;
		if(mergedSchema == null) {
			mergedSchema = schema;
			continue;
		}
		mergedSchema = mergedSchema.merge(schema);
	}

	return mergedSchema;
}

export type TBodySchema = z.SomeZodObject;
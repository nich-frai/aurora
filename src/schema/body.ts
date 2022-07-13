import type { SomeZodObject } from "zod";

export type TBodySchema = SomeZodObject;

export function mergeBodySchema(
	...schemas : (TBodySchema | undefined)[]
) : undefined | TBodySchema {
	
	let mergedSchema : undefined | TBodySchema = undefined;

	for(let schema of schemas) {
		if(schema == null) continue;
		if(mergedSchema == null) {
			mergedSchema = schema;
			continue;
		}
		mergedSchema = mergedSchema.merge(schema);
	}

	return mergedSchema;
}

import type { TBodySchema } from "schema/body";
import type { TFileSchema } from "schema/file";

export class BodyParser {
	
	constructor(
		private bodySchema : TBodySchema,
		private filesSchema?: TFileSchema
	) {

	}

	
}
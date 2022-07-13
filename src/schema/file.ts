import type { FileInfo } from "busboy";
import type { File } from "formidable";
import type { Readable } from "node:stream";

export function mergeFileSchema(
	...schema : any[]
) {

}

export type TFileSchema = {
	uploadLocation? : string;
	maxTotalFileSize : number;
	maxFileSize : number;
	maxFiles: number;
	files : {
		[fieldName : string] : FileFieldOptions
	}
};

interface FileFieldOptions {
	optional? : boolean;
	multiple? : true | number;
}

export interface IFile extends File {
}
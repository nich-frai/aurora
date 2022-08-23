import type { File } from "formidable";

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
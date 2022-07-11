import { format } from "util";

export const print = (...args : any[]) => {
	process.stdout.write(
		args.map(a => format(a)).join(' ')
	);
};

export const println = (...args : any[]) => {
	print(...args);
	process.stdout.write('\n');
}
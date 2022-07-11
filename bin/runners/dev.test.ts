import { describe, expect, it } from "vitest";
import { DevelopmentEnvironment } from "./dev";

describe('Development environment runner', () => {

	it('uses the cwd as project root when receive no arguments', () => {
		const env = new DevelopmentEnvironment;
		expect(env.root).toBe(process.cwd());
	});

	it('uses the provided project root when given', () => {
		const env = new DevelopmentEnvironment('/new/root');
		expect(env.root).toBe('/new/root');
	});

	it('uses the options parameter for initialization, when given', () => {

	});
});
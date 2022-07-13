import { describe, expect, it } from 'vitest';
import { isResolver } from './is_resolver';
import { asClass, asFunction, asValue } from 'awilix';

describe('is resolver assertion', () => {
    it('correctly asserts the values produced by awilix "as*"', () => {
        expect(isResolver(asValue(1))).toBe(true);
        expect(isResolver(asFunction(() => 1))).toBe(true);
        expect(isResolver(asClass(class ATest {}))).toBe(true);
    });

    it('fails on primitives', () => {
        expect(isResolver(1)).toBe(false);
        expect(isResolver("1")).toBe(false);
        expect(isResolver(true)).toBe(false);
        expect(isResolver({})).toBe(false);
        expect(isResolver([])).toBe(false);
    });

    it('fails on functions', () => {
        expect(isResolver(function () {})).toBe(false);
        expect(isResolver(function a() {})).toBe(false);
        expect(isResolver(() => {})).toBe(false);
    });

    it('fails on classes', () => {
        expect(isResolver(class {})).toBe(false);
        expect(isResolver(class ATest {})).toBe(false);
    });
});
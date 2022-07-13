import { describe, expect, it } from 'vitest';
import { isFunction } from './is_function';

describe('is function assertion', () => {

    it('returns false on named classes instances', () => {
        class ATest {}
        expect(isFunction(ATest)).toBe(false);
    });

    it('returns false on anonymous classes instances', () => {
        expect(isFunction(class {})).toBe(false);
    });

    it('returns true on named functions', () => {
        function ATest(){}
        expect(isFunction(ATest)).toBe(true);
    });

    it('returns true on anonymous functions', () => {
        expect(isFunction(function () {})).toBe(true);
    });

    it('returns true on lambda functions', () => {
        expect(isFunction(()=> {})).toBe(true);
    });

    it('returns false on nullish values', () => {
        expect(isFunction(null)).toBe(false);
        expect(isFunction(undefined)).toBe(false);
    });

    it('returns false on primitive values', () => {
        expect(isFunction(true)).toBe(false);
        expect(isFunction("1")).toBe(false);
        expect(isFunction(1)).toBe(false);
        expect(isFunction({})).toBe(false);
        expect(isFunction([])).toBe(false);
    });
});

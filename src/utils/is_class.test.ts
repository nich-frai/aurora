import { describe, expect, it } from 'vitest';
import { isClass } from './is_class';

describe('is class assertion', () => {

    it('returns true on names classes', () => {
        class ATest {}
        expect(isClass(ATest)).toBe(true);
    });

    it('returns true on anonymous classes', () => {
        expect(isClass(class {})).toBe(true);
    });

    it('returns false on named functions', () => {
        function ATest(){}
        expect(isClass(ATest)).toBe(false);
    });

    it('returns false on anonymous functions', () => {
        expect(isClass(function () {})).toBe(false);
    });

    it('returns false on lambda functions', () => {
        expect(isClass(()=> {})).toBe(false);
    });

    it('returns false on nullish values', () => {
        expect(isClass(null)).toBe(false);
        expect(isClass(undefined)).toBe(false);
    });

    it('returns false on primitive values', () => {
        expect(isClass(true)).toBe(false);
        expect(isClass("1")).toBe(false);
        expect(isClass(1)).toBe(false);
        expect(isClass({})).toBe(false);
        expect(isClass([])).toBe(false);
    });
});

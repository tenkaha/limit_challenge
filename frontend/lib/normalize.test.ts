import { describe, expect, it } from 'vitest';
import { normalizePlate } from './normalize';

// Must match backend fleet/normalization.py, or the preview would show a plate
// different from the one the API stores.
describe('normalizePlate', () => {
  it.each([
    ['abc-12 34', 'ABC1234'],
    ['  qa 77·58 ', 'QA7758'],
    ['---', ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizePlate(input)).toBe(expected);
  });
});

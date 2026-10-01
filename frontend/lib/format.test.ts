import { describe, expect, it } from 'vitest';
import { plural } from './format';

describe('plural', () => {
  it('uses the singular only for exactly one', () => {
    expect(plural(1, 'maintenance record')).toBe('1 maintenance record');
    expect(plural(0, 'vehicle')).toBe('0 vehicles');
    expect(plural(183, 'maintenance record')).toBe('183 maintenance records');
  });
});

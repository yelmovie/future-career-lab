import { describe, expect, it } from 'vitest';
import { mulberry32, seededShuffle } from '../src/shared/rng';

describe('seeded game randomization', () => {
  it('returns the same sequence for the same seed', () => {
    const first = mulberry32(20260814);
    const second = mulberry32(20260814);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('shuffles without losing or duplicating content ids', () => {
    const source = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = seededShuffle(source, 42);
    expect(shuffled).not.toBe(source);
    expect([...shuffled].sort()).toEqual(source);
    expect(seededShuffle(source, 42)).toEqual(shuffled);
  });
});

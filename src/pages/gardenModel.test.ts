import { describe, expect, it } from 'vitest';
import { EMPTY_GARDEN, gardenStars, placedCount, readGarden } from './gardenModel';

describe('gardenStars', () => {
  it('gives 3 stars when rest and play items match their places and the people path is clear', () => {
    const result = gardenStars({ shade: ['hideout', 'water'], perch: ['rope', 'feeder'], path: [] });
    expect(result).toEqual({ waterQuiet: true, hideoutQuiet: true, pathClear: true, stars: 3 });
  });

  it('loses the water star when the bowl is outside the quiet resting place', () => {
    expect(gardenStars({ shade: ['hideout'], perch: ['rope', 'feeder'], path: ['water'] }).stars).toBe(1);
  });

  it('loses the play-and-path star when a play item blocks the people path', () => {
    expect(gardenStars({ shade: ['hideout', 'water'], perch: ['rope'], path: ['feeder'] })).toMatchObject({ stars: 2, pathClear: false });
  });

  it('an empty garden has no stars yet', () => {
    expect(gardenStars(EMPTY_GARDEN)).toMatchObject({ stars: 0, pathClear: false });
    expect(placedCount(EMPTY_GARDEN)).toBe(0);
  });

  it('readGarden drops unknown items, duplicates, and overfull slots', () => {
    const placed = readGarden({ shade: ['hideout', 'hideout', 'x'], perch: ['water', 'rope', 'feeder'], path: 'nope' });
    expect(placed).toEqual({ shade: ['hideout'], perch: ['water', 'rope'], path: [] });
    expect(readGarden(null)).toEqual(EMPTY_GARDEN);
  });
});

describe('gardenHint', () => {
  it('points at the path first, then the item that is in the wrong place, then encourages', async () => {
    const { gardenHint } = await import('./gardenModel');
    expect(gardenHint(EMPTY_GARDEN)).toMatch(/어울리는 자리/);
    expect(gardenHint({ shade: [], perch: [], path: ['water'] })).toMatch(/발소리/);
    expect(gardenHint({ shade: [], perch: ['water'], path: [] })).toMatch(/물그릇/);
    expect(gardenHint({ shade: ['water'], perch: ['hideout'], path: [] })).toMatch(/숨는 집/);
    expect(gardenHint({ shade: ['water', 'rope'], perch: [], path: [] })).toMatch(/놀이 줄과 먹이 나무/);
    expect(gardenHint({ shade: ['water', 'hideout'], perch: ['rope'], path: [] })).toMatch(/남은 물건 1개/);
    expect(gardenHint({ shade: ['water', 'hideout'], perch: ['rope', 'feeder'], path: [] })).toMatch(/다 놓았네/);
  });
});

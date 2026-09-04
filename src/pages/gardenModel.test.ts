import { describe, expect, it } from 'vitest';
import { EMPTY_GARDEN, gardenStars, placedCount, readGarden } from './gardenModel';

describe('gardenStars', () => {
  it('gives 3 stars when water is by the perch, hideout in the shade, and the path is clear', () => {
    const result = gardenStars({ shade: ['hideout'], perch: ['water', 'feeder'], path: ['rope'] });
    expect(result).toEqual({ waterQuiet: true, hideoutQuiet: true, pathClear: true, stars: 3 });
  });

  it('accepts the water bowl in the shade too', () => {
    expect(gardenStars({ shade: ['hideout', 'water'], perch: ['feeder'], path: ['rope'] }).stars).toBe(3);
  });

  it('loses the path star when water or the hideout sit on the noisy side', () => {
    expect(gardenStars({ shade: ['hideout'], perch: [], path: ['water'] }).stars).toBe(1);
    expect(gardenStars({ shade: [], perch: ['water'], path: ['hideout'] }).stars).toBe(1);
  });

  it('an empty garden only keeps the clear-path star', () => {
    expect(gardenStars(EMPTY_GARDEN)).toMatchObject({ stars: 1, pathClear: true });
    expect(placedCount(EMPTY_GARDEN)).toBe(0);
  });

  it('readGarden drops unknown items, duplicates, and overfull slots', () => {
    const placed = readGarden({ shade: ['hideout', 'hideout', 'x'], perch: ['water', 'rope', 'feeder'], path: 'nope' });
    expect(placed).toEqual({ shade: ['hideout'], perch: ['water', 'rope'], path: [] });
    expect(readGarden(null)).toEqual(EMPTY_GARDEN);
  });
});

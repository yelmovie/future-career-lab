import { describe, expect, it } from 'vitest';
import { EMPTY_GARDEN, gardenStars, placeGardenItem, placedCount, readGarden, readGardenSession } from './gardenModel';

describe('gardenStars', () => {
  it('gives 3 stars when rest and play items match their two places', () => {
    const result = gardenStars({ shade: ['hideout', 'water'], perch: ['rope', 'feeder'] });
    expect(result).toEqual({ waterQuiet: true, hideoutQuiet: true, activityReady: true, stars: 3 });
  });

  it('loses the water star when the bowl is outside the quiet resting place', () => {
    expect(gardenStars({ shade: ['hideout', 'rope'], perch: ['water', 'feeder'] }).stars).toBe(1);
  });

  it('accepts a second design: eating quietly and playing in the active zone', () => {
    expect(gardenStars({ shade: ['hideout', 'water', 'feeder'], perch: ['rope'] })).toMatchObject({ stars: 3, activityReady: true });
  });

  it('still needs a separate place to play and both care needs met', () => {
    expect(gardenStars({ shade: ['hideout', 'water', 'rope'], perch: ['feeder'] })).toMatchObject({ stars: 2, activityReady: false });
  });

  it('an empty garden has no stars yet', () => {
    expect(gardenStars(EMPTY_GARDEN)).toMatchObject({ stars: 0, activityReady: false });
    expect(placedCount(EMPTY_GARDEN)).toBe(0);
  });

  it('readGarden drops unknown items, duplicates, and overfull slots', () => {
    const placed = readGarden({ shade: ['hideout', 'hideout', 'x'], perch: ['water', 'rope', 'feeder', 'hideout'], path: ['feeder'] });
    expect(placed).toEqual({ shade: ['hideout'], perch: ['water', 'rope', 'feeder'] });
    expect(readGarden(null)).toEqual(EMPTY_GARDEN);
  });
});

describe('gardenHint', () => {
  it('points at the item that is in the wrong place, then encourages', async () => {
    const { gardenHint } = await import('./gardenModel');
    expect(gardenHint(EMPTY_GARDEN)).toMatch(/어울리는 자리/);
    expect(gardenHint({ shade: [], perch: ['water'] })).toMatch(/물그릇/);
    expect(gardenHint({ shade: ['water'], perch: ['hideout'] })).toMatch(/숨는 집/);
    expect(gardenHint({ shade: ['water', 'rope'], perch: [] })).toMatch(/놀이 줄/);
    expect(gardenHint({ shade: ['water', 'hideout'], perch: ['rope'] })).toMatch(/남은 물건 1개/);
    expect(gardenHint({ shade: ['water', 'hideout'], perch: ['rope', 'feeder'] })).toMatch(/다 놓았네/);
  });
});

describe('garden placement and recovery', () => {
  it('keeps an item in its original place when the target is full', () => {
    const placed = readGarden({ shade: ['hideout', 'water', 'feeder'], perch: ['rope'] });
    expect(placeGardenItem(placed, 'rope', 'shade')).toBe(placed);
    expect(placeGardenItem(placed, 'feeder', 'perch')).toEqual({ shade: ['hideout', 'water'], perch: ['rope', 'feeder'] });
    expect(placeGardenItem(placed, 'feeder', null)).toEqual({ shade: ['hideout', 'water'], perch: ['rope'] });
  });

  it('restores tested arrangements and iteration counts without trusting a saved score', () => {
    const session = readGardenSession({ placed: { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] }, step: 2, tested: true, attempts: 3, revisions: 4 });
    expect(session).toMatchObject({ step: 2, tested: true, attempts: 3, revisions: 4 });
    expect(gardenStars(session.placed).stars).toBe(3);
  });

  it('migrates legacy drafts and sends incomplete or malformed sessions back to designing', () => {
    expect(readGardenSession(null, { shade: ['water'], perch: ['rope'] })).toMatchObject({ placed: { shade: ['water'], perch: ['rope'] }, step: 1, tested: false });
    expect(readGardenSession({ placed: { shade: [], perch: [] }, step: 2, tested: true, attempts: Infinity, revisions: -2 })).toMatchObject({ step: 1, tested: false, attempts: 0, revisions: 0 });
  });
});

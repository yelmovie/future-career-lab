import { describe, expect, it } from 'vitest';
import { chooseSchoolHelp, fillSchoolWater, restoreSchoolGarden } from './schoolGardenModel';

describe('optional school garden', () => {
  it('records reconsidering the forest solution for a place with food but no water', () => {
    let s = chooseSchoolHelp(restoreSchoolGarden(null), 'trees');
    expect(fillSchoolWater(s, 100)).toBe(s);
    s = chooseSchoolHelp(s, 'water');
    s = fillSchoolWater(s, 25);
    expect(s.completed).toBe(false);
    s = restoreSchoolGarden(JSON.parse(JSON.stringify(s)));
    s = fillSchoolWater(s, 100);
    expect(s).toMatchObject({ attempts: ['trees', 'water'], water: 100, completed: true });
    expect(chooseSchoolHelp(s, 'quiet')).toBe(s);
    expect(fillSchoolWater(s, 100)).toBe(s);
  });
  it('does not trust malformed or unsupported completion flags', () => {
    expect(restoreSchoolGarden({ choice: 'trees', completed: true, water: 100, attempts: ['bad', 'trees'] })).toMatchObject({ completed: false, water: 0, attempts: ['trees'] });
    expect(restoreSchoolGarden({ choice: 'water', water: NaN, completed: true }).completed).toBe(false);
  });
});

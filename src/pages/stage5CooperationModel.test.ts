import { describe, expect, it } from 'vitest';
import { adjustWorkNoise, chooseQuietPromise, canCompleteMission, COOP_MISSIONS, completeCooperationMission, finishCooperation, markBlockedWater, plantSapling, restoreCooperation, returnToCooperationMap, selectCooperationMission, startCooperation, type MissionId } from './stage5CooperationModel';

describe('Stage 5 cooperation', () => {
  it('starts with the team and blocks completion until each meaningful action is done', () => {
    let s = restoreCooperation(null);
    expect(s.phase).toBe('welcome');
    expect(selectCooperationMission(s, 'trees')).toBe(s);
    s = selectCooperationMission(startCooperation(s), 'trees');
    expect(completeCooperationMission(s)).toBe(s);
    s = plantSapling(s, 'left');
    expect(plantSapling(s, 'left')).toBe(s);
    expect(canCompleteMission(s)).toBe(false);
    s = plantSapling(s, 'right');
    expect(canCompleteMission(s)).toBe(true);
    s = completeCooperationMission(s);
    expect(s).toMatchObject({ phase: 'result', completed: ['trees'], actions: 2 });
    expect(completeCooperationMission(s)).toBe(s);
    expect(finishCooperation(s)).toBe(s);
  });

  it.each<MissionId[]>([
    ['trees', 'water', 'quiet'], ['trees', 'quiet', 'water'], ['water', 'trees', 'quiet'],
    ['water', 'quiet', 'trees'], ['quiet', 'water', 'trees'], ['quiet', 'trees', 'water'],
  ])('lets children help in their own order: %s / %s / %s', (...order) => {
    let s = startCooperation(restoreCooperation(null));
    for (const id of order) {
      s = selectCooperationMission(s, id);
      if (id === 'trees') s = plantSapling(plantSapling(s, 'left'), 'right');
      else if (id === 'water') s = markBlockedWater(s);
      else s = adjustWorkNoise(chooseQuietPromise(s, 'barrier'), 25);
      expect(canCompleteMission(s)).toBe(true);
      s = returnToCooperationMap(completeCooperationMission(s));
    }
    expect(s.completed).toEqual(order);
    expect(selectCooperationMission(s, order[0]!)).toBe(s);
    expect(finishCooperation(s)).toMatchObject({ phase: 'ending', actions: 4 });
  });

  it('keeps partial planting when returning to the map and reloading', () => {
    let s = plantSapling(selectCooperationMission(startCooperation(restoreCooperation(null)), 'trees'), 'right');
    s = restoreCooperation(JSON.parse(JSON.stringify(returnToCooperationMap(s))));
    s = selectCooperationMission(s, 'trees');
    expect(s.planted).toEqual(['right']);
    expect(canCompleteMission(s)).toBe(false);
  });

  it('requires trying the quiet setting, responds when made loud again, and never counts slider ticks', () => {
    let s = selectCooperationMission(startCooperation(restoreCooperation(null)), 'quiet');
    expect(canCompleteMission(s)).toBe(false);
    s = adjustWorkNoise(s, 30);
    expect(canCompleteMission(s)).toBe(false);
    s = chooseQuietPromise(s, 'break');
    expect(canCompleteMission(s)).toBe(true);
    s = adjustWorkNoise(s, 80);
    expect(canCompleteMission(s)).toBe(false);
    s = adjustWorkNoise(s, 0);
    expect(s.actions).toBe(1);
    expect(canCompleteMission(s)).toBe(true);
    expect(adjustWorkNoise(s, NaN)).toBe(s);
    expect(markBlockedWater(s)).toBe(s);
  });

  it('preserves finished locations from older saves without forcing the repeated quiz', () => {
    expect(restoreCooperation(null, { phase: 'soloResult', solo: 'care' }).phase).toBe('welcome');
    expect(restoreCooperation(null, { phase: 'turn', index: 1, turn: 2 })).toMatchObject({ phase: 'map', completed: ['trees'] });
    expect(restoreCooperation(null, { phase: 'result', index: 1 })).toMatchObject({ phase: 'map', completed: ['trees', 'water'] });
    expect(restoreCooperation(null, { phase: 'transfer' })).toMatchObject({ phase: 'map', completed: [...COOP_MISSIONS] });
    expect(restoreCooperation(null, null, true)).toMatchObject({ phase: 'ending', completed: [...COOP_MISSIONS] });
  });

  it('repairs malformed fields without inventing completed actions', () => {
    const repaired = restoreCooperation({ version: 1, phase: 'ending', completed: ['water', 'water', 'alien'], current: 'trees', planted: ['left', 'left', true], noiseLevel: NaN, actions: Infinity });
    expect(repaired).toMatchObject({ phase: 'map', completed: ['water'], planted: ['left'], noiseLevel: 80, actions: 0 });
    expect(restoreCooperation({ version: 1, phase: 'work', current: 'wat' }).phase).toBe('map');
  });
});

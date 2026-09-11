import { describe, expect, it } from 'vitest';
import { BIRDS, CARE_ZONES } from './page05Data';
import { applyTreatment, chooseStatement, evaluateCare, isStable, readCareState } from './page05CareModel';

describe('care observation and recovery', () => {
  it('does not turn a restored guess into a recorded observation', () => {
    const eye = BIRDS[0]!.zones.find((zone) => zone.id === 'eyes')!;
    const guess = eye.statements.find((statement) => !statement.grounded)!;
    const state = readCareState({ records: { green: { eyes: guess.id } }, wrongRecords: Infinity });
    expect(state.records.green.eyes).toBeUndefined();
    expect(state.wrongRecords).toBe(0);
    expect(isStable(state, 'green')).toBe(false);
  });

  it('requires observations as well as treatment, and lets a learner revise a mistake', () => {
    let state = readCareState(null);
    state = applyTreatment(state, 'green', 'shelter').state;
    expect(isStable(state, 'green')).toBe(false);
    for (const bird of BIRDS) {
      for (const zoneId of CARE_ZONES[bird.id]) {
        const zone = bird.zones.find((item) => item.id === zoneId)!;
        state = chooseStatement(state, bird.id, zoneId, zone.statements.find((item) => item.grounded)!.id).state;
      }
      state = applyTreatment(state, bird.id, 'feather').state;
      expect(isStable(state, bird.id)).toBe(false);
      state = applyTreatment(state, bird.id, bird.correctTreatment).state;
      expect(isStable(state, bird.id)).toBe(true);
    }
    expect(evaluateCare(state)).toMatchObject({ ready: true, stableBirds: 2 });
    expect(evaluateCare(readCareState(state)).ready).toBe(true);
  });
});

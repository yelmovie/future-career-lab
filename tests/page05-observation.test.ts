import { describe, expect, it } from 'vitest';
import { BIRDS } from '../src/pages/page05Data';
import { applyTreatment, birdGauge, buildCareLog, EMPTY_CARE_STATE, evaluateCare, isStable, readCareState, type CareState } from '../src/pages/page05CareModel';

const groundedRecords = (birdId: 'green' | 'red', count: number) => {
  const bird = BIRDS.find((item) => item.id === birdId)!;
  return Object.fromEntries(bird.zones.slice(0, count).map((zone) => [zone.id, zone.statements.find((s) => s.grounded)!.id]));
};

describe('page 5 care model', () => {
  it('each bird has exactly one grounded statement per zone and different correct treatments', () => {
    for (const bird of BIRDS) {
      for (const zone of bird.zones) expect(zone.statements.filter((s) => s.grounded)).toHaveLength(1);
    }
    expect(BIRDS[0]!.correctTreatment).not.toBe(BIRDS[1]!.correctTreatment);
    expect(BIRDS[0]!.soundAnswer).not.toBe(BIRDS[1]!.soundAnswer);
  });

  it('same treatment on both birds stabilises one and drops the other with question feedback, no penalty', () => {
    const onRed = applyTreatment(EMPTY_CARE_STATE, 'red', 'water');
    expect(onRed.matched).toBe(true);
    expect(isStable(onRed.state, 'red')).toBe(true);
    const onGreen = applyTreatment(onRed.state, 'green', 'water');
    expect(onGreen.matched).toBe(false);
    expect(onGreen.feedback).toContain('왜일까');
    expect(birdGauge(onGreen.state, 'green')).toBeLessThan(birdGauge(EMPTY_CARE_STATE, 'green'));
    expect(onGreen.state.wrongTreatments).toBe(1);
    // 다시 놓으면 회복된다 — 되돌리기 없음
    const fixed = applyTreatment(onGreen.state, 'green', 'shelter');
    expect(isStable(fixed.state, 'green')).toBe(true);
  });

  it('requires 4 grounded records, both sounds classified, and both birds stable', () => {
    const state: CareState = {
      records: { green: groundedRecords('green', 2), red: groundedRecords('red', 2) },
      sound: { green: 'abnormal', red: 'normal' },
      treatments: { green: 'shelter', red: 'water' },
      wrongTreatments: 0,
    };
    const result = evaluateCare(state);
    expect(result).toMatchObject({ grounded: 4, soundsClassified: 2, stableBirds: 2, ready: true, perfect: true });
    expect(evaluateCare({ ...state, sound: { green: 'normal', red: 'normal' } }).ready).toBe(false);
    expect(evaluateCare({ ...state, records: { green: groundedRecords('green', 1), red: groundedRecords('red', 2) } }).ready).toBe(false);
    expect(evaluateCare({ ...state, wrongTreatments: 2 }).perfect).toBe(false);
    expect(buildCareLog(state)).toEqual([
      { bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' },
      { bird: 'red', issue: '탈수', treatment: '물·전해질' },
    ]);
  });

  it('restores only valid saved data', () => {
    const restored = readCareState({ records: { green: { eyes: 'eyes-0', feathers: 'bogus' } }, sound: { red: 'normal', green: 'loud' }, treatments: { red: 'water', green: 'nope' }, wrongTreatments: 2 });
    expect(restored.records.green).toEqual({ eyes: 'eyes-0' });
    expect(restored.sound).toEqual({ green: null, red: 'normal' });
    expect(restored.treatments).toEqual({ green: null, red: 'water' });
    expect(restored.wrongTreatments).toBe(2);
    expect(readCareState(undefined)).toEqual(EMPTY_CARE_STATE);
  });
});

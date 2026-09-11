import { describe, expect, it } from 'vitest';
import { BIRDS } from '../src/pages/page05Data';
import {
  applyTreatment,
  birdGauge,
  birdStatus,
  buildCareLog,
  chooseStatement,
  EMPTY_CARE_STATE,
  evaluateCare,
  isStable,
  readCareState,
  shuffledStatements,
  type CareState,
} from '../src/pages/page05CareModel';

const groundedRecords = (birdId: 'green' | 'red', count: number) => {
  const bird = BIRDS.find((item) => item.id === birdId)!;
  return Object.fromEntries(bird.zones.slice(0, count).map((zone) => [zone.id, zone.statements.find((s) => s.grounded)!.id]));
};

describe('page 5 care model', () => {
  it('each bird has exactly one grounded statement per zone, not always in the same slot, and different correct treatments', () => {
    for (const bird of BIRDS) {
      const slots = new Set<number>();
      for (const zone of bird.zones) {
        expect(zone.statements.filter((s) => s.grounded)).toHaveLength(1);
        slots.add(zone.statements.findIndex((s) => s.grounded));
      }
      expect(slots.size).toBeGreaterThan(1);
    }
    expect(BIRDS[0]!.correctTreatment).not.toBe(BIRDS[1]!.correctTreatment);
  });

  it('shuffles statement order per seed, deterministically, keeping the same statements', () => {
    const a = shuffledStatements('green', 'eyes', 1);
    expect(shuffledStatements('green', 'eyes', 1)).toEqual(a);
    expect([...a].sort((x, y) => x.id.localeCompare(y.id))).toEqual(BIRDS[0]!.zones[0]!.statements);
    const orders = new Set(Array.from({ length: 12 }, (_, seed) => shuffledStatements('green', 'eyes', seed).map((s) => s.id).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('a guessed statement is not recorded, gives a question hint and counts as a wrong record without gauge penalty', () => {
    const guess = BIRDS[0]!.zones[0]!.statements.find((s) => !s.grounded)!;
    const result = chooseStatement(EMPTY_CARE_STATE, 'green', 'eyes', guess.id);
    expect(result.grounded).toBe(false);
    expect(result.feedback).toContain('짐작일까');
    expect(result.state.wrongRecords).toBe(1);
    expect(result.state.records.green).toEqual({});
    expect(birdGauge(result.state, 'green')).toBe(birdGauge(EMPTY_CARE_STATE, 'green'));
    const ok = chooseStatement(result.state, 'green', 'eyes', BIRDS[0]!.zones[0]!.statements.find((s) => s.grounded)!.id);
    expect(ok.grounded).toBe(true);
    expect(ok.state.records.green.eyes).toBeDefined();
  });

  it('a single correct treatment is not enough: stable needs the treatment plus 3 grounded records', () => {
    const onRed = applyTreatment(EMPTY_CARE_STATE, 'red', 'water');
    expect(onRed.matched).toBe(true);
    expect(isStable(onRed.state, 'red')).toBe(false);
    expect(onRed.feedback).toContain('관찰이 부족해');
    expect(birdStatus(onRed.state, 'red')).toBe('처치는 맞는데 아직 관찰이 부족해');
    const twoRecords: CareState = { ...onRed.state, records: { ...onRed.state.records, red: groundedRecords('red', 2) } };
    expect(isStable(twoRecords, 'red')).toBe(false);
    const threeRecords: CareState = { ...onRed.state, records: { ...onRed.state.records, red: groundedRecords('red', 3) } };
    expect(isStable(threeRecords, 'red')).toBe(true);
    expect(birdGauge(threeRecords, 'red')).toBeGreaterThanOrEqual(80);
    // 기록만 5개 있어도 처치 없이는 안정 아님
    expect(isStable({ ...EMPTY_CARE_STATE, records: { green: {}, red: groundedRecords('red', 5) } }, 'red')).toBe(false);
  });

  it('wrong treatment drops the gauge with question feedback, no penalty, and can be replaced', () => {
    const onGreen = applyTreatment(EMPTY_CARE_STATE, 'green', 'water');
    expect(onGreen.matched).toBe(false);
    expect(onGreen.assist).toBe(false);
    expect(onGreen.feedback).toContain('왜일까');
    expect(birdGauge(onGreen.state, 'green')).toBeLessThan(birdGauge(EMPTY_CARE_STATE, 'green'));
    expect(onGreen.state.wrongTreatments).toBe(1);
    const fixed = applyTreatment({ ...onGreen.state, records: { green: groundedRecords('green', 3), red: {} } }, 'green', 'shelter');
    expect(isStable(fixed.state, 'green')).toBe(true);
    // 탈수 개체에 은신처는 여전히 틀린 처치
    expect(applyTreatment(EMPTY_CARE_STATE, 'red', 'shelter').feedback).toContain('부족한 게 뭘까');
  });

  it('foraging puzzle on the stressed bird is an assist: half effect, not a wrong treatment, not stable', () => {
    const base: CareState = { ...EMPTY_CARE_STATE, records: { green: groundedRecords('green', 3), red: {} } };
    const puzzle = applyTreatment(base, 'green', 'puzzle');
    expect(puzzle.assist).toBe(true);
    expect(puzzle.matched).toBe(false);
    expect(puzzle.state.wrongTreatments).toBe(0);
    expect(puzzle.feedback).toBe('좋은 생각이야. 그런데 먼저 조용히 숨을 곳이 필요해. 퍼즐은 그 다음이야.');
    const shelter = applyTreatment(base, 'green', 'shelter');
    const gain = (s: CareState) => birdGauge(s, 'green') - birdGauge(base, 'green');
    expect(gain(puzzle.state)).toBe(gain(shelter.state) / 2);
    expect(isStable(puzzle.state, 'green')).toBe(false);
  });

  it('requires 3 grounded records per bird and both birds stable', () => {
    const state: CareState = {
      records: { green: groundedRecords('green', 3), red: groundedRecords('red', 3) },
      treatments: { green: 'shelter', red: 'water' },
      wrongTreatments: 0,
      wrongRecords: 0,
    };
    const result = evaluateCare(state);
    expect(result).toMatchObject({ grounded: 6, stableBirds: 2, ready: true, perfect: true });
    // 합계 6이어도 한 마리에 몰리면 안 됨
    expect(evaluateCare({ ...state, records: { green: groundedRecords('green', 5), red: groundedRecords('red', 2) } }).ready).toBe(false);
    expect(evaluateCare({ ...state, wrongTreatments: 2 }).perfect).toBe(false);
    expect(buildCareLog(state)).toEqual([
      { bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' },
      { bird: 'red', issue: '탈수', treatment: '물·전해질' },
    ]);
  });

  it('restores grounded saved observations and discards guesses or unknown records', () => {
    const restored = readCareState({ records: { green: { eyes: 'eyes-1', feathers: 'bogus', posture: 'posture-1' } }, treatments: { red: 'water', green: 'nope' }, wrongTreatments: 2, wrongRecords: 3 });
    expect(restored.records.green).toEqual({ eyes: 'eyes-1' });
    expect(readCareState({ records: { green: { eyes: 'eyes-0' } } }).records.green).toEqual({});
    expect(restored.treatments).toEqual({ green: null, red: 'water' });
    expect(restored.wrongTreatments).toBe(2);
    expect(restored.wrongRecords).toBe(3);
    expect(readCareState(undefined)).toEqual(EMPTY_CARE_STATE);
  });
});

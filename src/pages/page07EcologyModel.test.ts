import { describe, expect, it } from 'vitest';
import {
  BASE_LEVELS,
  FIELD_TRACES,
  TRACES,
  actualDirection,
  buildGraphs,
  changeLevel,
  createExperiment,
  fewestTracePoint,
  nextPoint,
  population,
  runTrial,
  subCause,
  visibleTraces,
} from './page07EcologyModel';

describe('page 7 ecology model', () => {
  it('population reacts most to food, then noise, then water', () => {
    const base = population(BASE_LEVELS);
    const food = Math.abs(population({ ...BASE_LEVELS, logging: 10 }) - base);
    const noise = Math.abs(population({ ...BASE_LEVELS, noise: 10 }) - base);
    const water = Math.abs(population({ ...BASE_LEVELS, water: 10 }) - base);
    expect(food).toBeGreaterThan(noise);
    expect(noise).toBeGreaterThan(water);
    expect(water).toBeGreaterThan(0);
    expect(population({ logging: 0, noise: 10, water: 0 })).toBeGreaterThanOrEqual(0);
    expect(population(BASE_LEVELS)).toBe(population(BASE_LEVELS));
  });

  it('allows only one active slider at a time', () => {
    let { state } = changeLevel(createExperiment(), 'logging', 8);
    expect(state.active).toBe('logging');
    const blocked = changeLevel(state, 'noise', 2);
    expect(blocked.locked).toBe(true);
    expect(blocked.state.levels.noise).toBe(BASE_LEVELS.noise);
    // 원래 값으로 되돌리면 잠금이 풀린다
    state = changeLevel(state, 'logging', BASE_LEVELS.logging).state;
    expect(state.active).toBeNull();
    expect(changeLevel(state, 'noise', 2).locked).toBe(false);
  });

  it('runs a trial against the fixed baseline and snaps sliders back', () => {
    expect(runTrial(createExperiment(), 'up')).toBeNull();
    const { state } = changeLevel(createExperiment(), 'noise', 9);
    const result = runTrial(state, 'up');
    expect(result).not.toBeNull();
    expect(result!.trial).toMatchObject({ variable: 'noise', from: 5, to: 9, prediction: 'up' });
    expect(actualDirection(result!.trial.before, result!.trial.after)).toBe('down');
    expect(result!.state.active).toBeNull();
    expect(result!.state.baseline).toEqual(BASE_LEVELS);
    expect(result!.state.levels).toEqual(BASE_LEVELS);
  });

  it('three one-variable trials each show the true effect of that variable (other conditions stay the same)', () => {
    const base = population(BASE_LEVELS);
    let state = createExperiment();
    const run = (variable: 'logging' | 'noise' | 'water', to: number) => {
      const result = runTrial(changeLevel(state, variable, to).state, 'same')!;
      state = result.state;
      return result.trial;
    };
    const food = run('logging', 0);
    const noise = run('noise', 10);
    const water = run('water', 10);
    // 매 실험이 기준 5·5·5 에서 출발한다
    expect([food.before, noise.before, water.before]).toEqual([base, base, base]);
    expect(actualDirection(food.before, food.after)).toBe('down');
    expect(actualDirection(noise.before, noise.after)).toBe('down');
    expect(actualDirection(water.before, water.after)).toBe('up');
    // 영향 크기 순서도 그대로 드러난다
    expect(Math.abs(food.after - base)).toBeGreaterThan(Math.abs(noise.after - base));
    expect(Math.abs(noise.after - base)).toBeGreaterThan(Math.abs(water.after - base));
  });

  it('builds verdict cards for every variable', () => {
    expect(buildGraphs('logging', 'noise')).toEqual([
      { variable: 'logging', verdict: 'main' },
      { variable: 'noise', verdict: 'sub' },
      { variable: 'water', verdict: 'none' },
    ]);
  });

  it('hides two traces until the meter is tapped', () => {
    const hidden = TRACES.filter((trace) => trace.hidden);
    expect(hidden).toHaveLength(2);
    expect(TRACES).toHaveLength(8);
    expect(visibleTraces('B', false).some((t) => t.hidden)).toBe(false);
    expect(visibleTraces('B', true).some((t) => t.id === 'foot-cat')).toBe(true);
    expect(visibleTraces('C', true).some((t) => t.id === 'sound-alarm')).toBe(true);
    // v4 현장 흔적은 지점마다 2개
    expect(FIELD_TRACES).toHaveLength(6);
    for (const point of ['A', 'B', 'C'] as const) expect(FIELD_TRACES.filter((t) => t.point === point)).toHaveLength(2);
  });

  it('picks the sub cause from trial effect size', () => {
    const trials = [
      { variable: 'logging' as const, from: 5, to: 0, prediction: 'down' as const, before: 40, after: 10 },
      { variable: 'noise' as const, from: 5, to: 10, prediction: 'down' as const, before: 40, after: 28 },
      { variable: 'water' as const, from: 5, to: 10, prediction: 'up' as const, before: 40, after: 44 },
    ];
    expect(subCause('logging', trials)).toBe('noise');
    expect(subCause('noise', trials)).toBe('logging');
    expect(subCause('logging', [])).toBe('noise');
  });

  it('navigates points in a loop and finds the point with fewest traces', () => {
    expect(nextPoint('A', -1)).toBe('C');
    expect(nextPoint('C', 1)).toBe('A');
    expect(fewestTracePoint()).toBe('A');
  });
});

describe('v6 그림 실험 (applyAction)', () => {
  it('세 행동을 각각 하나만 적용하면 나무 > 소리 > 물 순으로 새가 돌아온다', async () => {
    const { ACTIONS, applyAction, edgeBirds } = await import('./page07EcologyModel');
    const results = ACTIONS.map((action) => applyAction(action.id, 'up'));
    for (const trial of results) expect(trial.before).toBe(edgeBirds());
    const gain = (id: string) => results.find((t) => t.variable === id)!.after - edgeBirds();
    expect(gain('logging')).toBeGreaterThan(gain('noise'));
    expect(gain('noise')).toBeGreaterThan(gain('water'));
    expect(gain('water')).toBeGreaterThanOrEqual(0);
  });
});

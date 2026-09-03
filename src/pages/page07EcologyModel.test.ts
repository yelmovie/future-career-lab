import { describe, expect, it } from 'vitest';
import {
  BASE_LEVELS,
  TRACES,
  actualDirection,
  buildGraphs,
  changeLevel,
  createExperiment,
  fewestTracePoint,
  nextPoint,
  population,
  runTrial,
  sensitivity,
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

  it('runs a trial and the new levels become the baseline', () => {
    expect(runTrial(createExperiment(), 'up')).toBeNull();
    const { state } = changeLevel(createExperiment(), 'noise', 9);
    const result = runTrial(state, 'up');
    expect(result).not.toBeNull();
    expect(result!.trial).toMatchObject({ variable: 'noise', from: 5, to: 9, prediction: 'up' });
    expect(actualDirection(result!.trial.before, result!.trial.after)).toBe('down');
    expect(result!.state.active).toBeNull();
    expect(result!.state.baseline.noise).toBe(9);
    expect(sensitivity([result!.trial]).noise).toBeGreaterThan(0);
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
  });

  it('navigates points in a loop and finds the point with fewest traces', () => {
    expect(nextPoint('A', -1)).toBe('C');
    expect(nextPoint('C', 1)).toBe('A');
    expect(fewestTracePoint()).toBe('A');
  });
});

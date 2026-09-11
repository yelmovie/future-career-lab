import { describe, expect, it } from 'vitest';
import {
  BASE_LEVELS,
  FIELD_TRACES,
  TRACES,
  buildGraphs,
  changeLevel,
  createExperiment,
  fewestTracePoint,
  nextPoint,
  normalizeFoundTraces,
  population,
  runTrial,
  subCause,
  ACTIONS,
  applyAction,
  edgeBirds,
  evaluateConclusion,
  POINT_STATS,
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
    expect(runTrial(createExperiment())).toBeNull();
    const { state } = changeLevel(createExperiment(), 'noise', 9);
    const result = runTrial(state);
    expect(result).not.toBeNull();
    expect(result!.trial).toMatchObject({ variable: 'noise', from: 5, to: 9 });
    expect(result!.trial).not.toHaveProperty('prediction');
    expect(result!.trial.after).toBeLessThan(result!.trial.before);
    expect(result!.state.active).toBeNull();
    expect(result!.state.baseline).toEqual(BASE_LEVELS);
    expect(result!.state.levels).toEqual(BASE_LEVELS);
  });

  it('three one-variable trials each show the true effect of that variable (other conditions stay the same)', () => {
    const base = population(BASE_LEVELS);
    let state = createExperiment();
    const run = (variable: 'logging' | 'noise' | 'water', to: number) => {
      const result = runTrial(changeLevel(state, variable, to).state)!;
      state = result.state;
      return result.trial;
    };
    const food = run('logging', 0);
    const noise = run('noise', 10);
    const water = run('water', 10);
    // 매 실험이 기준 5·5·5 에서 출발한다
    expect([food.before, noise.before, water.before]).toEqual([base, base, base]);
    expect(food.after).toBeLessThan(food.before);
    expect(noise.after).toBeLessThan(noise.before);
    expect(water.after).toBeGreaterThan(water.before);
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

  it('uses six visible traces with two at each forest point', () => {
    expect(TRACES).toHaveLength(6);
    expect(FIELD_TRACES).toHaveLength(6);
    for (const point of ['A', 'B', 'C'] as const) expect(FIELD_TRACES.filter((t) => t.point === point)).toHaveLength(2);
  });

  it('preserves all collected traces from a save made before the habitat clue replaced the boot print', () => {
    const previousSave = ['foot-boot', 'sound-chainsaw', 'feather-brown', 'sound-forest-birds', 'foot-songbird', 'feather-blue'];
    const restored = normalizeFoundTraces(previousSave);
    expect(restored).toEqual(FIELD_TRACES.map((trace) => trace.id));
    expect(restored).toHaveLength(6);
    expect(previousSave[0]).toBe('foot-boot');
    expect(normalizeFoundTraces(restored)).toEqual(restored);
  });

  it('keeps partial discovery progress without counting legacy aliases, duplicates, or invalid entries twice', () => {
    expect(normalizeFoundTraces([
      'feather-brown', 'foot-boot', 'tree-cut', 'foot-boot', 'feather-brown',
      'retired-trace', '', 4, null, { id: 'sound-chainsaw' }, ['foot-songbird'],
    ])).toEqual(['feather-brown', 'tree-cut']);
  });

  it.each([undefined, null, 'foot-boot', 6, { found: ['foot-boot'] }])('ignores malformed discovery collections: %j', (value) => {
    expect(normalizeFoundTraces(value)).toEqual([]);
  });

  it('uses dedicated forest-bird evidence without parrot-specific clues', () => {
    expect(FIELD_TRACES.find((trace) => trace.id === 'sound-chainsaw')?.image).toBe('/assets/v5/trace-machine-sound.webp');
    expect(FIELD_TRACES.find((trace) => trace.id === 'feather-brown')?.image).toBe('/assets/v8/trace-forest-feather-brown.png');
    expect(FIELD_TRACES.find((trace) => trace.id === 'sound-forest-birds')).toMatchObject({ image: '/assets/v8/trace-forest-birdsong.png', sound: 'forestBirdsong' });
    expect(FIELD_TRACES.find((trace) => trace.id === 'foot-songbird')?.image).toBe('/assets/v8/trace-forest-footprints.png');
    expect(FIELD_TRACES.find((trace) => trace.id === 'feather-blue')?.image).toBe('/assets/v8/trace-forest-feather-blue.png');
    expect(FIELD_TRACES.map((trace) => `${trace.title} ${trace.note}`).join(' ')).not.toMatch(/앵무|지구|젤리/);
  });

  it('picks the sub cause from trial effect size', () => {
    const trials = [
      { variable: 'logging' as const, from: 5, to: 0, before: 40, after: 10 },
      { variable: 'noise' as const, from: 5, to: 10, before: 40, after: 28 },
      { variable: 'water' as const, from: 5, to: 10, before: 40, after: 44 },
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

describe('v6 전후 그림 비교 (applyAction)', () => {
  it('continues from the observed bird count and preserves the measured intervention gains', () => {
    expect(edgeBirds()).toBe(POINT_STATS.A.birdCount);
    expect(ACTIONS.map((action) => applyAction(action.id).after)).toEqual([10, 7, 2]);
  });

  it('requires all comparisons and blocks an unsupported conclusion while permitting a supported revision', () => {
    const trials = ACTIONS.map((action) => applyAction(action.id));
    expect(evaluateConclusion('logging', trials.slice(0, 2)).supported).toBe(false);
    expect(evaluateConclusion('water', trials)).toMatchObject({ supported: false, selectedGain: 1, bestGain: 9 });
    expect(evaluateConclusion('logging', trials).supported).toBe(true);
  });

  it('evaluates the recorded evidence, rather than hard-coding trees as the answer', () => {
    const trials = ACTIONS.map((action) => ({ ...applyAction(action.id), after: action.id === 'water' ? 20 : 3 }));
    expect(evaluateConclusion('water', trials).supported).toBe(true);
    expect(evaluateConclusion('logging', trials).supported).toBe(false);
  });
  it('세 행동을 각각 하나만 적용하면 나무 > 소리 > 물 순으로 새가 돌아온다', async () => {
    const { ACTIONS, applyAction, edgeBirds } = await import('./page07EcologyModel');
    const results = ACTIONS.map((action) => applyAction(action.id));
    for (const trial of results) expect(trial).not.toHaveProperty('prediction');
    for (const trial of results) expect(trial.before).toBe(edgeBirds());
    const gain = (id: string) => results.find((t) => t.variable === id)!.after - edgeBirds();
    expect(gain('logging')).toBeGreaterThan(gain('noise'));
    expect(gain('noise')).toBeGreaterThan(gain('water'));
    expect(gain('water')).toBeGreaterThanOrEqual(0);
  });
});

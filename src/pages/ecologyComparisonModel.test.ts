import { describe, expect, it } from 'vitest';
import { applyAction } from './page07EcologyModel';
import { comparisonMediaReady, comparisonMediaReducer, confirmComparedVariable, createComparisonMedia, restoreComparedVariables } from './ecologyComparisonModel';

describe('ecology comparison image recovery', () => {
  it('waits for both before and after pictures, including a successful fallback', () => {
    let state = createComparisonMedia(true);
    state = comparisonMediaReducer(state, { type: 'loaded', part: 'after', source: 0, attempt: 0 });
    expect(comparisonMediaReady(state)).toBe(false);
    state = comparisonMediaReducer(state, { type: 'unavailable', part: 'before', source: 0, attempt: 0 });
    expect(state.before).toEqual({ source: 1, status: 'loading' });
    state = comparisonMediaReducer(state, { type: 'loaded', part: 'before', source: 1, attempt: 0 });
    expect(comparisonMediaReady(state)).toBe(true);
  });

  it('settles after two failed or timed-out requests without declaring a comparison complete', () => {
    let state = createComparisonMedia(true);
    for (const source of [0, 1] as const) state = comparisonMediaReducer(state, { type: 'unavailable', part: 'after', source, attempt: 0 });
    expect(state.after?.status).toBe('failed');
    expect(comparisonMediaReady(state)).toBe(false);
    expect(comparisonMediaReducer(state, { type: 'loaded', part: 'after', source: 1, attempt: 0 })).toBe(state);
  });

  it('a retry starts fresh and late requests cannot make it ready or fail it', () => {
    const initial = createComparisonMedia(true);
    let retry = comparisonMediaReducer(initial, { type: 'retry' });
    expect(retry.attempt).toBe(1);
    expect(comparisonMediaReducer(retry, { type: 'loaded', part: 'before', source: 0, attempt: 0 })).toBe(retry);
    retry = comparisonMediaReducer(retry, { type: 'unavailable', part: 'before', source: 0, attempt: 1 });
    expect(comparisonMediaReducer(retry, { type: 'loaded', part: 'before', source: 0, attempt: 1 })).toBe(retry);
    expect(retry.before).toEqual({ source: 1, status: 'loading' });
  });
});

describe('saved ecology comparisons', () => {
  const trials = [applyAction('logging'), applyAction('noise'), applyAction('water')];
  it('preserves earlier comparisons in a legacy save but makes the pending third one wait', () => {
    expect(restoreComparedVariables(trials, trials[2]!, undefined)).toEqual(['logging', 'noise']);
    expect(restoreComparedVariables(trials, null, undefined)).toEqual(['logging', 'noise', 'water']);
  });

  it('restores a directly confirmed numeric comparison without redoing or duplicating the trial', () => {
    const compared = confirmComparedVariable(['logging', 'noise'], 'water');
    expect(restoreComparedVariables(trials, trials[2]!, compared)).toEqual(['logging', 'noise', 'water']);
    expect(confirmComparedVariable(compared, 'water')).toEqual(compared);
    expect(trials).toHaveLength(3);
  });

  it('recovers earlier comparisons from a damaged list without counting the pending comparison', () => {
    expect(restoreComparedVariables(trials, trials[2]!, [])).toEqual(['logging', 'noise']);
    expect(restoreComparedVariables(trials.slice(0, 2), null, ['noise', 'noise', 'water', 'unknown', null])).toEqual(['logging', 'noise']);
  });
});

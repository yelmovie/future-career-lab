import type { CauseId } from '../shared/types';
import type { Trial } from './page07EcologyModel';

export const COMPARISON_IMAGE_TIMEOUT_MS = 4000;

export interface ComparisonImage {
  source: 0 | 1;
  status: 'loading' | 'ready' | 'failed';
}
export interface ComparisonMedia {
  attempt: number;
  before: ComparisonImage;
  after: ComparisonImage | null;
}
export type ComparisonMediaEvent =
  | { type: 'retry' }
  | { type: 'loaded' | 'unavailable'; part: 'before' | 'after'; source: 0 | 1; attempt: number };

export function createComparisonMedia(hasAfter: boolean, attempt = 0): ComparisonMedia {
  return { attempt, before: { source: 0, status: 'loading' }, after: hasAfter ? { source: 0, status: 'loading' } : null };
}

/** Both pictures must load; a failed or timed-out request gets one bounded fallback attempt. */
export function comparisonMediaReducer(state: ComparisonMedia, event: ComparisonMediaEvent): ComparisonMedia {
  if (event.type === 'retry') return createComparisonMedia(state.after !== null, state.attempt + 1);
  const picture = state[event.part];
  // Ignore late events from an old request, retry, or already settled picture.
  if (!picture || event.attempt !== state.attempt || event.source !== picture.source || picture.status !== 'loading') return state;
  const next: ComparisonImage = event.type === 'loaded'
    ? { ...picture, status: 'ready' }
    : picture.source === 0 ? { source: 1, status: 'loading' } : { source: 1, status: 'failed' };
  return { ...state, [event.part]: next };
}

export function comparisonMediaReady(state: ComparisonMedia): boolean {
  return state.before.status === 'ready' && (!state.after || state.after.status === 'ready');
}

/** Old saves counted earlier trials as seen, but the current trial may still be awaiting comparison. */
export function restoreComparedVariables(trials: readonly Trial[], current: Trial | null, value: unknown): CauseId[] {
  const recorded = new Set(trials.map((trial) => trial.variable));
  // The UI only starts another trial after the previous comparison is finished.
  // Recover that invariant even if the optional saved list is missing or damaged.
  const earlier = [...recorded].filter((variable) => variable !== current?.variable);
  const candidates = [...earlier, ...(Array.isArray(value) ? value : [])];
  return [...new Set(candidates.filter((variable): variable is CauseId => recorded.has(variable as CauseId)))];
}

export function confirmComparedVariable(compared: readonly CauseId[], variable: CauseId): CauseId[] {
  return compared.includes(variable) ? [...compared] : [...compared, variable];
}

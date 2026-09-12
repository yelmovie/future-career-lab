import { useEffect, useReducer } from 'react';
import { COMPARISON_IMAGE_TIMEOUT_MS, comparisonMediaReducer, comparisonMediaReady, createComparisonMedia, type ComparisonImage } from './ecologyComparisonModel';

interface Sources { src: string; fallback: string }

/** Mounted with a key per trial, so image events cannot complete a different action. */
export function useEcologyComparisonMedia(before: Sources, after: Sources | null) {
  const [state, dispatch] = useReducer(comparisonMediaReducer, after !== null, createComparisonMedia);
  useEffect(() => {
    if (state.before.status !== 'loading') return;
    const timer = window.setTimeout(() => dispatch({ type: 'unavailable', part: 'before', source: state.before.source, attempt: state.attempt }), COMPARISON_IMAGE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [state.attempt, state.before.source, state.before.status]);
  useEffect(() => {
    if (!state.after || state.after.status !== 'loading') return;
    const source = state.after.source;
    const timer = window.setTimeout(() => dispatch({ type: 'unavailable', part: 'after', source, attempt: state.attempt }), COMPARISON_IMAGE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [state.attempt, state.after?.source, state.after?.status]);

  const image = (part: 'before' | 'after', sources: Sources, picture: ComparisonImage) => {
    const src = picture.source === 0 ? sources.src : sources.fallback;
    return {
      key: `${state.attempt}:${picture.source}`,
      // Remount the image to retry while keeping the URL in the offline asset cache.
      src,
      onLoad: () => dispatch({ type: 'loaded', part, source: picture.source, attempt: state.attempt }),
      onError: () => dispatch({ type: 'unavailable', part, source: picture.source, attempt: state.attempt }),
    };
  };
  return {
    ready: comparisonMediaReady(state),
    failed: state.before.status === 'failed' || state.after?.status === 'failed',
    before: image('before', before, state.before),
    after: after && state.after ? image('after', after, state.after) : null,
    retry: () => dispatch({ type: 'retry' }),
  };
}

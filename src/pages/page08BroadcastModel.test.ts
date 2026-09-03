import { describe, expect, it } from 'vitest';
import {
  AP_BUDGET,
  CORRECTION_SEGMENT,
  INCIDENTS,
  SEGMENTS,
  UNSOURCED_PENALTY,
  airBlock,
  airSegment,
  audioZone,
  buildCaptionCards,
  createBroadcast,
  currentSegment,
  isCleanBroadcast,
  resolveIncident,
  restoreBroadcast,
  type BroadcastState,
} from './page08BroadcastModel';

const cards = buildCaptionCards({ graphs: [{ variable: 'logging', verdict: 'main' }], photos: [{ id: 'stream', quality: 'center' }] });
const sourced = cards.find((card) => card.sourced)!;
const rumor = cards.find((card) => !card.sourced)!;

function ready(state: BroadcastState, captionId: string): BroadcastState {
  const segment = currentSegment(state)!;
  return { ...state, draft: { source: segment.requiredSource, captionId, level: 55 } };
}

describe('page 8 broadcast model', () => {
  it('builds sourced cards from artifacts and mixes in three unsourced ones', () => {
    expect(cards.filter((card) => card.sourced).map((card) => card.id)).toEqual(['graph-logging', 'photo-stream']);
    expect(cards.filter((card) => !card.sourced)).toHaveLength(3);
    expect(sourced.text).toContain('(가장 큰 원인)');
    // 앞 스테이지 기록이 없어도 fallback 으로 근거 카드가 생긴다
    expect(buildCaptionCards({ graphs: [], photos: [] }).filter((card) => card.sourced)).toHaveLength(6);
  });

  it('checks the audio band', () => {
    expect(audioZone(10)).toBe('quiet');
    expect(audioZone(55)).toBe('ok');
    expect(audioZone(90)).toBe('clip');
  });

  it('blocks airing until source matches, a caption is on, and audio sits in the band', () => {
    let state = createBroadcast();
    expect(airBlock(state, cards)).toBe('source');
    state = { ...state, draft: { ...state.draft, source: 'drone' } };
    expect(airBlock(state, cards)).toBe('wrong-source');
    state = { ...state, draft: { ...state.draft, source: 'studio' } };
    expect(airBlock(state, cards)).toBe('caption');
    state = { ...state, draft: { ...state.draft, captionId: sourced.id, level: 95 } };
    expect(airBlock(state, cards)).toBe('audio');
    state = { ...state, draft: { ...state.draft, level: 55 } };
    expect(airBlock(state, cards)).toBeNull();
  });

  it('drops trust and forces the next segment into a correction when an unsourced caption airs', () => {
    let state = airSegment(ready(createBroadcast(), rumor.id), cards);
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(state.corrections).toBe(1);
    expect(currentSegment(state)).toBe(CORRECTION_SEGMENT);
    // 정정 방송을 근거 카드로 마치면 원래 순서로 돌아간다
    state = airSegment(ready(state, sourced.id), cards);
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(currentSegment(state)?.id).toBe(SEGMENTS[2]!.id);
  });

  it('raises an incident twice and makes AP 3 insufficient for two full fixes', () => {
    let state = createBroadcast();
    state = airSegment(ready(state, sourced.id), cards);
    expect(state.pendingIncident).toBeNull();
    state = airSegment(ready(state, sourced.id), cards);
    expect(state.pendingIncident).toBe('mic');
    expect(airBlock(ready(state, sourced.id), cards)).toBe('incident');
    state = resolveIncident(state, 'mic-swap');
    expect(state.ap).toBe(AP_BUDGET - 2);
    expect(state.trust).toBe(100);
    state = airSegment(ready(state, sourced.id), cards);
    state = airSegment(ready(state, sourced.id), cards);
    expect(state.pendingIncident).toBe('tip');
    // 남은 AP 1 → 근본 해결 불가
    expect(resolveIncident(state, 'tip-verify')).toBe(state);
    state = resolveIncident(state, 'tip-hedge');
    expect(state.trust).toBe(95);
    expect(INCIDENTS.every((incident) => Math.min(...incident.actions.map((a) => a.cost)) === 0)).toBe(true);
  });

  it('finishes after six segments and calls a zero-correction show clean', () => {
    let state = createBroadcast();
    for (let i = 0; i < SEGMENTS.length; i += 1) {
      state = airSegment(ready(state, sourced.id), cards);
      if (state.pendingIncident) state = resolveIncident(state, INCIDENTS.find((item) => item.id === state.pendingIncident)!.actions.find((a) => a.cost === 0)!.id);
    }
    expect(currentSegment(state)).toBeNull();
    expect(state.trust).toBe(70);
    expect(isCleanBroadcast(state)).toBe(true);
  });

  it('restores a saved state and rejects junk', () => {
    const state = airSegment(ready(createBroadcast(), sourced.id), cards);
    expect(restoreBroadcast(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(restoreBroadcast({ index: 'x' })).toBeNull();
    expect(restoreBroadcast(null)).toBeNull();
  });
});

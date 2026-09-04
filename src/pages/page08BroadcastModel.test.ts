import { describe, expect, it } from 'vitest';
import {
  AP_BUDGET,
  CORRECTION_SEGMENT,
  INCIDENTS,
  SEGMENTS,
  UNSOURCED_PENALTY,
  airBlock,
  airRumor,
  airSegment,
  audioZone,
  buildCaptionCards,
  createBroadcast,
  currentSegment,
  isCleanBroadcast,
  isFinished,
  planIncidents,
  resolveIncident,
  restoreBroadcast,
  segmentCards,
  totalSegments,
  type BroadcastState,
} from './page08BroadcastModel';

const cards = buildCaptionCards({ graphs: [{ variable: 'logging', verdict: 'main' }], photos: [{ id: 'stream', quality: 'center' }] });
const graph = cards.find((card) => card.id === 'graph-logging')!;
const photo = cards.find((card) => card.id === 'photo-stream')!;
const action = cards.find((card) => card.kind === 'action')!;
const rumor = cards.find((card) => !card.sourced)!;

/** 현재 세그먼트에 맞는 소스 + 주어진 자막(없으면 맞는 근거 카드) + 알맞은 오디오 */
function ready(state: BroadcastState, captionId?: string): BroadcastState {
  const segment = currentSegment(state)!;
  const fit = captionId ?? cards.find((card) => card.sourced && (segment.fit === 'any' || segment.fit === card.kind))!.id;
  return { ...state, draft: { source: segment.requiredSource, captionId: fit, level: 55 } };
}

function skipIncident(state: BroadcastState): BroadcastState {
  if (!state.pendingIncident) return state;
  return resolveIncident(state, INCIDENTS.find((item) => item.id === state.pendingIncident)!.actions.find((a) => a.cost === 0)!.id);
}

describe('page 8 broadcast model', () => {
  it('builds sourced cards from artifacts and mixes in four unsourced ones that all carry a source line', () => {
    expect(cards.filter((card) => card.sourced).map((card) => card.id)).toEqual(['graph-logging', 'photo-stream', 'action-noise', 'action-report']);
    expect(cards.filter((card) => !card.sourced)).toHaveLength(4);
    expect(cards.every((card) => card.origin.length > 0)).toBe(true);
    // 출처 줄에 "?" 같은 표식이 없다 — 학생이 글을 읽고 소문을 가려내야 한다
    expect(cards.every((card) => !card.origin.includes('?'))).toBe(true);
    expect(photo.photo).toBe('stream');
    expect(graph.text).toContain('(가장 큰 원인)');
    // 앞 스테이지 기록이 없어도 fallback 으로 근거 카드가 생긴다
    expect(buildCaptionCards({ graphs: [], photos: [] }).filter((card) => card.sourced)).toHaveLength(8);
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
    state = { ...state, draft: { ...state.draft, captionId: graph.id, level: 95 } };
    expect(airBlock(state, cards)).toBe('audio');
    state = { ...state, draft: { ...state.draft, level: 55 } };
    expect(airBlock(state, cards)).toBeNull();
  });

  it('refuses a sourced caption that does not fit the segment, without penalty', () => {
    let state = airSegment(ready(createBroadcast()), cards); // → 현장 상황: 사진만
    expect(airBlock(ready(state, graph.id), cards)).toBe('unfit');
    expect(airBlock(ready(state, photo.id), cards)).toBeNull();
    state = skipIncident(airSegment(ready(state, photo.id), cards)); // → 원인 설명: 그래프만
    expect(airBlock(ready(state, photo.id), cards)).toBe('unfit');
    expect(airBlock(ready(state, action.id), cards)).toBe('unfit');
    expect(airBlock(ready(state, graph.id), cards)).toBeNull();
    // 출처 없는 카드는 어디서든 나갈 수 있다 (판단은 학생 몫)
    expect(airBlock(ready(state, rumor.id), cards)).toBeNull();
    state = airSegment(ready(state, graph.id), cards); // → 시민 부탁: 행동 카드만
    expect(airBlock(ready(state, graph.id), cards)).toBe('unfit');
    expect(airBlock(ready(state, action.id), cards)).toBeNull();
    expect(state.trust).toBe(100 - 15); // 사고를 그대로 넘겨서 -15, 자막 벌점은 없음
  });

  it('keeps the audio level across segments', () => {
    const state = airSegment(ready(createBroadcast()), cards);
    expect(state.draft).toEqual({ source: null, captionId: null, level: 55 });
  });

  it('offers three cards per segment: two fitting sourced ones and one rumor', () => {
    SEGMENTS.forEach((segment, index) => {
      const picked = segmentCards(cards, index, 42);
      expect(picked).toHaveLength(3);
      expect(picked.filter((card) => !card.sourced).length).toBeGreaterThanOrEqual(1);
      expect(picked.filter((card) => card.sourced).every((card) => segment.fit === 'any' || segment.fit === card.kind)).toBe(true);
    });
    expect(segmentCards(cards, 0, 42)).toEqual(segmentCards(cards, 0, 42));
  });

  it('airing a rumor in v4 drops trust and stays on the same segment', () => {
    const state = airRumor(ready(createBroadcast(), rumor.id));
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(state.corrections).toBe(1);
    expect(state.index).toBe(0);
    expect(state.draft.captionId).toBeNull();
  });

  it('drops trust and forces the next segment into a correction when an unsourced caption airs', () => {
    let state = airSegment(ready(createBroadcast(), rumor.id), cards);
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(state.corrections).toBe(1);
    expect(currentSegment(state)).toBe(CORRECTION_SEGMENT);
    // 정정 방송을 근거 카드로 마치면 원래 순서로 돌아간다
    state = airSegment(ready(state, graph.id), cards);
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(currentSegment(state)?.id).toBe(SEGMENTS[2]!.id);
  });

  it('appends a correction segment when the last segment airs an unsourced caption', () => {
    let state = createBroadcast();
    for (let i = 0; i < SEGMENTS.length - 1; i += 1) state = skipIncident(airSegment(ready(state), cards));
    expect(currentSegment(state)?.id).toBe('action');
    state = airSegment(ready(state, rumor.id), cards);
    expect(isFinished(state)).toBe(false);
    expect(totalSegments(state)).toBe(SEGMENTS.length + 1);
    expect(currentSegment(state)).toBe(CORRECTION_SEGMENT);
    // 덧붙은 정정에서 또 틀리면 벌점만 받고 끝난다
    state = airSegment(ready(state, rumor.id), cards);
    expect(isFinished(state)).toBe(true);
    expect(state.corrections).toBe(2);
  });

  it('plans the single mic incident and raises it after the second segment', () => {
    expect(planIncidents(42)).toEqual(['mic']);
    let state = createBroadcast(42);
    state = airSegment(ready(state), cards);
    expect(state.pendingIncident).toBeNull();
    state = airSegment(ready(state), cards);
    expect(state.pendingIncident).toBe('mic');
    expect(airBlock(ready(state), cards)).toBe('incident');
    const swap = INCIDENTS[0]!.actions.find((a) => a.id === 'mic-swap')!;
    const fixed = resolveIncident(state, swap.id);
    expect(fixed.ap).toBe(AP_BUDGET - 2);
    expect(fixed.trust).toBe(100);
    expect(resolveIncident(state, 'mic-ignore').trust).toBe(85);
  });

  it('finishes after four segments and calls a zero-correction show clean', () => {
    let state = createBroadcast();
    for (let i = 0; i < SEGMENTS.length; i += 1) state = skipIncident(airSegment(ready(state), cards));
    expect(SEGMENTS).toHaveLength(4);
    expect(currentSegment(state)).toBeNull();
    expect(state.trust).toBe(85);
    expect(isCleanBroadcast(state)).toBe(true);
  });

  it('restores a saved state and rejects junk', () => {
    const state = airSegment(ready(createBroadcast(7)), cards);
    expect(restoreBroadcast(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(restoreBroadcast({ index: 'x' })).toBeNull();
    expect(restoreBroadcast(null)).toBeNull();
  });
});

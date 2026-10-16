import { describe, expect, it } from 'vitest';
import {
  AP_BUDGET,
  CORRECTION_SEGMENT,
  INCIDENTS,
  SEGMENTS,
  UNSOURCED_PENALTY,
  acknowledgeIncidentRecovery,
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
  reviewCaption,
  restoreBroadcast,
  segmentCards,
  type BroadcastState,
} from './page08BroadcastModel';

const cards = buildCaptionCards({ graphs: [{ variable: 'logging', verdict: 'main' }], photos: [{ id: 'stream', quality: 'center' }] });
const graph = cards.find((card) => card.id === 'graph-logging')!;
const opening = cards.find((card) => card.id === 'opening-rescue')!;
const photo = cards.find((card) => card.id === 'photo-stream')!;
const action = cards.find((card) => card.kind === 'action')!;
const rumor = cards.find((card) => !card.sourced)!;

/** 현재 세그먼트에 맞는 소스 + 주어진 자막(없으면 맞는 근거 카드) + 알맞은 오디오 */
function ready(state: BroadcastState, captionId?: string): BroadcastState {
  const segment = currentSegment(state)!;
  const fit = captionId ?? cards.find((card) => card.sourced && (segment.fit === 'any' || segment.fit === card.kind))!.id;
  return reviewCaption({ ...state, draft: { source: segment.requiredSource, captionId: fit, level: 55 } }, fit);
}

function skipIncident(state: BroadcastState): BroadcastState {
  return acknowledgeIncidentRecovery(state.pendingIncident ? resolveIncident(state, 'mic-swap') : state);
}

describe('page 8 broadcast model', () => {
  it('builds sourced cards from artifacts and mixes in four unsourced ones that all carry a source line', () => {
    expect(cards.filter((card) => card.sourced).map((card) => card.id)).toEqual(['opening-rescue', 'opening-news', 'opening-help', 'graph-logging', 'graph-noise', 'graph-water', 'photo-logging', 'photo-stream', 'photo-construction', 'action-plant', 'action-noise', 'action-report']);
    expect(cards.filter((card) => !card.sourced)).toHaveLength(4);
    expect(cards.every((card) => card.origin.length > 0)).toBe(true);
    // 출처 줄에 "?" 같은 표식이 없다 — 학생이 글을 읽고 소문을 가려내야 한다
    expect(cards.every((card) => !card.origin.includes('?'))).toBe(true);
    expect(photo.photo).toBe('stream');
    expect(graph.text).not.toMatch(/\([^)]*원인[^)]*\)/);
    expect(graph.announce).not.toMatch(/가장 큰 원인|보조 원인|관련은 적/);
    expect(graph.text).toContain('1마리에서 10마리로 늘었습니다');
    expect(graph.announce).toContain('비교 실험 결과');
    expect(photo.text).toBe('개울 물길이 자재에 막혀 있습니다');
    expect(cards.find((card) => card.id === 'rumor-cat')?.text).toBe('고양이가 새를 잡아먹었다고 합니다');
    // 앞 스테이지 기록이 없어도 fallback 으로 근거 카드가 생긴다
    expect(buildCaptionCards({ graphs: [], photos: [] }).filter((card) => card.sourced)).toHaveLength(12);
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
    state = { ...state, draft: { ...state.draft, captionId: opening.id, level: 95 } };
    expect(airBlock(state, cards)).toBe('audio');
    state = { ...state, draft: { ...state.draft, level: 55 } };
    expect(airBlock(state, cards)).toBeNull();
    expect(state.reviewedCaptionIds).toEqual([]);
    state = reviewCaption(state, opening.id);
    expect(state.reviewedCaptionIds).toEqual([opening.id]);
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
    // 이전 저장에 남은 확인 안 된 말은 조사 단계에서 정정할 수 있다.
    expect(airBlock(ready(state, rumor.id), cards)).toBeNull();
    state = airSegment(ready(state, graph.id), cards); // → 시민 부탁: 행동 카드만
    expect(airBlock(ready(state, graph.id), cards)).toBe('unfit');
    expect(airBlock(ready(state, action.id), cards)).toBeNull();
    expect(airBlock(ready(state, rumor.id), cards)).toBe('unfit');
    expect(state.trust).toBe(100); // 마이크를 고치고 맞는 자막을 보내 신뢰가 유지됨
  });

  it('keeps the audio level across segments', () => {
    const state = airSegment(ready(createBroadcast()), cards);
    expect(state.draft).toEqual({ source: null, captionId: null, level: 55 });
  });

  it('offers three relevant sourced choices for each broadcast purpose without forced rumors', () => {
    SEGMENTS.forEach((segment, index) => {
      const picked = segmentCards(cards, index, 42);
      expect(picked).toHaveLength(3);
      expect(picked.every((card) => card.sourced)).toBe(true);
      expect(picked.filter((card) => card.sourced).every((card) => segment.fit === 'any' || segment.fit === card.kind)).toBe(true);
    });
    expect(segmentCards(cards, 0, 42)).toEqual(segmentCards(cards, 0, 42));
    expect(segmentCards(cards, 0).map((card) => card.id).sort()).toEqual(['opening-help', 'opening-news', 'opening-rescue']);
    expect(segmentCards(cards, 1).map((card) => card.id).sort()).toEqual(['photo-construction', 'photo-logging', 'photo-stream']);
    expect(segmentCards(cards, 2).map((card) => card.id).sort()).toEqual(['graph-logging', 'graph-noise', 'graph-water']);
    expect(segmentCards(cards, 3).map((card) => card.id).sort()).toEqual(['action-noise', 'action-plant', 'action-report']);
    expect(airBlock(ready(createBroadcast(), graph.id), cards)).toBe('unfit');
  });

  it('airs every normal order without opening investigation details and accepts each actual comparison result', () => {
    let state = createBroadcast();
    for (let index = 0; index < SEGMENTS.length; index += 1) {
      const options = segmentCards(cards, index, 42);
      for (const caption of options) {
        const draft = { ...ready(state, caption.id), reviewedCaptionIds: [] };
        expect(airBlock(draft, cards)).toBeNull();
      }
      state = skipIncident(airSegment({ ...ready(state, options[0]!.id), reviewedCaptionIds: [] }, cards));
    }
    expect(isFinished(state)).toBe(true);
    expect(state.index).toBe(4);
    expect(state.log.map((entry) => entry.segmentId)).toEqual(SEGMENTS.map((segment) => segment.id));
  });

  it('uses actual trial numbers and labels only the missing photos or comparisons as practice', () => {
    const recorded = buildCaptionCards({ graphs: [{ variable: 'logging', verdict: 'main' }], photos: [{ id: 'stream', quality: 'center' }] }, [{ variable: 'logging', from: 3, to: 9, before: 4, after: 9 }]);
    expect(recorded.find((card) => card.id === 'graph-logging')).toMatchObject({ text: '먹이나무를 늘리자 새가 4마리에서 9마리로 늘었습니다', evidenceLabel: '내 탐험 기록' });
    expect(recorded.find((card) => card.id === 'graph-noise')).toMatchObject({ evidenceLabel: '연습 자료' });
    expect(recorded.find((card) => card.id === 'photo-stream')).toMatchObject({ evidenceLabel: '내 탐험 기록' });
    expect(recorded.find((card) => card.id === 'photo-logging')).toMatchObject({ evidenceLabel: '연습 자료' });
  });

  it.each([0, 3, 4])('offers usable factual corrections for legacy pending corrections at index %i', (index) => {
    const state = restoreBroadcast({ ...createBroadcast(), index, pendingCorrection: 'retired-rumor-card', corrections: 1, trust: 80 })!;
    const options = segmentCards(cards, index, 42, currentSegment(state)?.id === 'correction');
    expect(options).toHaveLength(3);
    expect(options.every((card) => card.sourced && ['graph', 'photo'].includes(card.kind))).toBe(true);
    const draft = { ...ready(state, options[0]!.id), reviewedCaptionIds: [] };
    expect(airBlock(draft, cards)).toBeNull();
    const corrected = airSegment(draft, cards);
    expect(corrected).toMatchObject({ index, pendingCorrection: null, trust: 100 });
    expect(corrected.correctionLog).toEqual([{ from: 'retired-rumor-card', to: options[0]!.id }]);
    expect(currentSegment(corrected)?.id ?? null).toBe(SEGMENTS[index]?.id ?? null);
  });

  it.each([3, 4])('clears an older correction queue at index %i instead of looping after reload', (index) => {
    const state = restoreBroadcast({ ...createBroadcast(), index, correctionAt: [index], trust: 80 })!;
    expect(currentSegment(state)).toBe(CORRECTION_SEGMENT);
    const corrected = airSegment(ready(state, graph.id), cards);
    expect(corrected).toMatchObject({ index, correctionAt: [], pendingCorrection: null });
    expect(currentSegment(restoreBroadcast(JSON.parse(JSON.stringify(corrected)))!)?.id ?? null).toBe(SEGMENTS[index]?.id ?? null);
  });

  it('airing a rumor in v4 drops trust and stays on the same segment', () => {
    const state = airRumor(ready(createBroadcast(), rumor.id));
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(state.corrections).toBe(1);
    expect(state.index).toBe(0);
    expect(state.draft.captionId).toBeNull();
  });

  it('allows optional investigation reading and corrects the broadcast without skipping the original segment', () => {
    let state = airSegment(ready(createBroadcast(), rumor.id), cards);
    expect(state.trust).toBe(100 - UNSOURCED_PENALTY);
    expect(state.corrections).toBe(1);
    expect(currentSegment(state)).toBe(CORRECTION_SEGMENT);
    expect(state.index).toBe(0);
    const unreviewed = { ...ready(state, graph.id), reviewedCaptionIds: [] };
    expect(airBlock(unreviewed, cards)).toBeNull();
    // 정정 방송을 근거 카드로 마치면 원래 순서로 돌아간다
    state = airSegment(unreviewed, cards);
    expect(state.trust).toBe(100);
    expect(currentSegment(state)?.id).toBe(SEGMENTS[0]!.id);
    expect(state.correctionLog).toEqual([{ from: rumor.id, to: graph.id }]);
    expect(state.corrections).toBe(1);
  });

  it('restores a legacy correction at the final request, requires correction, and resumes the request', () => {
    let state = createBroadcast();
    for (let i = 0; i < SEGMENTS.length - 1; i += 1) state = skipIncident(airSegment(ready(state), cards));
    expect(currentSegment(state)?.id).toBe('action');
    state = restoreBroadcast({ ...state, pendingCorrection: rumor.id, corrections: 1, trust: 80 })!;
    expect(isFinished(state)).toBe(false);
    expect(state.index).toBe(SEGMENTS.length - 1);
    expect(currentSegment(state)).toBe(CORRECTION_SEGMENT);
    // 정정에서도 소문을 내보내면 원래 순서가 유지되고 계속 바로잡아야 한다.
    state = airSegment(ready(state, rumor.id), cards);
    expect(isFinished(state)).toBe(false);
    expect(state.corrections).toBe(2);
    state = airSegment(ready(state, graph.id), cards);
    expect(currentSegment(state)?.id).toBe('action');
    expect(state.trust).toBeLessThanOrEqual(100);
    state = airSegment(ready(state, action.id), cards);
    expect(isFinished(state)).toBe(true);
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

  it('keeps the repaired broadcast on a recovery screen until acknowledged without double charging or skipping news', () => {
    const incident = airSegment(ready(airSegment(ready(createBroadcast()), cards)), cards);
    const fixed = resolveIncident(incident, 'mic-swap');
    expect(fixed).toMatchObject({ index: 2, pendingIncident: null, pendingRecovery: 'mic', ap: AP_BUDGET - 2, trust: 100 });
    expect(fixed.log).toEqual(incident.log);
    expect(fixed.incidentLog).toEqual([{ incidentId: 'mic', actionId: 'mic-swap' }]);
    expect(resolveIncident(fixed, 'mic-swap')).toBe(fixed);
    expect(resolveIncident(fixed, 'mic-ignore')).toBe(fixed);
    const blocked = ready(fixed);
    expect(airBlock(blocked, cards)).toBe('incident');
    expect(airSegment(blocked, cards)).toBe(blocked);
    const resumed = acknowledgeIncidentRecovery(fixed);
    expect(resumed).toEqual({ ...fixed, pendingRecovery: null });
    expect(currentSegment(resumed)?.id).toBe('cause');
    expect(acknowledgeIncidentRecovery(resumed)).toBe(resumed);
    expect(airBlock(ready(resumed), cards)).toBeNull();
    expect(airSegment(ready(resumed), cards).index).toBe(3);
  });

  it('leaves an ignored mic broken, charges its penalty once, and lets the student repair it', () => {
    const incident = airSegment(ready(airSegment(ready(createBroadcast()), cards)), cards);
    const ignored = resolveIncident(incident, 'mic-ignore');
    expect(ignored).toMatchObject({ index: 2, pendingIncident: 'mic', pendingRecovery: null, ap: AP_BUDGET, trust: 85 });
    expect(ignored.incidentLog).toEqual([{ incidentId: 'mic', actionId: 'mic-ignore' }]);
    expect(resolveIncident(ignored, 'mic-ignore')).toBe(ignored);
    expect(acknowledgeIncidentRecovery(ignored)).toBe(ignored);
    const blocked = ready(ignored);
    expect(airSegment(blocked, cards)).toBe(blocked);
    const fixed = resolveIncident(ignored, 'mic-swap');
    expect(fixed).toMatchObject({ index: 2, pendingIncident: null, pendingRecovery: 'mic', ap: AP_BUDGET - 2, trust: 85 });
    expect(fixed.incidentLog).toEqual([{ incidentId: 'mic', actionId: 'mic-ignore' }, { incidentId: 'mic', actionId: 'mic-swap' }]);
    expect(fixed.log).toEqual(incident.log);
    expect(acknowledgeIncidentRecovery(fixed)).toEqual({ ...fixed, pendingRecovery: null });
  });

  it('restores the recovery screen and ignored retry without replaying costs or advancing the broadcast', () => {
    const incident = airSegment(ready(airSegment(ready(createBroadcast()), cards)), cards);
    const ignored = resolveIncident(incident, 'mic-ignore');
    const restoredIgnore = restoreBroadcast(JSON.parse(JSON.stringify(ignored)))!;
    expect(resolveIncident(restoredIgnore, 'mic-ignore')).toBe(restoredIgnore);
    const fixed = resolveIncident(restoredIgnore, 'mic-swap');
    const restored = restoreBroadcast(JSON.parse(JSON.stringify(fixed)))!;
    expect(restored).toEqual(fixed);
    expect(airBlock(ready(restored), cards)).toBe('incident');
    expect(resolveIncident(restored, 'mic-swap')).toBe(restored);
    expect(acknowledgeIncidentRecovery(restored)).toEqual({ ...fixed, pendingRecovery: null });
  });

  it('preserves legacy completed shows without adding a retrospective recovery and sanitizes malformed recovery states', () => {
    let completed = createBroadcast();
    for (let i = 0; i < SEGMENTS.length; i += 1) completed = skipIncident(airSegment(ready(completed), cards));
    const legacy = JSON.parse(JSON.stringify(completed));
    delete legacy.pendingRecovery;
    expect(restoreBroadcast(legacy)).toEqual(completed);
    expect(isFinished(restoreBroadcast(legacy)!)).toBe(true);
    for (const pendingRecovery of ['unknown', true, {}, []]) {
      expect(restoreBroadcast({ ...createBroadcast(), pendingRecovery })?.pendingRecovery).toBeNull();
    }
    expect(restoreBroadcast({ ...createBroadcast(), pendingIncident: 'mic', pendingRecovery: 'mic' })).toMatchObject({ pendingIncident: 'mic', pendingRecovery: null });
  });

  it('finishes after four segments and calls a zero-correction show clean', () => {
    let state = createBroadcast();
    for (let i = 0; i < SEGMENTS.length; i += 1) state = skipIncident(airSegment(ready(state), cards));
    expect(SEGMENTS).toHaveLength(4);
    expect(currentSegment(state)).toBeNull();
    expect(state.trust).toBe(100);
    expect(isCleanBroadcast(state)).toBe(true);
  });

  it('restores a saved state and rejects junk', () => {
    const state = airSegment(ready(createBroadcast(7)), cards);
    expect(restoreBroadcast(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(restoreBroadcast({ index: 'x' })).toBeNull();
    expect(restoreBroadcast(null)).toBeNull();
  });

  it('preserves an unfinished correction on reload and labels fallback evidence as practice', () => {
    const pending = airSegment(ready(createBroadcast(), rumor.id), cards);
    expect(restoreBroadcast(JSON.parse(JSON.stringify(pending)))).toEqual(pending);
    const practice = buildCaptionCards({ photos: [], graphs: [] });
    expect(practice.filter((card) => card.sourced).every((card) => card.evidenceLabel === '연습 자료')).toBe(true);
    const recorded = buildCaptionCards({ photos: [{ id: 'stream', quality: 'edge' }], graphs: [{ variable: 'logging', verdict: 'main' }], careLog: [{ bird: 'red', issue: '탈수', treatment: '물' }] }, [{ variable: 'logging', from: 3, to: 9, before: 1, after: 10 }]);
    expect(recorded.find((card) => card.id === 'graph-logging')?.evidence?.join(' ')).toContain('1마리 → 10마리');
    expect(recorded.find((card) => card.id === 'photo-stream')?.evidence?.join(' ')).toContain('가장자리');
    expect(recorded.find((card) => card.id === 'action-report')?.evidence?.join(' ')).toContain('앵자: 탈수 → 물');
  });
});

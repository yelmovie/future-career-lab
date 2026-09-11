import { describe, expect, it } from 'vitest';
import { buildBroadcastReplay } from './broadcastReplayModel';
import {
  acknowledgeIncidentRecovery,
  airSegment,
  buildCaptionCards,
  createBroadcast,
  currentSegment,
  resolveIncident,
  restoreBroadcast,
  type AirLog,
  type BroadcastState,
  type CaptionCard,
} from './page08BroadcastModel';

const cards = buildCaptionCards({ graphs: [], photos: [] }, [
  { variable: 'water', from: 1, to: 8, before: 3, after: 8 },
]);

function air(state: BroadcastState, captionId: string): BroadcastState {
  const segment = currentSegment(state)!;
  const sent = airSegment({ ...state, draft: { source: segment.requiredSource, captionId, level: 55 } }, cards);
  return sent.pendingIncident ? acknowledgeIncidentRecovery(resolveIncident(sent, 'mic-swap')) : sent;
}

const causeLog: AirLog = { segmentId: 'cause', title: '조사 결과', source: 'studio', captionId: 'graph-water', sourced: true };

describe('broadcast replay', () => {
  it('replays only the captions actually aired, in the original log order with their selected screens', () => {
    let state = createBroadcast();
    const choices = ['opening-help', 'photo-stream', 'graph-water', 'action-report'];
    for (const captionId of choices) state = air(state, captionId);
    const before = JSON.stringify({ state, cards });

    const replay = buildBroadcastReplay(state, cards);

    expect(replay.map((entry) => entry.caption.id)).toEqual(choices);
    expect(replay.map((entry) => entry.source)).toEqual(['studio', 'drone', 'studio', 'reporter']);
    expect(replay.map((entry) => entry.title)).toEqual(state.log.map((entry) => entry.title));
    for (const entry of replay) {
      expect(entry.caption).toBe(cards.find((card) => card.id === entry.caption.id));
      expect(entry.announcement).toBe(entry.caption.announce);
    }
    expect(new Set(replay.map((entry) => entry.id)).size).toBe(replay.length);
    expect(JSON.stringify({ state, cards })).toBe(before);
  });

  it('keeps the student comparison numbers and wording rather than substituting the default result', () => {
    const [entry] = buildBroadcastReplay({ log: [causeLog] }, cards);
    expect(entry?.announcement).toBe(cards.find((card) => card.id === 'graph-water')?.announce);
    expect(entry?.announcement).toContain('3마리에서 8마리로 늘었습니다');
    expect(entry?.caption.evidenceLabel).toBe('내 탐험 기록');
    expect(entry?.announcement).not.toContain('1마리에서');
  });

  it('keeps corrections where they aired, introduces the correction, and resumes the selected news', () => {
    let state = air(createBroadcast(), 'opening-news');
    state = air(state, 'rumor-back');
    state = air(state, 'graph-water');
    state = air(state, 'photo-construction');
    const replay = buildBroadcastReplay(state, cards);

    expect(replay.map((entry) => entry.caption.id)).toEqual(['opening-news', 'graph-water', 'photo-construction']);
    expect(replay[1]).toMatchObject({ title: '정정 방송', source: 'studio' });
    expect(replay[1]?.announcement).toBe(`앞서 확인되지 않은 말을 전해 바로잡습니다. ${cards.find((card) => card.id === 'graph-water')?.announce}`);
    expect(replay[2]?.announcement).not.toContain('바로잡습니다');
    expect(replay.map((entry) => entry.caption.id)).not.toContain('rumor-back');
  });

  it('does not fabricate missing legacy broadcasts from progress, a draft, or a default card', () => {
    expect(buildBroadcastReplay(undefined, cards)).toEqual([]);
    expect(buildBroadcastReplay(null, cards)).toEqual([]);
    expect(buildBroadcastReplay({}, cards)).toEqual([]);
    expect(buildBroadcastReplay({ log: [] }, cards)).toEqual([]);

    const restored = restoreBroadcast({
      ...createBroadcast(), index: 4,
      draft: { source: 'reporter', captionId: 'action-noise', level: 55 },
      log: [{ segmentId: 'opening', title: '첫 인사', source: 'studio', sourced: true }, causeLog],
    });
    expect(buildBroadcastReplay(restored, cards).map((entry) => entry.caption.id)).toEqual(['graph-water']);
    expect(buildBroadcastReplay(restored, [])).toEqual([]);
  });

  it('skips malformed, unknown, unsourced, or mismatched entries while retaining good ones', () => {
    const restored = restoreBroadcast({
      ...createBroadcast(),
      log: [
        null, 'old text log', {},
        { ...causeLog, segmentId: 'retired-segment' },
        { ...causeLog, source: 'unknown-camera' },
        { ...causeLog, source: 'drone' },
        { ...causeLog, title: ' ' },
        { ...causeLog, captionId: 'missing-caption' },
        { ...causeLog, captionId: 'action-plant' },
        { ...causeLog, captionId: 'rumor-back', sourced: false },
        { ...causeLog, captionId: 'rumor-back', sourced: true },
        { ...causeLog, sourced: false },
        causeLog,
      ],
    });
    expect(buildBroadcastReplay(restored, cards).map((entry) => entry.caption.id)).toEqual(['graph-water']);
  });

  it('keeps repeated actual broadcasts as separate entries rather than reordering or deduplicating them', () => {
    const correction = { ...causeLog, segmentId: 'correction', title: '정정 방송' };
    const replay = buildBroadcastReplay({ log: [correction, causeLog, correction] }, cards);
    expect(replay.map((entry) => entry.title)).toEqual(['정정 방송', '조사 결과', '정정 방송']);
    expect(new Set(replay.map((entry) => entry.id)).size).toBe(3);
  });

  it('uses the chosen card text if it has no announcement and gives longer subtitles more reading time', () => {
    const short: CaptionCard = { id: 'short', text: '숲 소식입니다.', sourced: true, kind: 'graph', origin: '조사 그래프' };
    const medium: CaptionCard = { ...short, id: 'medium', announce: '물을 채우자 새가 세 마리에서 여덟 마리로 늘었습니다. 함께 숲을 도와주세요.' };
    const long: CaptionCard = { ...short, id: 'long', announce: '새들을 함께 도와주세요. '.repeat(12) };
    const replay = buildBroadcastReplay({ log: [short, medium, long].map((card) => ({ ...causeLog, captionId: card.id })) }, [short, medium, long]);

    expect(replay[0]?.announcement).toBe(short.text);
    expect(replay[0]?.durationMs).toBe(7_000);
    expect(replay[1]!.durationMs).toBeGreaterThan(replay[0]!.durationMs);
    expect(replay[2]?.durationMs).toBe(16_000);
    expect(replay.every((entry) => entry.durationMs >= 7_000 && entry.durationMs <= 16_000)).toBe(true);
  });
});

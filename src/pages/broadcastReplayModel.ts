import {
  CORRECTION_SEGMENT,
  SEGMENTS,
  captionFits,
  type BroadcastState,
  type CaptionCard,
  type SourceId,
} from './page08BroadcastModel';

export interface BroadcastReplayEntry {
  id: string;
  title: string;
  source: SourceId;
  caption: CaptionCard;
  announcement: string;
  durationMs: number;
}

const CORRECTION_INTRO = '앞서 확인되지 않은 말을 전해 바로잡습니다. ';

/** 선택 중인 자막이나 빠진 순서를 채우지 않고, 실제로 송출한 기록만 재생한다. */
export function buildBroadcastReplay(
  state: Partial<Pick<BroadcastState, 'log'>> | null | undefined,
  cards: readonly CaptionCard[],
): BroadcastReplayEntry[] {
  if (!Array.isArray(state?.log)) return [];

  return state.log.flatMap((entry, index): BroadcastReplayEntry[] => {
    // 이전 저장의 log는 복원 시 개별 항목까지 검사하지 않으므로 여기서 확인한다.
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || typeof entry.segmentId !== 'string' || typeof entry.captionId !== 'string'
      || typeof entry.title !== 'string' || !entry.title.trim() || entry.sourced !== true) return [];

    const segment = entry.segmentId === CORRECTION_SEGMENT.id
      ? CORRECTION_SEGMENT : SEGMENTS.find((item) => item.id === entry.segmentId);
    const caption = cards.find((card) => card.id === entry.captionId);
    if (!segment || entry.source !== segment.requiredSource || !caption?.sourced
      || !captionFits(segment, caption) || typeof caption.text !== 'string' || !caption.text.trim()) return [];

    const text = typeof caption.announce === 'string' && caption.announce.trim()
      ? caption.announce : caption.text;
    const announcement = `${entry.segmentId === CORRECTION_SEGMENT.id ? CORRECTION_INTRO : ''}${text}`;
    // 한글 한 글자당 약 0.2초와 장면을 살펴볼 2초를 주되, 짧은 말도 7초는 유지한다.
    const durationMs = Math.max(7_000, Math.min(16_000, 2_000 + Array.from(announcement).length * 200));
    return [{
      id: `broadcast-${index}-${entry.segmentId}-${caption.id}`,
      title: entry.title,
      source: entry.source,
      caption,
      announcement,
      durationMs,
    }];
  });
}

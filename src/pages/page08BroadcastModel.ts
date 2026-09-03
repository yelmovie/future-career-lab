import type { Artifacts, CauseId, PhotoId } from '../shared/types';

export type SourceId = 'drone' | 'studio' | 'reporter';

export interface Segment {
  id: string;
  title: string;
  requiredSource: SourceId;
  /** 세그먼트가 무엇을 보여줘야 하는지 — 소스 힌트 */
  need: string;
}

export const SOURCE_LABEL: Record<SourceId, string> = { drone: '드론 사진', studio: '스튜디오 카메라', reporter: '현장 리포터' };

export const SEGMENTS: readonly Segment[] = [
  { id: 'opening', title: '오프닝', requiredSource: 'studio', need: '진행자가 스튜디오에서 사건을 소개해' },
  { id: 'scene', title: '현장 상황', requiredSource: 'drone', need: '숲이 어떻게 변했는지 위에서 찍은 사진을 보여줘' },
  { id: 'cause', title: '원인 설명', requiredSource: 'studio', need: '스튜디오에서 그래프를 차분히 설명해' },
  { id: 'interview', title: '전문가 인터뷰', requiredSource: 'reporter', need: '현장 리포터가 연구가에게 직접 물어봐' },
  { id: 'action', title: '시민 행동 안내', requiredSource: 'reporter', need: '현장에서 시민이 할 수 있는 일을 알려줘' },
  { id: 'closing', title: '클로징', requiredSource: 'studio', need: '스튜디오에서 방송을 마무리해' },
];

export const CORRECTION_SEGMENT: Segment = {
  id: 'correction',
  title: '정정 방송',
  requiredSource: 'studio',
  need: '출처 없는 자막이 나갔어. 스튜디오에서 근거 있는 자막으로 바로잡아야 해',
};

export interface CaptionCard {
  id: string;
  text: string;
  sourced: boolean;
  /** 출처 표기 — 출처 없는 카드는 빈 문자열 */
  origin: string;
}

const GRAPH_TEXT: Record<CauseId, string> = {
  logging: '먹이나무가 줄면 앵무새도 줄어요',
  noise: '소음이 커지면 앵무새가 자리를 떠나요',
  water: '물이 줄면 앵무새가 살기 어려워요',
};
const VERDICT_TEXT = { main: '가장 큰 원인', sub: '보조 원인', none: '관련 적음' } as const;

const PHOTO_TEXT: Record<PhotoId, string> = {
  logging: '숲 가장자리 나무가 잘려 나갔어요',
  stream: '개울 물길이 자재에 막혀 있어요',
  construction: '숲 옆에서 공사가 진행 중이에요',
};

export const UNSOURCED_CARDS: readonly CaptionCard[] = [
  { id: 'rumor-city', text: '앵무새가 도시로 도망갔대요', sourced: false, origin: '' },
  { id: 'rumor-cat', text: '고양이가 앵무새를 다 잡아먹었대요', sourced: false, origin: '' },
  { id: 'rumor-back', text: '앵무새는 곧 저절로 돌아온대요', sourced: false, origin: '' },
];

export const ALL_PHOTOS: PhotoId[] = ['logging', 'stream', 'construction'];

/** S3 그래프 + S1 사진 캡션(근거 있음) + 출처 없는 카드 3장. 앞 스테이지 기록이 없으면 전부 fallback. */
export function buildCaptionCards(artifacts: Pick<Artifacts, 'graphs' | 'photos'>): CaptionCard[] {
  const graphs = artifacts.graphs.length ? artifacts.graphs : (['logging', 'noise', 'water'] as CauseId[]).map((variable) => ({ variable, verdict: 'sub' as const }));
  const photos = photoIds(artifacts.photos);
  const sourced: CaptionCard[] = [
    ...graphs.map((graph) => ({ id: `graph-${graph.variable}`, text: `${GRAPH_TEXT[graph.variable]} (${VERDICT_TEXT[graph.verdict]})`, sourced: true, origin: '조사 그래프' })),
    ...photos.map((id) => ({ id: `photo-${id}`, text: PHOTO_TEXT[id], sourced: true, origin: '드론 사진' })),
  ];
  // 카드 순서를 섞되 결정적으로: 근거/출처없음을 번갈아 배치해 위치만으로 못 고르게 한다.
  const mixed: CaptionCard[] = [];
  const rumors = [...UNSOURCED_CARDS];
  sourced.forEach((card, index) => {
    mixed.push(card);
    if (index % 2 === 0 && rumors.length) mixed.push(rumors.shift()!);
  });
  return [...mixed, ...rumors];
}

export function photoIds(photos: Artifacts['photos']): PhotoId[] {
  const ids = photos.map((photo) => photo.id).filter((id, index, list) => list.indexOf(id) === index);
  return ids.length ? ids : ALL_PHOTOS;
}

/** 오디오 레벨 0~100. 초록 구간 안이어야 송출 가능. */
export const AUDIO_BAND = { low: 40, high: 72 } as const;
export type AudioZone = 'quiet' | 'ok' | 'clip';
export function audioZone(level: number): AudioZone {
  if (level < AUDIO_BAND.low) return 'quiet';
  if (level > AUDIO_BAND.high) return 'clip';
  return 'ok';
}

export interface IncidentAction { id: string; label: string; cost: number; trustDelta: number; note: string }
export interface Incident { id: string; title: string; signal: string; actions: readonly IncidentAction[] }

/** 예산 AP 3. 근본 해결(2)을 두 번은 못 하니 어디에 힘을 쓸지 골라야 한다. */
export const INCIDENTS: readonly Incident[] = [
  { id: 'mic', title: '마이크 끊김', signal: '리포터 목소리가 갑자기 안 들려.', actions: [
    { id: 'mic-swap', label: '예비 마이크로 바꾸기', cost: 2, trustDelta: 0, note: '소리가 바로 돌아왔어.' },
    { id: 'mic-caption', label: '자막으로 대신 전하기', cost: 1, trustDelta: -5, note: '소리는 없지만 내용은 전해졌어.' },
    { id: 'mic-ignore', label: '그대로 두기', cost: 0, trustDelta: -15, note: '시청자가 무슨 말인지 몰라 채널을 돌렸어.' },
  ] },
  { id: 'delay', title: '영상 지연', signal: '현장 화면이 3초 늦게 들어와.', actions: [
    { id: 'delay-studio', label: '스튜디오로 잠시 넘기기', cost: 2, trustDelta: 0, note: '진행자가 자연스럽게 시간을 벌었어.' },
    { id: 'delay-still', label: '사진으로 채우기', cost: 1, trustDelta: -5, note: '화면은 멈췄지만 방송은 이어졌어.' },
    { id: 'delay-ignore', label: '그대로 두기', cost: 0, trustDelta: -15, note: '화면이 뚝뚝 끊겨 보였어.' },
  ] },
  { id: 'tip', title: '잘못된 제보', signal: '"앵무새가 학교에 나타났다"는 제보가 왔는데 확인이 안 돼.', actions: [
    { id: 'tip-verify', label: '확인 전엔 내보내지 않기', cost: 2, trustDelta: 0, note: '확인해 보니 다른 새였어. 잘 참았어.' },
    { id: 'tip-hedge', label: '"확인 중"이라고 붙여 내보내기', cost: 1, trustDelta: -5, note: '틀린 정보는 아니지만 시청자가 헷갈렸어.' },
    { id: 'tip-air', label: '바로 속보로 내보내기', cost: 0, trustDelta: -15, note: '틀린 속보였어. 정정이 필요해.' },
  ] },
];
export const AP_BUDGET = 3;
/** 이 세그먼트 인덱스를 송출한 직후 사고가 난다 (두 번). */
export const INCIDENT_AFTER: Record<number, string> = { 1: 'mic', 3: 'tip' };

export const TRUST_START = 100;
export const UNSOURCED_PENALTY = 20;

export interface Draft { source: SourceId | null; captionId: string | null; level: number }
export interface AirLog { segmentId: string; title: string; source: SourceId; captionId: string; sourced: boolean }
export interface BroadcastState {
  index: number;
  trust: number;
  corrections: number;
  correctionAt: number[];
  ap: number;
  pendingIncident: string | null;
  incidentLog: { incidentId: string; actionId: string }[];
  log: AirLog[];
  draft: Draft;
}

export const EMPTY_DRAFT: Draft = { source: null, captionId: null, level: 20 };

export function createBroadcast(): BroadcastState {
  return { index: 0, trust: TRUST_START, corrections: 0, correctionAt: [], ap: AP_BUDGET, pendingIncident: null, incidentLog: [], log: [], draft: { ...EMPTY_DRAFT } };
}

export function currentSegment(state: BroadcastState): Segment | null {
  if (state.index >= SEGMENTS.length) return null;
  return state.correctionAt.includes(state.index) ? CORRECTION_SEGMENT : SEGMENTS[state.index]!;
}

export function isFinished(state: BroadcastState): boolean {
  return state.index >= SEGMENTS.length;
}

export type AirBlock = 'source' | 'wrong-source' | 'caption' | 'audio' | 'incident' | 'finished';

/** 송출을 막는 첫 번째 이유. null 이면 송출 가능. */
export function airBlock(state: BroadcastState, cards: readonly CaptionCard[]): AirBlock | null {
  const segment = currentSegment(state);
  if (!segment) return 'finished';
  if (state.pendingIncident) return 'incident';
  const { source, captionId, level } = state.draft;
  if (!source) return 'source';
  if (source !== segment.requiredSource) return 'wrong-source';
  if (!captionId || !cards.some((card) => card.id === captionId)) return 'caption';
  if (audioZone(level) !== 'ok') return 'audio';
  return null;
}

export function trustAfterCaption(trust: number, sourced: boolean): number {
  return sourced ? trust : Math.max(0, trust - UNSOURCED_PENALTY);
}

/** 출처 없는 자막 → 신뢰 하락 + 다음 세그먼트 강제 정정. 정정 방송에서도 또 틀리면 또 정정. */
export function airSegment(state: BroadcastState, cards: readonly CaptionCard[]): BroadcastState {
  if (airBlock(state, cards)) return state;
  const segment = currentSegment(state)!;
  const card = cards.find((item) => item.id === state.draft.captionId)!;
  const nextIndex = state.index + 1;
  const correctionAt = !card.sourced && nextIndex < SEGMENTS.length && !state.correctionAt.includes(nextIndex)
    ? [...state.correctionAt, nextIndex]
    : state.correctionAt;
  const incidentId = INCIDENT_AFTER[state.index] ?? null;
  return {
    ...state,
    index: nextIndex,
    trust: trustAfterCaption(state.trust, card.sourced),
    corrections: state.corrections + (card.sourced ? 0 : 1),
    correctionAt,
    pendingIncident: incidentId && !state.incidentLog.some((entry) => entry.incidentId === incidentId) ? incidentId : null,
    log: [...state.log, { segmentId: segment.id, title: segment.title, source: state.draft.source!, captionId: card.id, sourced: card.sourced }],
    draft: { ...EMPTY_DRAFT },
  };
}

export function resolveIncident(state: BroadcastState, actionId: string): BroadcastState {
  const incident = INCIDENTS.find((item) => item.id === state.pendingIncident);
  const action = incident?.actions.find((item) => item.id === actionId);
  if (!incident || !action || action.cost > state.ap) return state;
  return {
    ...state,
    ap: state.ap - action.cost,
    trust: Math.max(0, Math.min(100, state.trust + action.trustDelta)),
    pendingIncident: null,
    incidentLog: [...state.incidentLog, { incidentId: incident.id, actionId }],
  };
}

export function clipResult(state: BroadcastState): { trust: number; corrections: number } {
  return { trust: state.trust, corrections: state.corrections };
}

export const isCleanBroadcast = (state: BroadcastState) => isFinished(state) && state.corrections === 0;

/** 저장 데이터 복원 — 모양이 어긋나면 null (새로 시작). */
export function restoreBroadcast(value: unknown): BroadcastState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.index !== 'number' || typeof raw.trust !== 'number' || typeof raw.corrections !== 'number' || typeof raw.ap !== 'number') return null;
  if (!Array.isArray(raw.log) || !Array.isArray(raw.correctionAt) || !Array.isArray(raw.incidentLog)) return null;
  const draft = (raw.draft && typeof raw.draft === 'object' ? raw.draft : {}) as Partial<Draft>;
  return {
    index: raw.index,
    trust: raw.trust,
    corrections: raw.corrections,
    correctionAt: raw.correctionAt.filter((item): item is number => typeof item === 'number'),
    ap: raw.ap,
    pendingIncident: typeof raw.pendingIncident === 'string' ? raw.pendingIncident : null,
    incidentLog: raw.incidentLog as BroadcastState['incidentLog'],
    log: raw.log as AirLog[],
    draft: {
      source: draft.source === 'drone' || draft.source === 'studio' || draft.source === 'reporter' ? draft.source : null,
      captionId: typeof draft.captionId === 'string' ? draft.captionId : null,
      level: typeof draft.level === 'number' ? draft.level : EMPTY_DRAFT.level,
    },
  };
}

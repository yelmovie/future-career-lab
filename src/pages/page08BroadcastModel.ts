import type { Artifacts, CauseId, PhotoId } from '../shared/types';
import { seededShuffle } from '../shared/rng';
import { applyAction, type Trial } from './page07EcologyModel';

export type SourceId = 'drone' | 'studio' | 'reporter';
export type CardKind = 'opening' | 'graph' | 'photo' | 'action' | 'rumor';
/** 세그먼트가 받아 주는 자막 종류. any = 출처만 있으면 됨. */
export type CaptionFit = 'opening' | 'graph' | 'photo' | 'action' | 'any';

export interface Segment {
  id: string;
  title: string;
  requiredSource: SourceId;
  /** 무엇이 필요한지만 말한다 — 소스 이름은 학생이 추론 */
  need: string;
  fit: CaptionFit;
}

export const SOURCE_LABEL: Record<SourceId, string> = { drone: '드론 사진', studio: '스튜디오 카메라', reporter: '현장 리포터' };

export const SEGMENTS: readonly Segment[] = [
  { id: 'opening', title: '첫 인사', requiredSource: 'studio', need: '인사를 하고 오늘 전할 숲 소식을 소개해', fit: 'opening' },
  { id: 'scene', title: '현장 보여주기', requiredSource: 'drone', need: '사진으로 숲이 지금 어떤지 보여 줘', fit: 'photo' },
  { id: 'cause', title: '조사 결과', requiredSource: 'studio', need: '무엇을 바꿨고 새 수가 어떻게 달라졌는지 전해 줘', fit: 'graph' },
  { id: 'action', title: '시민 부탁', requiredSource: 'reporter', need: '시민에게 도움을 요청해', fit: 'action' },
];

export const CORRECTION_SEGMENT: Segment = {
  id: 'correction',
  title: '정정 방송',
  requiredSource: 'studio',
  need: '출처 없는 자막이 나갔어. 근거 있는 자막으로 바로잡아야 해',
  fit: 'any',
};

/** 소스가 틀렸을 때 기본 되묻기. 화면(Page08Broadcast)은 세그먼트·소스별 더 구체적인 힌트를 먼저 쓴다. */
export const SOURCE_QUESTION = '지금 필요한 화면이 뭘까? 진행자, 숲 사진, 현장 리포터 중에서 골라 봐.';
export const UNFIT_HINT = '근거는 맞는데 이 순서에서 할 말일까?';

export interface CaptionCard {
  id: string;
  text: string;
  sourced: boolean;
  kind: CardKind;
  /** 출처 표기 — 출처 없는 카드도 그럴듯한 출처를 단다 (SNS 제보 등). 학생은 이 글을 읽고 판단한다. */
  origin: string;
  /** 사진 카드: 카드 그림으로 쓸 드론 사진 */
  photo?: PhotoId;
  /** 송출 화면 자막 — 아나운서 말투("~합니다"). 카드 글(text)은 학생이 고르는 짧은 말투 그대로. */
  announce?: string;
  evidence?: string[];
  evidenceLabel?: '내 탐험 기록' | '연습 자료' | '전해 들은 말';
}

const GRAPH_VARIABLES: CauseId[] = ['logging', 'noise', 'water'];

/** 관찰한 수치와 바꾼 행동만 전한다. 모든 숲에 같은 결과가 난다고 단정하지 않는다. */
function graphText(trial: Trial): string {
  const more = trial.to > trial.from;
  const action = trial.variable === 'logging' ? `먹이나무를 ${more ? '늘리자' : '줄이자'}`
    : trial.variable === 'noise' ? `기계 소리를 ${more ? '키우자' : '줄이자'}`
    : `물을 ${more ? '채우자' : '줄이자'}`;
  if (trial.before === trial.after) return `${action} 새 수는 ${trial.after}마리로 같았습니다`;
  return `${action} 새가 ${trial.before}마리에서 ${trial.after}마리로 ${trial.after > trial.before ? '늘었습니다' : '줄었습니다'}`;
}

export const OPENING_CARDS: readonly CaptionCard[] = [
  { id: 'opening-rescue', text: '지구와 젤리의 구조 소식과 숲 이야기를 전합니다', sourced: true, kind: 'opening', origin: '탐험 소식', announce: '안녕하세요. 지구와 젤리의 구조 소식과 숲 이야기를 전해 드리겠습니다.' },
  { id: 'opening-news', text: '숲의 새가 줄어든 까닭을 함께 알아보겠습니다', sourced: true, kind: 'opening', origin: '탐험 소식', announce: '안녕하세요. 오늘은 숲의 새가 줄어든 까닭과 새를 돕는 방법을 알아보겠습니다.' },
  { id: 'opening-help', text: '숲의 새들을 돕기 위한 탐험 소식을 전합니다', sourced: true, kind: 'opening', origin: '탐험 소식', announce: '안녕하세요. 숲의 새들을 돕기 위해 우리가 살펴본 소식을 전해 드리겠습니다.' },
];
const PHOTO_TEXT: Record<PhotoId, string> = {
  logging: '숲 가장자리 나무가 잘려 나갔습니다',
  stream: '개울 물길이 자재에 막혀 있습니다',
  construction: '숲 옆에서 공사가 진행 중입니다',
};
const PHOTO_ANNOUNCE: Record<PhotoId, string> = {
  logging: '드론으로 확인한 결과, 숲 가장자리의 나무가 잘려 나갔습니다.',
  stream: '드론으로 확인한 결과, 개울 물길이 자재에 막혀 있습니다.',
  construction: '드론으로 확인한 결과, 숲 옆에서 공사가 진행 중입니다.',
};

export const ACTION_CARDS: readonly CaptionCard[] = [
  { id: 'action-plant', text: '새가 먹을 열매나무를 지키고 심어 주세요', sourced: true, kind: 'action', origin: '조사 그래프', announce: '시민 여러분, 새가 먹을 열매나무를 지키고 심어 주세요.' },
  { id: 'action-noise', text: '숲 옆의 시끄러운 기계 소리를 줄여 주세요', sourced: true, kind: 'action', origin: '조사 그래프', announce: '시민 여러분, 숲 옆의 시끄러운 기계 소리를 줄여 주세요.' },
  { id: 'action-report', text: '다친 새를 보면 돌봄센터에 알려 주세요', sourced: true, kind: 'action', origin: '돌봄 기록', announce: '다친 새를 보면 동물원 돌봄센터에 알려 주세요.' },
];

/** 문장은 근거 카드와 같은 말투. 출처 줄만 다르다 — 마지막 카드는 사실처럼 들리지만 익명. */
export const UNSOURCED_CARDS: readonly CaptionCard[] = [
  { id: 'rumor-city', text: '숲새들이 모두 도시로 갔다고 합니다', sourced: false, kind: 'rumor', origin: 'SNS 제보', announce: '숲의 새들이 모두 도시로 갔다고 합니다.' },
  { id: 'rumor-cat', text: '고양이가 새를 잡아먹었다고 합니다', sourced: false, kind: 'rumor', origin: '익명 댓글', announce: '고양이가 새를 잡아먹었다고 합니다.' },
  { id: 'rumor-back', text: '숲새들은 곧 돌아온다고 합니다', sourced: false, kind: 'rumor', origin: '누가 그러던데', announce: '숲의 새들은 곧 돌아온다고 합니다.' },
  { id: 'rumor-trees', text: '숲 가장자리 나무가 줄었다고 합니다', sourced: false, kind: 'rumor', origin: '익명 제보', announce: '숲 가장자리 나무가 줄었다고 합니다.' },
];

export const ALL_PHOTOS: PhotoId[] = ['logging', 'stream', 'construction'];

/** S3 그래프 + S1 사진 + 행동 안내(근거 있음) + 출처 약한 카드 4장. 앞 스테이지 기록이 없으면 전부 fallback. */
export function buildCaptionCards(artifacts: Pick<Artifacts, 'graphs' | 'photos'> & Partial<Pick<Artifacts, 'careLog'>>, trials: readonly Trial[] = []): CaptionCard[] {
  const photos = ALL_PHOTOS;
  const sourced: CaptionCard[] = [
    ...OPENING_CARDS.map((card): CaptionCard => ({ ...card,
      evidenceLabel: artifacts.photos.length || artifacts.graphs.length || artifacts.careLog?.length ? '내 탐험 기록' : '연습 자료',
      evidence: ['지구와 젤리의 구조 소식과 숲을 살펴본 이야기를 소개하는 첫 인사야. 아직 원인을 단정하거나 시민에게 부탁하는 순서는 아니야.'] })),
    ...GRAPH_VARIABLES.map((variable): CaptionCard => {
      const recorded = trials.find((item) => item.variable === variable);
      const trial = recorded ?? applyAction(variable);
      const text = graphText(trial);
      return { id: `graph-${variable}`, text, sourced: true, kind: 'graph', origin: '조사 그래프', announce: `비교 실험 결과, ${text}.`,
        evidenceLabel: recorded ? '내 탐험 기록' : '연습 자료',
        evidence: [`${recorded ? '내 비교 실험' : '연습용 비교 실험'}: 새 ${trial.before}마리 → ${trial.after}마리. 다른 것은 그대로 두고 한 가지만 바꿨어.`, '이번 숲에서 비교한 결과야. 다른 숲에서도 같을지는 더 알아봐야 해.'] };
    }),
    ...photos.map((id): CaptionCard => ({ id: `photo-${id}`, text: PHOTO_TEXT[id], sourced: true, kind: 'photo', origin: '드론 사진', photo: id, announce: PHOTO_ANNOUNCE[id],
      evidenceLabel: artifacts.photos.some((photo) => photo.id === id) ? '내 탐험 기록' : '연습 자료',
      evidence: [PHOTO_TEXT[id], artifacts.photos.find((photo) => photo.id === id)?.quality === 'edge' ? '가장자리에 찍은 사진이야. 보이는 부분만 설명해 보자.' : '사진에 보이는 모습을 살펴봐. 이 사진만으로는 새가 왜 떠났는지 알 수 없어.'] })),
    ...ACTION_CARDS.map((card): CaptionCard => ({ ...card,
      evidenceLabel: card.id === 'action-report' ? artifacts.careLog?.length ? '내 탐험 기록' : '연습 자료' : trials.some((trial) => trial.variable === (card.id === 'action-plant' ? 'logging' : 'noise')) ? '내 탐험 기록' : '연습 자료',
      evidence: card.id === 'action-report'
        ? artifacts.careLog?.length ? artifacts.careLog.map((record) => `${record.bird === 'green' ? '지구' : '젤리'}: ${record.issue} → ${record.treatment}`) : ['구조된 새는 상태에 맞춰 전문가가 돌봐야 해. 아직 내 돌봄 기록이 없어서 연습 자료를 보고 있어.']
        : card.id === 'action-plant'
          ? ['다른 것은 그대로 두고 먹이나무만 늘렸더니 새 수가 늘었어.', '이 결과를 보고 사람들에게 새가 먹을 열매나무를 지키고 심어 달라고 부탁할 수 있어.']
          : ['다른 것은 그대로 두고 시끄러운 소리만 줄였더니 새 수가 늘었어.', '이 결과를 보고 사람들에게 시끄러운 소리를 줄여 달라고 부탁할 수 있어.'] })),
  ];
  // 카드 순서를 섞되 결정적으로: 근거/출처없음을 번갈아 배치해 위치만으로 못 고르게 한다.
  const mixed: CaptionCard[] = [];
  const rumors = [...UNSOURCED_CARDS];
  sourced.forEach((card, index) => {
    mixed.push(card);
    if (index % 2 === 0 && rumors.length) mixed.push(rumors.shift()!);
  });
  return [...mixed, ...rumors].map((card): CaptionCard => card.sourced ? card : ({ ...card, evidenceLabel: '전해 들은 말', evidence: [`${card.origin}: “${card.text}”`, '언제 어디에서 본 일인지 적혀 있지 않아. 확인할 사진이나 조사 기록도 없어.'] }));
}

export function photoIds(photos: Artifacts['photos']): PhotoId[] {
  const ids = photos.map((photo) => photo.id).filter((id, index, list) => list.indexOf(id) === index);
  return ids.length ? ids : ALL_PHOTOS;
}

/** 방송 순서에 맞는 선택지. 원인 설명과 시민 부탁은 세 가지 실제 결과·행동을 모두 제공한다. */
export function segmentCards(cards: readonly CaptionCard[], index: number, seed = 0, correction = false): CaptionCard[] {
  if (correction) {
    const factual = cards.filter((card) => card.sourced && (card.kind === 'graph' || card.kind === 'photo'));
    const fallback = buildCaptionCards({ graphs: [], photos: [] }).filter((card) => card.kind === 'graph');
    const unique = [...factual, ...fallback].filter((card, i, list) => list.findIndex((other) => other.id === card.id) === i);
    return seededShuffle(unique.slice(0, 3), seed + index);
  }
  const segment = SEGMENTS[index] ?? SEGMENTS[0]!;
  const fit = cards.filter((card) => card.sourced && captionFits(segment, card));
  if (segment.fit === 'opening') return seededShuffle(OPENING_CARDS.map((fallback) => fit.find((card) => card.id === fallback.id) ?? fallback), seed + index);
  if (segment.fit === 'action') return seededShuffle(ACTION_CARDS.map((fallback) => fit.find((card) => card.id === fallback.id) ?? fallback), seed + index);
  if (segment.fit === 'graph') {
    const fallback = buildCaptionCards({ graphs: [], photos: [] });
    return seededShuffle(GRAPH_VARIABLES.map((variable) => fit.find((card) => card.id === `graph-${variable}`) ?? fallback.find((card) => card.id === `graph-${variable}`)!), seed + index);
  }
  const fallbackPhotos = buildCaptionCards({ graphs: [], photos: [] }).filter((card) => card.kind === 'photo');
  return seededShuffle(ALL_PHOTOS.map((id) => fit.find((card) => card.photo === id) ?? fallbackPhotos.find((card) => card.photo === id)!), seed + index);
}

/** 소문 송출 뒤 정정한다. 원래 순서를 건너뛰거나 정정 없이 완주하지 않는다. */
export function airRumor(state: BroadcastState): BroadcastState {
  return { ...state, trust: trustAfterCaption(state.trust, false), corrections: state.corrections + 1,
    pendingCorrection: state.pendingCorrection ?? state.draft.captionId ?? 'unverified',
    reviewedCaptionIds: [], draft: { ...state.draft, source: null, captionId: null } };
}

export function reviewCaption(state: BroadcastState, captionId: string): BroadcastState {
  return { ...state, reviewedCaptionIds: [...new Set([...(state.reviewedCaptionIds ?? []), captionId])] };
}

/** 출처 있는 카드가 이 세그먼트에서 할 말인지. 출처 없는 카드는 검사하지 않는다(내보내면 벌점). */
export function captionFits(segment: Segment, card: CaptionCard): boolean {
  return !card.sourced ? segment.fit !== 'action' : segment.fit === 'any' || segment.fit === card.kind;
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

/** v4: 사고는 마이크 끊김 한 번. 그림 버튼 2개(예비 마이크 / 그대로). */
export const INCIDENTS: readonly Incident[] = [
  { id: 'mic', title: '마이크 끊김', signal: '리포터 목소리가 갑자기 안 들려.', actions: [
    { id: 'mic-swap', label: '예비 마이크로 바꾸기', cost: 2, trustDelta: 0, note: '소리가 바로 돌아왔어.' },
    { id: 'mic-ignore', label: '그대로 두기', cost: 0, trustDelta: -15, note: '시청자가 무슨 말인지 몰라 채널을 돌렸어.' },
  ] },
];
export const AP_BUDGET = 3;
/** 이 세그먼트 인덱스를 송출한 직후 사고가 난다 (한 번). */
export const INCIDENT_SLOTS: readonly number[] = [1];
export function planIncidents(seed: number): string[] {
  return seededShuffle(INCIDENTS.map((item) => item.id), seed).slice(0, INCIDENT_SLOTS.length);
}

export const TRUST_START = 100;
export const UNSOURCED_PENALTY = 20;

export interface Draft { source: SourceId | null; captionId: string | null; level: number }
export interface AirLog { segmentId: string; title: string; source: SourceId; captionId: string; sourced: boolean }
export interface BroadcastState {
  index: number;
  trust: number;
  corrections: number;
  /** 정정 방송이 들어가는 인덱스. SEGMENTS.length 이면 마지막에 덧붙은 정정. */
  correctionAt: number[];
  ap: number;
  /** 세션 시드로 정한 사고 순서 (INCIDENT_SLOTS 와 짝) */
  incidentPlan: string[];
  pendingIncident: string | null;
  /** 문제를 해결한 뒤 방송이 다시 이어지는 모습을 확인하는 단계. */
  pendingRecovery?: 'mic' | null;
  incidentLog: { incidentId: string; actionId: string }[];
  log: AirLog[];
  draft: Draft;
  pendingCorrection?: string | null;
  reviewedCaptionIds?: string[];
  correctionLog?: { from: string; to: string }[];
}

export const EMPTY_DRAFT: Draft = { source: null, captionId: null, level: 20 };

export function createBroadcast(seed = 0): BroadcastState {
  return { index: 0, trust: TRUST_START, corrections: 0, correctionAt: [], ap: AP_BUDGET, incidentPlan: planIncidents(seed), pendingIncident: null, pendingRecovery: null, incidentLog: [], log: [], draft: { ...EMPTY_DRAFT }, pendingCorrection: null, reviewedCaptionIds: [], correctionLog: [] };
}

export function currentSegment(state: BroadcastState): Segment | null {
  if (state.pendingCorrection || state.correctionAt.includes(state.index)) return CORRECTION_SEGMENT;
  if (state.index >= SEGMENTS.length) return null;
  return SEGMENTS[state.index]!;
}

/** 이전 버전의 마지막 정정 인덱스도 읽을 수 있게 남긴 큐시트 길이. */
export function totalSegments(state: BroadcastState): number {
  return SEGMENTS.length + (state.correctionAt.includes(SEGMENTS.length) ? 1 : 0);
}

export function isFinished(state: BroadcastState): boolean {
  return currentSegment(state) === null;
}

export type AirBlock = 'source' | 'wrong-source' | 'caption' | 'unfit' | 'audio' | 'evidence' | 'incident' | 'finished';

/** 송출을 막는 첫 번째 이유. null 이면 송출 가능. */
export function airBlock(state: BroadcastState, cards: readonly CaptionCard[]): AirBlock | null {
  if (state.pendingIncident || state.pendingRecovery) return 'incident';
  const segment = currentSegment(state);
  if (!segment) return 'finished';
  const { source, captionId, level } = state.draft;
  if (!source) return 'source';
  if (source !== segment.requiredSource) return 'wrong-source';
  const card = cards.find((item) => item.id === captionId);
  if (!card) return 'caption';
  if (!captionFits(segment, card)) return 'unfit';
  if (audioZone(level) !== 'ok') return 'audio';
  return null;
}

export function trustAfterCaption(trust: number, sourced: boolean): number {
  return sourced ? trust : Math.max(0, trust - UNSOURCED_PENALTY);
}

/** 원자료 확인 후 송출. 정정은 별도로 기록하고 원래 뉴스 순서로 돌아간다. */
export function airSegment(state: BroadcastState, cards: readonly CaptionCard[]): BroadcastState {
  if (airBlock(state, cards)) return state;
  const segment = currentSegment(state)!;
  const card = cards.find((item) => item.id === state.draft.captionId)!;
  if (!card.sourced) return airRumor(state);
  if (segment.id === 'correction') {
    return { ...state, pendingCorrection: null, correctionAt: state.correctionAt.filter((index) => index !== state.index), trust: Math.min(TRUST_START, state.trust + UNSOURCED_PENALTY),
      correctionLog: [...(state.correctionLog ?? []), { from: state.pendingCorrection ?? 'unverified', to: card.id }],
      log: [...state.log, { segmentId: 'correction', title: '정정 방송', source: state.draft.source!, captionId: card.id, sourced: true }],
      reviewedCaptionIds: [], draft: { ...EMPTY_DRAFT, level: state.draft.level } };
  }
  const nextIndex = state.index + 1;
  const slot = INCIDENT_SLOTS.indexOf(state.index);
  const incidentId = slot >= 0 ? state.incidentPlan[slot] ?? null : null;
  return {
    ...state,
    index: nextIndex,
    pendingIncident: incidentId && !state.incidentLog.some((entry) => entry.incidentId === incidentId) ? incidentId : null,
    log: [...state.log, { segmentId: segment.id, title: segment.title, source: state.draft.source!, captionId: card.id, sourced: card.sourced }],
    draft: { ...EMPTY_DRAFT, level: state.draft.level },
    reviewedCaptionIds: [],
  };
}

export function resolveIncident(state: BroadcastState, actionId: string): BroadcastState {
  const incident = INCIDENTS.find((item) => item.id === state.pendingIncident);
  const action = incident?.actions.find((item) => item.id === actionId);
  if (!incident || !action || action.cost > state.ap) return state;
  if (state.incidentLog.some((entry) => entry.incidentId === incident.id && entry.actionId === actionId)) return state;
  return {
    ...state,
    ap: state.ap - action.cost,
    trust: Math.max(0, Math.min(100, state.trust + action.trustDelta)),
    pendingIncident: actionId === 'mic-ignore' ? incident.id : null,
    pendingRecovery: actionId === 'mic-swap' ? 'mic' : null,
    incidentLog: [...state.incidentLog, { incidentId: incident.id, actionId }],
  };
}

/** 회복 장면을 확인해도 뉴스 순서와 사용한 자원은 그대로 유지한다. */
export function acknowledgeIncidentRecovery(state: BroadcastState): BroadcastState {
  if (!state.pendingRecovery || state.pendingIncident) return state;
  return { ...state, pendingRecovery: null };
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
  if (!Array.isArray(raw.log) || !Array.isArray(raw.correctionAt) || !Array.isArray(raw.incidentLog) || !Array.isArray(raw.incidentPlan)) return null;
  const draft = (raw.draft && typeof raw.draft === 'object' ? raw.draft : {}) as Partial<Draft>;
  const pendingIncident = raw.pendingIncident === 'mic' ? 'mic' : null;
  return {
    index: raw.index,
    trust: raw.trust,
    corrections: raw.corrections,
    correctionAt: raw.correctionAt.filter((item): item is number => typeof item === 'number'),
    ap: raw.ap,
    incidentPlan: raw.incidentPlan.filter((item): item is string => typeof item === 'string'),
    pendingIncident,
    pendingRecovery: !pendingIncident && raw.pendingRecovery === 'mic' ? 'mic' : null,
    incidentLog: raw.incidentLog as BroadcastState['incidentLog'],
    log: raw.log as AirLog[],
    draft: {
      source: draft.source === 'drone' || draft.source === 'studio' || draft.source === 'reporter' ? draft.source : null,
      captionId: typeof draft.captionId === 'string' ? draft.captionId : null,
      level: typeof draft.level === 'number' ? draft.level : EMPTY_DRAFT.level,
    },
    pendingCorrection: typeof raw.pendingCorrection === 'string' ? raw.pendingCorrection : null,
    reviewedCaptionIds: Array.isArray(raw.reviewedCaptionIds) ? raw.reviewedCaptionIds.filter((id): id is string => typeof id === 'string') : [],
    correctionLog: Array.isArray(raw.correctionLog) ? raw.correctionLog.filter((entry): entry is { from: string; to: string } => Boolean(entry) && typeof entry === 'object' && typeof entry.from === 'string' && typeof entry.to === 'string') : [],
  };
}

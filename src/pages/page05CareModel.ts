import { BIRDS, getBird, getTreatment, type BirdId, type CareZoneId, type SoundVerdict, type TreatmentId } from './page05Data';

export const STABLE_GAUGE = 80;

export interface CareState {
  /** 개체별 구역 → 고른 진술 id */
  records: Record<BirdId, Partial<Record<CareZoneId, string>>>;
  sound: Record<BirdId, SoundVerdict | null>;
  treatments: Record<BirdId, TreatmentId | null>;
  /** 틀린 처치 횟수 — 갱신 목표(헛 처치 0번) */
  wrongTreatments: number;
}

export const EMPTY_CARE_STATE: CareState = {
  records: { green: {}, red: {} },
  sound: { green: null, red: null },
  treatments: { green: null, red: null },
  wrongTreatments: 0,
};

const isTreatment = (value: unknown): value is TreatmentId => value === 'water' || value === 'shelter' || value === 'puzzle' || value === 'feather';
const isVerdict = (value: unknown): value is SoundVerdict => value === 'normal' || value === 'abnormal';

export function readCareState(value: unknown): CareState {
  if (!value || typeof value !== 'object') return EMPTY_CARE_STATE;
  const raw = value as Partial<CareState>;
  const state: CareState = { records: { green: {}, red: {} }, sound: { green: null, red: null }, treatments: { green: null, red: null }, wrongTreatments: 0 };
  for (const bird of BIRDS) {
    const records = raw.records?.[bird.id];
    if (records && typeof records === 'object') {
      for (const zone of bird.zones) {
        const statementId = (records as Record<string, unknown>)[zone.id];
        if (zone.statements.some((statement) => statement.id === statementId)) state.records[bird.id][zone.id] = statementId as string;
      }
    }
    const verdict = raw.sound?.[bird.id];
    if (isVerdict(verdict)) state.sound[bird.id] = verdict;
    const treatment = raw.treatments?.[bird.id];
    if (isTreatment(treatment)) state.treatments[bird.id] = treatment;
  }
  if (typeof raw.wrongTreatments === 'number' && raw.wrongTreatments >= 0) state.wrongTreatments = Math.floor(raw.wrongTreatments);
  return state;
}

export function groundedCount(state: CareState, birdId: BirdId): number {
  const bird = getBird(birdId);
  return bird.zones.filter((zone) => zone.statements.find((statement) => statement.id === state.records[birdId][zone.id])?.grounded).length;
}

export function treatmentMatches(birdId: BirdId, treatment: TreatmentId | null): boolean {
  return treatment !== null && getBird(birdId).correctTreatment === treatment;
}

/** 상태 게이지 0~100. 근거 기록 +5씩, 맞는 처치 +50, 틀린 처치 -10. */
export function birdGauge(state: CareState, birdId: BirdId): number {
  const treatment = state.treatments[birdId];
  const treatmentDelta = treatment === null ? 0 : treatmentMatches(birdId, treatment) ? 50 : -10;
  return Math.max(0, Math.min(100, 30 + groundedCount(state, birdId) * 5 + treatmentDelta));
}

export const isStable = (state: CareState, birdId: BirdId) => birdGauge(state, birdId) >= STABLE_GAUGE;

export function soundCorrect(state: CareState, birdId: BirdId): boolean {
  return state.sound[birdId] !== null && state.sound[birdId] === getBird(birdId).soundAnswer;
}

export interface CareMission {
  grounded: number;
  soundsClassified: number;
  stableBirds: number;
  ready: boolean;
  /** 갱신 목표: 헛 처치 없이 두 마리 안정 */
  perfect: boolean;
}

export function evaluateCare(state: CareState): CareMission {
  const grounded = BIRDS.reduce((sum, bird) => sum + groundedCount(state, bird.id), 0);
  const soundsClassified = BIRDS.filter((bird) => soundCorrect(state, bird.id)).length;
  const stableBirds = BIRDS.filter((bird) => isStable(state, bird.id)).length;
  const ready = grounded >= 4 && soundsClassified === BIRDS.length && stableBirds === BIRDS.length;
  return { grounded, soundsClassified, stableBirds, ready, perfect: ready && state.wrongTreatments === 0 };
}

/** 처치 카드를 개체에 놓았을 때. 틀리면 질문형 피드백을 돌려주고 게이지가 내려간다(벌칙 없음, 다시 놓을 수 있음). */
export function applyTreatment(state: CareState, birdId: BirdId, treatment: TreatmentId): { state: CareState; feedback: string; matched: boolean } {
  const matched = treatmentMatches(birdId, treatment);
  const bird = getBird(birdId);
  const next: CareState = {
    ...state,
    treatments: { ...state.treatments, [birdId]: treatment },
    wrongTreatments: state.wrongTreatments + (matched ? 0 : 1),
  };
  const feedback = matched
    ? `${bird.name}이(가) 차분해졌어. ${getTreatment(treatment).name}이 딱 맞았어.`
    : bird.wrongTreatmentFeedback[treatment];
  return { state: next, feedback, matched };
}

export function buildCareLog(state: CareState) {
  return BIRDS.flatMap((bird) => {
    const treatment = state.treatments[bird.id];
    return treatment ? [{ bird: bird.id, issue: bird.issue, treatment: getTreatment(treatment).name }] : [];
  });
}

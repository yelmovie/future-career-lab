import { hashString, seededShuffle } from '../shared/rng';
import { BIRDS, getBird, getTreatment, type BirdId, type CareStatement, type CareZoneId, type TreatmentId } from './page05Data';

export const STABLE_GAUGE = 80;
/** 개체 하나가 안정되려면 필요한 근거 기록 수 */
export const RECORDS_PER_BIRD = 3;

export interface CareState {
  /** 개체별 구역 → 고른 진술 id */
  records: Record<BirdId, Partial<Record<CareZoneId, string>>>;
  treatments: Record<BirdId, TreatmentId | null>;
  /** 틀린 처치 횟수 — 갱신 목표(헛 처치 0번) */
  wrongTreatments: number;
  /** 짐작 진술을 고른 횟수 — 게이지 벌칙 없음, 보여 주기만 */
  wrongRecords: number;
}

export const EMPTY_CARE_STATE: CareState = {
  records: { green: {}, red: {} },
  treatments: { green: null, red: null },
  wrongTreatments: 0,
  wrongRecords: 0,
};

const isTreatment = (value: unknown): value is TreatmentId => value === 'water' || value === 'shelter' || value === 'puzzle' || value === 'feather';
const readCount = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

export function readCareState(value: unknown): CareState {
  if (!value || typeof value !== 'object') return EMPTY_CARE_STATE;
  const raw = value as Partial<CareState>;
  const state: CareState = { ...EMPTY_CARE_STATE, records: { green: {}, red: {} }, treatments: { green: null, red: null } };
  for (const bird of BIRDS) {
    const records = raw.records?.[bird.id];
    if (records && typeof records === 'object') {
      for (const zone of bird.zones) {
        const statementId = (records as Record<string, unknown>)[zone.id];
        if (zone.statements.some((statement) => statement.id === statementId && statement.grounded)) state.records[bird.id][zone.id] = statementId as string;
      }
    }
    const treatment = raw.treatments?.[bird.id];
    if (isTreatment(treatment)) state.treatments[bird.id] = treatment;
  }
  state.wrongTreatments = readCount(raw.wrongTreatments);
  state.wrongRecords = readCount(raw.wrongRecords);
  return state;
}

/** 진술 순서를 세션 시드로 섞는다. 시드는 저장 파일(sessionSeed)에 있어 새로고침해도 같은 순서. */
export function shuffledStatements(birdId: BirdId, zoneId: CareZoneId, seed: number): CareStatement[] {
  const zone = getBird(birdId).zones.find((item) => item.id === zoneId);
  if (!zone) return [];
  return seededShuffle(zone.statements, hashString(`${seed}:${birdId}:${zoneId}`));
}

export function groundedCount(state: CareState, birdId: BirdId): number {
  const bird = getBird(birdId);
  return bird.zones.filter((zone) => zone.statements.find((statement) => statement.id === state.records[birdId][zone.id])?.grounded).length;
}

/** 진술을 골랐을 때. 짐작이면 기록하지 않고 질문형 힌트 + 헛 기록 1 (게이지 벌칙 없음). */
export function chooseStatement(state: CareState, birdId: BirdId, zoneId: CareZoneId, statementId: string): { state: CareState; grounded: boolean; feedback: string } {
  const zone = getBird(birdId).zones.find((item) => item.id === zoneId);
  const statement = zone?.statements.find((item) => item.id === statementId);
  if (!statement) return { state, grounded: false, feedback: '' };
  if (!statement.grounded) {
    return { state: { ...state, wrongRecords: state.wrongRecords + 1 }, grounded: false, feedback: '그건 보이는 걸까, 짐작일까? "보이는 것"을 다시 읽고 골라 봐.' };
  }
  return {
    state: { ...state, records: { ...state.records, [birdId]: { ...state.records[birdId], [zoneId]: statementId } } },
    grounded: true,
    feedback: '근거가 있는 기록이야. 게이지가 조금 올랐어.',
  };
}

export function treatmentMatches(birdId: BirdId, treatment: TreatmentId | null): boolean {
  return treatment !== null && getBird(birdId).correctTreatment === treatment;
}

export function treatmentAssists(birdId: BirdId, treatment: TreatmentId | null): boolean {
  return treatment !== null && getBird(birdId).assistTreatment === treatment;
}

/** 상태 게이지 0~100. 기본 20, 근거 기록 +8씩(최대 40), 맞는 처치 +40, 보조 처치 +20, 틀린 처치 -10. 기록 3개 + 맞는 처치 = 84 ≥ 80. */
export function birdGauge(state: CareState, birdId: BirdId): number {
  const treatment = state.treatments[birdId];
  const treatmentDelta = treatment === null ? 0 : treatmentMatches(birdId, treatment) ? 40 : treatmentAssists(birdId, treatment) ? 20 : -10;
  return Math.max(0, Math.min(100, 20 + groundedCount(state, birdId) * 8 + treatmentDelta));
}

/** 안정 = 맞는 처치 + 근거 기록 3개 이상. 처치 하나로는 못 넘긴다. */
export const isStable = (state: CareState, birdId: BirdId) => treatmentMatches(birdId, state.treatments[birdId]) && groundedCount(state, birdId) >= RECORDS_PER_BIRD;

export function birdStatus(state: CareState, birdId: BirdId): string {
  if (isStable(state, birdId)) return '안정';
  if (treatmentMatches(birdId, state.treatments[birdId])) return '처치는 맞는데 아직 관찰이 부족해';
  if (treatmentAssists(birdId, state.treatments[birdId])) return '보조 처치만 있어';
  return '살펴보는 중';
}

export interface CareMission {
  grounded: number;
  stableBirds: number;
  ready: boolean;
  /** 갱신 목표: 헛 처치 없이 두 마리 안정 */
  perfect: boolean;
}

export function evaluateCare(state: CareState): CareMission {
  const grounded = BIRDS.reduce((sum, bird) => sum + groundedCount(state, bird.id), 0);
  const stableBirds = BIRDS.filter((bird) => isStable(state, bird.id)).length;
  const enoughRecords = BIRDS.every((bird) => groundedCount(state, bird.id) >= RECORDS_PER_BIRD);
  const ready = enoughRecords && stableBirds === BIRDS.length;
  return { grounded, stableBirds, ready, perfect: ready && state.wrongTreatments === 0 };
}

/** 처치 카드를 개체에 놓았을 때. 틀리면 질문형 피드백을 돌려주고 게이지가 내려간다(벌칙 없음, 다시 놓을 수 있음). 보조 처치는 절반 효과. */
export function applyTreatment(state: CareState, birdId: BirdId, treatment: TreatmentId): { state: CareState; feedback: string; matched: boolean; assist: boolean } {
  const matched = treatmentMatches(birdId, treatment);
  const assist = treatmentAssists(birdId, treatment);
  const bird = getBird(birdId);
  const next: CareState = {
    ...state,
    treatments: { ...state.treatments, [birdId]: treatment },
    wrongTreatments: state.wrongTreatments + (matched || assist ? 0 : 1),
  };
  const feedback = matched
    ? groundedCount(next, birdId) >= RECORDS_PER_BIRD
      ? `${bird.name}이(가) 차분해졌어. ${getTreatment(treatment).name}이 딱 맞았어.`
      : `${getTreatment(treatment).name}은 맞아. 그런데 아직 관찰이 부족해. 근거 기록 ${RECORDS_PER_BIRD}개를 채워 봐.`
    : assist
      ? bird.assistFeedback ?? ''
      : bird.wrongTreatmentFeedback[treatment];
  return { state: next, feedback, matched, assist };
}

export function buildCareLog(state: CareState) {
  return BIRDS.flatMap((bird) => {
    const treatment = state.treatments[bird.id];
    return treatment ? [{ bird: bird.id, issue: bird.issue, treatment: getTreatment(treatment).name }] : [];
  });
}

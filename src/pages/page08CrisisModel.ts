import type { Artifacts, JobId } from '../shared/types';

/** 턴제 연합 작전 모델. 타이머 없음 — 긴장은 턴마다 번지는 위기 게이지와 짝 판단. */
export type CrisisId = 'fire' | 'flock' | 'citizens';

export interface CrisisDefinition {
  id: CrisisId;
  title: string;
  symptom: string;
  /** 능력 힌트만 — 직업 이름을 쓰지 않는다 */
  hints: readonly string[];
  needs: readonly [JobId, JobId];
  /** 홀로그램 위치(%) */
  x: number;
  y: number;
}

export const HINT_BY_JOB: Record<JobId, string> = {
  drone: '위에서 봐야 해',
  ecology: '근거가 필요해',
  care: '보호할 곳이 필요해',
  broadcast: '사람들에게 정확히 알려야 해',
};

export const CRISES: readonly CrisisDefinition[] = [
  { id: 'fire', title: '벌목지 화재 확산', symptom: '벌목한 자리에서 연기가 번져. 어디까지 퍼졌는지 모르고, 시민들도 아직 몰라.', hints: [HINT_BY_JOB.drone, HINT_BY_JOB.broadcast], needs: ['drone', 'broadcast'], x: 27, y: 34 },
  { id: 'flock', title: '앵무 무리 이동 경로 위험', symptom: '돌아오는 앵무 무리가 위험한 길로 가고 있어. 어디로 가는지 알아야 하고, 쉴 곳도 없어.', hints: [HINT_BY_JOB.ecology, HINT_BY_JOB.care], needs: ['ecology', 'care'], x: 72, y: 32 },
  { id: 'citizens', title: '시민 오해로 복원 반대', symptom: '"앵무새 때문에 공사가 멈췄다"는 소문이 돌아. 진짜 원인을 근거로 알려야 해.', hints: [HINT_BY_JOB.broadcast, HINT_BY_JOB.ecology], needs: ['broadcast', 'ecology'], x: 50, y: 74 },
] as const;

export const JOB_ORDER: readonly JobId[] = ['drone', 'care', 'ecology', 'broadcast'];

export const GAUGE_START = 40;
export const GAUGE_MAX = 100;
export const SPREAD_PER_TURN = 10;
const BASE_POWER = 20;
const BONUS_POWER = 15;

/** 카드 = 탄약. 앞 스테이지 산출물 품질이 배지 효과량이 된다. */
export interface CardQuality { job: JobId; label: string; chip: string; power: number }

export function cardQualities(artifacts: Artifacts | undefined): CardQuality[] {
  const centerPhotos = artifacts?.photos.filter((photo) => photo.quality === 'center').length ?? 0;
  const stars = artifacts?.habitatStars ?? 0;
  const foundMain = artifacts?.graphs.some((graph) => graph.variable === 'logging' && graph.verdict === 'main') ?? false;
  const trust = Math.max(0, Math.min(100, artifacts?.clip?.trust ?? 0));
  return [
    { job: 'drone', label: '현장 사진', chip: `정중앙 ${centerPhotos}/3`, power: BASE_POWER + Math.round(BONUS_POWER * centerPhotos / 3) },
    { job: 'care', label: '회복 공간', chip: `별 ${stars}/3`, power: BASE_POWER + Math.round(BONUS_POWER * stars / 3) },
    { job: 'ecology', label: '연구 그래프', chip: foundMain ? '주원인 확인' : '주원인 아직', power: BASE_POWER + (foundMain ? BONUS_POWER : 0) },
    { job: 'broadcast', label: '방송 클립', chip: artifacts?.clip ? `신뢰도 ${trust}` : '클립 없음', power: BASE_POWER + Math.round(BONUS_POWER * trust / 100) },
  ];
}

export interface AllianceState {
  turn: number;
  gauges: Record<CrisisId, number>;
  /** 이번 턴 배치 */
  assigned: Record<CrisisId, JobId[]>;
  /** 남은 쉬는 턴 수 */
  cooldown: Record<JobId, number>;
  feedback: string[];
  done: boolean;
}

export function createAllianceState(): AllianceState {
  return {
    turn: 1,
    gauges: { fire: GAUGE_START, flock: GAUGE_START, citizens: GAUGE_START },
    assigned: { fire: [], flock: [], citizens: [] },
    cooldown: { drone: 0, care: 0, ecology: 0, broadcast: 0 },
    feedback: [],
    done: false,
  };
}

export const isStabilized = (state: AllianceState, id: CrisisId) => state.gauges[id] <= 0;
export const isAvailable = (state: AllianceState, job: JobId) => state.cooldown[job] === 0 && !state.done;

/** 배지를 위기에 붙인다. 이미 다른 위기에 있으면 옮기고, 같은 위기면 뗀다. */
export function toggleAssign(state: AllianceState, job: JobId, crisis: CrisisId): AllianceState {
  if (!isAvailable(state, job) || isStabilized(state, crisis)) return state;
  const assigned = { ...state.assigned };
  const already = assigned[crisis].includes(job);
  for (const id of Object.keys(assigned) as CrisisId[]) assigned[id] = assigned[id].filter((entry) => entry !== job);
  if (!already) assigned[crisis] = [...assigned[crisis], job];
  return { ...state, assigned, feedback: [] };
}

export type PairVerdict = 'pair' | 'hold' | 'wrong' | 'none';

/** 짝 판정: 둘 다 맞으면 pair, 맞는 것 하나만이면 hold(번지지 않고 절반 효과), 틀린 배지가 섞이면 wrong. */
export function pairVerdict(crisis: CrisisDefinition, jobs: readonly JobId[]): PairVerdict {
  if (jobs.length === 0) return 'none';
  const right = jobs.filter((job) => crisis.needs.includes(job));
  if (right.length !== jobs.length) return 'wrong';
  return right.length === 2 ? 'pair' : 'hold';
}

export function pairEffect(jobs: readonly JobId[], cards: readonly CardQuality[]): number {
  return jobs.reduce((sum, job) => sum + (cards.find((card) => card.job === job)?.power ?? BASE_POWER), 0);
}

export function advanceTurn(state: AllianceState, cards: readonly CardQuality[]): AllianceState {
  if (state.done) return state;
  const gauges = { ...state.gauges };
  const feedback: string[] = [];
  const used = new Set<JobId>();
  for (const crisis of CRISES) {
    if (gauges[crisis.id] <= 0) continue;
    const jobs = state.assigned[crisis.id];
    jobs.forEach((job) => used.add(job));
    const verdict = pairVerdict(crisis, jobs);
    if (verdict === 'pair') {
      gauges[crisis.id] = Math.max(0, gauges[crisis.id] - pairEffect(jobs, cards));
      feedback.push(gauges[crisis.id] === 0 ? `${crisis.title}: 두 힘이 맞물려 안정됐어.` : `${crisis.title}: 위기가 줄었어. 한 번 더 필요해.`);
    } else if (verdict === 'hold') {
      gauges[crisis.id] = Math.max(0, gauges[crisis.id] - Math.floor(pairEffect(jobs, cards) / 2));
      feedback.push(`${crisis.title}: 번지는 건 막았어. 짝이 되는 힘 하나가 더 있으면 훨씬 세.`);
    } else {
      gauges[crisis.id] = Math.min(GAUGE_MAX, gauges[crisis.id] + SPREAD_PER_TURN);
      feedback.push(verdict === 'wrong'
        ? `${crisis.title}: 효과가 없었어. 이 위기엔 무엇이 필요하다고 써 있지?`
        : `${crisis.title}: 아무도 없어서 더 번졌어.`);
    }
  }
  const cooldown = { ...state.cooldown };
  for (const job of JOB_ORDER) cooldown[job] = used.has(job) ? 1 : Math.max(0, cooldown[job] - 1);
  const done = CRISES.every((crisis) => gauges[crisis.id] <= 0);
  return {
    turn: state.turn + 1,
    gauges,
    assigned: { fire: [], flock: [], citizens: [] },
    cooldown,
    feedback,
    done,
  };
}

/** 클리어에 쓴 턴 수 (턴 카운터는 다음 턴을 가리키므로 1 뺀다) */
export const turnsUsed = (state: AllianceState) => state.turn - 1;

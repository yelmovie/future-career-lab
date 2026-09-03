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
/** 위기가 100% 에 닿아 번지면 나머지 위기가 이만큼 오른다 */
export const SPILL = 15;
/** 이 턴 안에 셋을 못 잡으면 작전을 다시 계획한다 */
export const MAX_TURNS = 12;
export const MIN_TRIALS = 3;
const BASE_POWER = 20;
const BONUS_POWER = 15;

/** 카드 = 탄약. 앞 스테이지 산출물 품질이 배지 효과량이 된다. */
export interface CardQuality { job: JobId; label: string; chip: string; power: number }

/** S3 가 pageData 에 남긴 실험 횟수. 정답 원인은 없으므로 "몇 번 실험했나"만 본다. */
export function ecologyTrials(pageData: Record<string, unknown> | undefined): number {
  const stored = pageData?.['page07Ecology'];
  const trials = stored && typeof stored === 'object' ? (stored as { trials?: unknown }).trials : undefined;
  return Array.isArray(trials) ? trials.length : 0;
}

export function cardQualities(artifacts: Artifacts | undefined, trials = 0): CardQuality[] {
  const centerPhotos = artifacts?.photos.filter((photo) => photo.quality === 'center').length ?? 0;
  const stars = artifacts?.habitatStars ?? 0;
  // 생태 카드: 어떤 원인을 골랐든 상관없다. 실험 3회 + 주원인·보조원인 확정이면 최대.
  const hasMain = artifacts?.graphs.some((graph) => graph.verdict === 'main') ?? false;
  const hasSub = artifacts?.graphs.some((graph) => graph.verdict === 'sub') ?? false;
  const trialRatio = Math.min(MIN_TRIALS, trials) / MIN_TRIALS;
  const ecologyQuality = trialRatio * 0.5 + (hasMain && hasSub ? 0.5 : hasMain ? 0.25 : 0);
  const trust = Math.max(0, Math.min(100, artifacts?.clip?.trust ?? 0));
  return [
    { job: 'drone', label: '현장 사진', chip: `정중앙 ${centerPhotos}/3`, power: BASE_POWER + Math.round(BONUS_POWER * centerPhotos / 3) },
    { job: 'care', label: '회복 공간', chip: `별 ${stars}/3`, power: BASE_POWER + Math.round(BONUS_POWER * stars / 3) },
    { job: 'ecology', label: '연구 그래프', chip: `실험 ${Math.min(MIN_TRIALS, trials)}/${MIN_TRIALS} · ${hasMain && hasSub ? '원인 확정' : hasMain ? '보조원인 아직' : '원인 아직'}`, power: BASE_POWER + Math.round(BONUS_POWER * ecologyQuality) },
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
  /** 100% 에 닿아 번진 순서. 번질 때마다 숲 노드 하나를 잃는다 */
  spread: CrisisId[];
  done: boolean;
  /** MAX_TURNS 안에 못 끝냄 — 벌칙이 아니라 다시 계획하는 신호 */
  failed: boolean;
}

export function createAllianceState(): AllianceState {
  return {
    turn: 1,
    gauges: { fire: GAUGE_START, flock: GAUGE_START, citizens: GAUGE_START },
    assigned: { fire: [], flock: [], citizens: [] },
    cooldown: { drone: 0, care: 0, ecology: 0, broadcast: 0 },
    feedback: [],
    spread: [],
    done: false,
    failed: false,
  };
}

export const isStabilized = (state: AllianceState, id: CrisisId) => state.gauges[id] <= 0;
export const isEnded = (state: AllianceState) => state.done || state.failed;
export const isAvailable = (state: AllianceState, job: JobId) => state.cooldown[job] === 0 && !isEnded(state);
export const lostNodes = (state: AllianceState) => state.spread.length;

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
  if (isEnded(state)) return state;
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
  // 번짐: 100% 에 새로 닿은 위기는 나머지 둘을 SPILL 만큼 올리고 숲 노드 하나를 잃는다 (연쇄 가능).
  const spread = [...state.spread];
  let spilled = true;
  while (spilled) {
    spilled = false;
    for (const crisis of CRISES) {
      if (gauges[crisis.id] < GAUGE_MAX || spread.includes(crisis.id)) continue;
      spread.push(crisis.id);
      spilled = true;
      for (const other of CRISES) if (other.id !== crisis.id && gauges[other.id] > 0) gauges[other.id] = Math.min(GAUGE_MAX, gauges[other.id] + SPILL);
      feedback.push(`${crisis.title}: 100% 에 닿아 옆으로 번졌어. 숲 노드 하나를 잃었고 다른 위기가 ${SPILL}% 올랐어.`);
    }
  }
  const cooldown = { ...state.cooldown };
  for (const job of JOB_ORDER) cooldown[job] = used.has(job) ? 1 : Math.max(0, cooldown[job] - 1);
  const done = CRISES.every((crisis) => gauges[crisis.id] <= 0);
  const turn = state.turn + 1;
  return {
    turn,
    gauges,
    assigned: { fire: [], flock: [], citizens: [] },
    cooldown,
    feedback,
    spread,
    done,
    failed: !done && turn > MAX_TURNS,
  };
}

/** 클리어에 쓴 턴 수 (턴 카운터는 다음 턴을 가리키므로 1 뺀다) */
export const turnsUsed = (state: AllianceState) => state.turn - 1;

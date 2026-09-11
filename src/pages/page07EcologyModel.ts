import { v5Asset, v8Asset } from '../shared/assets';
import type { CauseId } from '../shared/types';

export type PointId = 'A' | 'B' | 'C';
export type SoundKind = 'forestBirdsong' | 'chainsaw';
export type TraceKind = 'habitat' | 'footprint' | 'feather' | 'sound';

export interface Trace {
  id: string;
  point: PointId;
  kind: TraceKind;
  title: string;
  /** 발견했을 때 도감에 적히는 한 줄 */
  note: string;
  image: string;
  x: number;
  y: number;
  sound?: SoundKind;
}

export const POINTS: { id: PointId; title: string; blurb: string }[] = [
  { id: 'A', title: '숲 가장자리', blurb: '도로와 가까워. 나무가 많이 베였어.' },
  { id: 'B', title: '개울가', blurb: '물이 흐르고 땅이 축축해.' },
  { id: 'C', title: '깊은 숲', blurb: '열매 나무가 빽빽해.' },
];

export const TRACES: Trace[] = [
  { id: 'tree-cut', point: 'A', kind: 'habitat', title: '잘린 열매나무', note: '잘린 나무 옆에 열매 달린 가지가 있어.\n새들의 먹이가 줄었을까? 다른 곳과 비교해 보자.', image: v8Asset('trace-cut-fruit-tree', 'png'), x: 30, y: 74 },
  { id: 'sound-chainsaw', point: 'A', kind: 'sound', title: '먼 기계 소리', note: '전기톱 소리. 나무를 베고 있어.', image: v5Asset('trace-machine-sound'), x: 66, y: 46, sound: 'chainsaw' },
  { id: 'feather-brown', point: 'B', kind: 'feather', title: '갈색 숲새 깃털', note: '개울가를 찾은 작은 숲새가 남긴 깃털이야.', image: v8Asset('trace-forest-feather-brown', 'png'), x: 30, y: 66 },
  { id: 'sound-forest-birds', point: 'B', kind: 'sound', title: '숲새 합창 녹음', note: '여러 종류의 작은 새가 함께 지저귄 지난주 녹음이야.', image: v8Asset('trace-forest-birdsong', 'png'), x: 72, y: 40, sound: 'forestBirdsong' },
  { id: 'foot-songbird', point: 'C', kind: 'footprint', title: '작은 새 발자국', note: '열매를 주워 먹은 작은 숲새들의 발자국이야.', image: v8Asset('trace-forest-footprints', 'png'), x: 28, y: 76 },
  { id: 'feather-blue', point: 'C', kind: 'feather', title: '푸른 숲새 깃털', note: '깊은 숲을 오가는 푸른색 작은 새가 남긴 깃털이야.', image: v8Asset('trace-forest-feather-blue', 'png'), x: 78, y: 62 },
];

/** 현장 흔적은 지점마다 2개씩 총 6개다. */
export const FIELD_TRACES: Trace[] = TRACES;

export const getTrace = (id: string) => TRACES.find((trace) => trace.id === id);

/** 단서를 교체해도 이전에 발견한 기록은 유지하고, 유효한 단서만 한 번씩 복원한다. */
export function normalizeFoundTraces(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const validIds = new Set(FIELD_TRACES.map((trace) => trace.id));
  const found = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item === 'foot-boot' ? 'tree-cut' : item;
    if (validIds.has(id)) found.add(id);
  }
  return [...found];
}

export const nextPoint = (point: PointId, dir: 1 | -1): PointId => {
  const idx = POINTS.findIndex((p) => p.id === point);
  return POINTS[(idx + dir + POINTS.length) % POINTS.length]!.id;
};

// ---------- 2단계 연구 태블릿 ----------

export const VARIABLES: { id: CauseId; label: string }[] = [
  { id: 'logging', label: '먹이나무' },
  { id: 'noise', label: '소음' },
  { id: 'water', label: '물' },
];
export const VARIABLE_LABEL: Record<CauseId, string> = { logging: '먹이나무', noise: '소음', water: '물' };

export type Levels = Record<CauseId, number>;

/** 지점별 환경 측정값 0~10과 관찰된 숲새 수. */
export const POINT_STATS: Record<PointId, Levels & { birdCount: number }> = {
  A: { logging: 3, noise: 9, water: 6, birdCount: 1 },
  B: { logging: 6, noise: 4, water: 9, birdCount: 4 },
  C: { logging: 9, noise: 2, water: 5, birdCount: 8 },
};

export const fewestTracePoint = (): PointId =>
  (Object.keys(POINT_STATS) as PointId[]).reduce((best, id) => (POINT_STATS[id].birdCount < POINT_STATS[best].birdCount ? id : best), 'A');

// ---------- 3단계 변인 실험 ----------

export const LEVEL_MAX = 10;
export const BASE_LEVELS: Levels = { logging: 5, noise: 5, water: 5 };
const BASE_POPULATION = 40;

/**
 * 교육용 단순 모델 [가정]. 먹이나무 > 소음 > 물 순으로 영향이 크다.
 * ponytail: 곱셈 세 항짜리 고정식. 실제 생태 모델이 필요하면 여기만 바꾼다.
 */
export function population(levels: Levels): number {
  const food = 0.15 + 0.85 * (levels.logging / LEVEL_MAX);
  const noise = 1 - 0.55 * (levels.noise / LEVEL_MAX);
  const water = 0.7 + 0.3 * (levels.water / LEVEL_MAX);
  return Math.round(BASE_POPULATION * food * noise * water);
}

export interface Trial {
  variable: CauseId;
  from: number;
  to: number;
  before: number;
  after: number;
}

export interface ExperimentState {
  /** 고정 기준 (5·5·5). 매 실험은 항상 이 값과 비교한다 — "다른 조건은 같게" */
  baseline: Levels;
  /** 지금 만지는 값 */
  levels: Levels;
  active: CauseId | null;
}

export const LOCK_MESSAGE = '두 개를 같이 바꾸면 어느 쪽 때문인지 알 수 있을까? 하나만 바꿔 보자.';
export const RESET_MESSAGE = '기준으로 되돌렸어. 다른 조건은 같게!';

export const createExperiment = (baseline: Levels = BASE_LEVELS): ExperimentState => ({ baseline, levels: baseline, active: null });

/** 슬라이더 한 개만 활성. 다른 슬라이더를 만지면 잠그고 멘토 질문을 돌려준다. */
export function changeLevel(state: ExperimentState, variable: CauseId, value: number): { state: ExperimentState; locked: boolean } {
  if (state.active && state.active !== variable) return { state, locked: true };
  const clamped = Math.max(0, Math.min(LEVEL_MAX, Math.round(value)));
  const levels = { ...state.levels, [variable]: clamped };
  const active = clamped === state.baseline[variable] ? null : variable;
  return { state: { ...state, levels, active }, locked: false };
}

/** 실행: 기준(baseline)과 대조해 기록하고, 슬라이더는 기준으로 되돌린다. 기준은 바뀌지 않는다. */
export function runTrial(state: ExperimentState): { state: ExperimentState; trial: Trial } | null {
  if (!state.active) return null;
  const variable = state.active;
  const trial: Trial = {
    variable,
    from: state.baseline[variable],
    to: state.levels[variable],
    before: population(state.baseline),
    after: population(state.levels),
  };
  return { state: createExperiment(state.baseline), trial };
}

export const MIN_TRIALS = 3;

/** 실험 기록에서 개체수를 가장 크게 움직인 변수 순서. 실험이 없는 변수는 뒤로. */
export function rankByEffect(trials: readonly Trial[]): CauseId[] {
  const effect = (id: CauseId) => Math.max(0, ...trials.filter((t) => t.variable === id).map((t) => Math.abs(t.after - t.before)));
  return VARIABLES.map((v) => v.id).sort((a, b) => effect(b) - effect(a));
}

/** 학생이 고른 주원인을 뺀 나머지 중 영향이 큰 쪽이 보조원인. */
export const subCause = (main: CauseId, trials: readonly Trial[]): CauseId => rankByEffect(trials).find((id) => id !== main)!;

export type Verdict = 'main' | 'sub' | 'none';

/** 학생이 정한 주원인·보조원인을 그래프 카드 3장으로 */
export function buildGraphs(main: CauseId, sub: CauseId): { variable: CauseId; verdict: Verdict }[] {
  return VARIABLES.map(({ id }) => ({ variable: id, verdict: id === main ? 'main' : id === sub ? 'sub' : 'none' }));
}

// ---------- 3단계 v6: 그림으로 하나씩 바꿔 보기 ----------

/** 새가 제일 적은 지점(숲 가장자리)의 지금 상태. 실험은 항상 여기서 시작한다. */
export const EDGE_LEVELS: Levels = { logging: POINT_STATS.A.logging, noise: POINT_STATS.A.noise, water: POINT_STATS.A.water };

export interface EcoAction {
  id: CauseId;
  /** 카드 이름 — 아이가 하는 행동 */
  label: string;
  /** 바꾼 뒤 값 */
  level: number;
}

/** 한 번에 하나씩 해 보는 행동 세 가지. 값은 "좋은 상태"로 바뀐다. */
export const ACTIONS: EcoAction[] = [
  { id: 'logging', label: '나무 심기', level: 9 },
  { id: 'noise', label: '기계 소리 멈추기', level: 2 },
  { id: 'water', label: '물 채우기', level: 9 },
];

export const getAction = (id: CauseId) => ACTIONS.find((action) => action.id === id)!;

/** 관찰 장면과 같은 기준. 모형은 관찰값에 조건 변화의 효과만 더한다. */
export const edgeBirds = () => POINT_STATS.A.birdCount;

/** 행동 하나만 적용한 결과. 다른 조건은 그대로(EDGE_LEVELS). */
export function applyAction(id: CauseId): Trial {
  const action = getAction(id);
  const after = Math.max(0, edgeBirds() + population({ ...EDGE_LEVELS, [id]: action.level }) - population(EDGE_LEVELS));
  return { variable: id, from: EDGE_LEVELS[id], to: action.level, before: edgeBirds(), after };
}

/** 이 장소에서 실제 비교한 증가량에 맞는 결론인가. 동률인 경우 모두 인정한다. */
export function evaluateConclusion(main: CauseId, trials: readonly Trial[]) {
  const complete = VARIABLES.every(({ id }) => trials.some((trial) => trial.variable === id));
  const selected = trials.find((trial) => trial.variable === main);
  const bestGain = Math.max(0, ...trials.map((trial) => trial.after - trial.before));
  const selectedGain = selected ? selected.after - selected.before : 0;
  return { supported: complete && Boolean(selected) && selectedGain === bestGain, complete, selectedGain, bestGain };
}

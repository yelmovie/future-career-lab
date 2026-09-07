import { pageAsset, v2Asset, v5Asset } from '../shared/assets';
import type { CauseId } from '../shared/types';

export type PointId = 'A' | 'B' | 'C';
export type SoundKind = 'parrotCall' | 'parrotAlarm' | 'chainsaw';
export type TraceKind = 'footprint' | 'feather' | 'sound';

export interface Trace {
  id: string;
  point: PointId;
  kind: TraceKind;
  title: string;
  /** 발견했을 때 도감에 적히는 한 줄 */
  note: string;
  image: string;
  tint?: 'green' | 'red';
  x: number;
  y: number;
  /** 숨은 흔적: 환경 측정기를 눌러야 보인다 */
  hidden?: boolean;
  sound?: SoundKind;
  /** 소리 파일이 없어도 답할 수 있게 주는 설명 */
  soundHint?: string;
}

export interface EnvSpot {
  id: string;
  point: PointId;
  title: string;
  note: string;
  image: string;
  x: number;
  y: number;
}

export const POINTS: { id: PointId; title: string; blurb: string }[] = [
  { id: 'A', title: '숲 가장자리', blurb: '도로와 가까워. 나무가 많이 베였어.' },
  { id: 'B', title: '개울가', blurb: '물이 흐르고 땅이 축축해.' },
  { id: 'C', title: '깊은 숲', blurb: '열매 나무가 빽빽해.' },
];

export const TRACES: Trace[] = [
  { id: 'foot-boot', point: 'A', kind: 'footprint', title: '부츠 발자국', note: '사람이 자주 드나든 흔적이야.', image: v2Asset('trace-footprint-boot'), x: 30, y: 74 },
  { id: 'sound-chainsaw', point: 'A', kind: 'sound', title: '먼 기계 소리', note: '전기톱 소리. 나무를 베고 있어.', image: v5Asset('trace-machine-sound'), x: 66, y: 46, sound: 'chainsaw', soundHint: '낮게 웅웅거리는 기계 소리가 오래 이어져.' },
  { id: 'feather-green', point: 'B', kind: 'feather', title: '초록 깃털', note: '지구가 여기를 지나간 길이야.', image: pageAsset(9, 10), tint: 'green', x: 30, y: 66 },
  { id: 'foot-cat', point: 'B', kind: 'footprint', title: '고양이 발자국', note: '젖은 땅에 찍힌 고양이 발자국. 숲의 새를 노릴 수 있어.', image: v2Asset('trace-footprint-cat'), x: 40, y: 78, hidden: true },
  { id: 'sound-call', point: 'B', kind: 'sound', title: '녹음된 앵무 울음', note: '지난주 녹음기에 남은 정상 울음. 지구·젤리가 편안하게 머문 흔적이야.', image: v5Asset('trace-parrot-call'), x: 72, y: 40, sound: 'parrotCall', soundHint: '짧고 맑은 소리가 리듬 있게 반복돼.' },
  { id: 'foot-parrot', point: 'C', kind: 'footprint', title: '앵무 발자국', note: '지구·젤리가 땅에 내려와 열매를 먹은 자리야.', image: v5Asset('trace-parrot-footprint'), x: 28, y: 76 },
  { id: 'feather-red', point: 'C', kind: 'feather', title: '빨강 깃털', note: '젤리도 깊은 숲까지 왔어.', image: pageAsset(9, 10), tint: 'red', x: 78, y: 62 },
  { id: 'sound-alarm', point: 'C', kind: 'sound', title: '녹음된 앵무 경계음', note: '지난주 녹음기에 남은 경계음. 지구·젤리가 위험을 느낀 흔적이야.', image: pageAsset(3, 8), x: 58, y: 34, hidden: true, sound: 'parrotAlarm', soundHint: '높고 날카로운 소리가 빠르게 이어져.' },
];

export const ENV_SPOTS: EnvSpot[] = [
  { id: 'stump', point: 'A', title: '그루터기', note: '막 베인 나무야. 톱밥이 아직 젖어 있어.', image: v2Asset('trace-stump'), x: 48, y: 62 },
  { id: 'meter', point: 'B', title: '환경 측정기', note: '온도 24도, 습도 88%. 땅이 축축해서 발자국이 잘 찍혀. 조용히 하면 작은 소리도 들려.', image: pageAsset(7, 7), x: 18, y: 50 },
  { id: 'puddle', point: 'B', title: '물웅덩이', note: '숲의 새들이 물을 마시러 오는 곳이야.', image: pageAsset(6, 7), x: 56, y: 70 },
  { id: 'fruit', point: 'C', title: '열매 나무', note: '지구·젤리도, 숲의 새들도 좋아하는 먹이야.', image: v2Asset('trace-fruit'), x: 46, y: 50 },
];

/** 숨은 흔적을 여는 환경 핫스팟 */
export const UNLOCK_SPOT = 'meter';

export const SOUND_CHOICES: { id: SoundKind; label: string }[] = [
  { id: 'parrotCall', label: '앵무 정상 울음' },
  { id: 'parrotAlarm', label: '앵무 경계음' },
  { id: 'chainsaw', label: '전기톱' },
];

/** v4 현장 흔적 — 숨은 흔적 없이 지점마다 2개씩 6개. */
export const FIELD_TRACES: Trace[] = TRACES.filter((trace) => !trace.hidden);

export const getTrace = (id: string) => TRACES.find((trace) => trace.id === id);

/** 지점에서 지금 보이는 흔적. 숨은 흔적은 측정기를 눌렀을 때만. */
export function visibleTraces(point: PointId, meterTapped: boolean): Trace[] {
  return TRACES.filter((trace) => trace.point === point && (!trace.hidden || meterTapped));
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

/** 지점별 측정값 0~10. traces 는 새 흔적 수. */
export const POINT_STATS: Record<PointId, Levels & { traces: number }> = {
  A: { logging: 3, noise: 9, water: 6, traces: 1 },
  B: { logging: 6, noise: 4, water: 9, traces: 4 },
  C: { logging: 9, noise: 2, water: 5, traces: 8 },
};

export const fewestTracePoint = (): PointId =>
  (Object.keys(POINT_STATS) as PointId[]).reduce((best, id) => (POINT_STATS[id].traces < POINT_STATS[best].traces ? id : best), 'A');

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

export type Prediction = 'up' | 'down' | 'same';
export const PREDICTIONS: { id: Prediction; label: string }[] = [
  { id: 'up', label: '늘어난다' },
  { id: 'down', label: '줄어든다' },
  { id: 'same', label: '거의 같다' },
];

export interface Trial {
  variable: CauseId;
  from: number;
  to: number;
  prediction: Prediction;
  before: number;
  after: number;
}

export const actualDirection = (before: number, after: number): Prediction =>
  Math.abs(after - before) <= 1 ? 'same' : after > before ? 'up' : 'down';

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
export function runTrial(state: ExperimentState, prediction: Prediction): { state: ExperimentState; trial: Trial } | null {
  if (!state.active) return null;
  const variable = state.active;
  const trial: Trial = {
    variable,
    from: state.baseline[variable],
    to: state.levels[variable],
    prediction,
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
  /** 예측 질문 */
  ask: string;
  /** 바꾼 뒤 값 */
  level: number;
}

/** 한 번에 하나씩 해 보는 행동 세 가지. 값은 "좋은 상태"로 바뀐다. */
export const ACTIONS: EcoAction[] = [
  { id: 'logging', label: '나무 심기', ask: '열매 나무를 심으면 새가 돌아올까?', level: 9 },
  { id: 'noise', label: '기계 소리 멈추기', ask: '전기톱 소리를 멈추면 새가 돌아올까?', level: 2 },
  { id: 'water', label: '물 채우기', ask: '웅덩이에 물을 채우면 새가 돌아올까?', level: 9 },
];

export const getAction = (id: CauseId) => ACTIONS.find((action) => action.id === id)!;

/** 지금 숲 가장자리의 새 수 */
export const edgeBirds = () => population(EDGE_LEVELS);

/** 행동 하나만 적용한 결과. 다른 조건은 그대로(EDGE_LEVELS). */
export function applyAction(id: CauseId, prediction: Prediction): Trial {
  const action = getAction(id);
  const after = population({ ...EDGE_LEVELS, [id]: action.level });
  return { variable: id, from: EDGE_LEVELS[id], to: action.level, prediction, before: edgeBirds(), after };
}

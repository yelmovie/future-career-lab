import { sample3d } from '../shared/assets';

export const HABITAT_ITEM_IDS = ['natural-perch', 'rope-bridge', 'quiet-hideout', 'foraging-puzzle', 'raised-water', 'wood-tunnel'] as const;
export type HabitatItemId = (typeof HABITAT_ITEM_IDS)[number];
export type HabitatCategory = 'rest' | 'activity' | 'water' | 'shelter';

export interface HabitatItemDefinition {
  id: HabitatItemId;
  name: string;
  shortName: string;
  cost: number;
  width: number;
  height: number;
  categories: HabitatCategory[];
  image: string;
  description: string;
}

export interface HabitatPlacement {
  instanceId: string;
  itemId: HabitatItemId;
  x: number;
  y: number;
  rotation: number;
}

export const HABITAT_ITEMS: Record<HabitatItemId, HabitatItemDefinition> = {
  'natural-perch': {
    id: 'natural-perch', name: '자연목 횃대', shortName: '자연 횃대', cost: 2, width: 26, height: 10,
    categories: ['rest'], image: sample3d(3), description: '높이와 굵기가 다른 안정적인 휴식 지점을 만들어.',
  },
  'rope-bridge': {
    id: 'rope-bridge', name: '로프 다리', shortName: '로프 다리', cost: 2, width: 28, height: 9,
    categories: ['activity'], image: sample3d(4), description: '두 지점을 잇는 움직임 경로를 만들어.',
  },
  'quiet-hideout': {
    id: 'quiet-hideout', name: '조용한 숨숨 공간', shortName: '숨숨 공간', cost: 3, width: 18, height: 18,
    categories: ['rest', 'shelter'], image: sample3d(8), description: '시선과 소리에서 잠시 벗어날 선택지를 만들어.',
  },
  'foraging-puzzle': {
    id: 'foraging-puzzle', name: '먹이 찾기 퍼즐', shortName: '먹이 퍼즐', cost: 2, width: 15, height: 15,
    categories: ['activity'], image: sample3d(5), description: '먹이를 찾고 조작하는 탐색 행동을 도와.',
  },
  'raised-water': {
    id: 'raised-water', name: '고정형 물그릇', shortName: '물그릇', cost: 1, width: 15, height: 12,
    categories: ['water'], image: sample3d(6), description: '기울지 않는 위치에서 물에 접근할 수 있게 해.',
  },
  'wood-tunnel': {
    id: 'wood-tunnel', name: '나무 터널', shortName: '나무 터널', cost: 3, width: 22, height: 16,
    categories: ['activity', 'shelter'], image: sample3d(7), description: '통과하기와 숨기 중에서 행동을 선택하게 해.',
  },
};

export interface HabitatEvaluation {
  budget: number;
  count: number;
  enoughElements: boolean;
  withinBudget: boolean;
  withinCount: boolean;
  hasWater: boolean;
  hasRest: boolean;
  hasActivity: boolean;
  entranceClear: boolean;
  noCollisions: boolean;
  connected: boolean;
  collisionPairs: [string, string][];
  strategyId: HabitatStrategyId | 'custom';
  strategyName: string;
  valid: boolean;
}

export type HabitatStrategyId = 'quiet-loop' | 'forage-levels' | 'open-balanced';

export interface HabitatStrategy {
  id: HabitatStrategyId;
  name: string;
  description: string;
  placements: HabitatPlacement[];
}

export const HABITAT_STRATEGIES: HabitatStrategy[] = [
  {
    id: 'quiet-loop',
    name: '조용한 순환 동선',
    description: '휴식 공간과 먹이 탐색을 짧은 순환 경로로 이어. 물그릇 자리는 네가 정해.',
    // 빠른 시작은 출발점일 뿐: 물그릇이 쉬는 곳에서 멀어(WATER_REACH 밖) 탈수 개체 조건이 비어 있다.
    placements: [
      { instanceId: 'quiet-perch', itemId: 'natural-perch', x: 44, y: 50, rotation: 0 },
      { instanceId: 'quiet-hideout', itemId: 'quiet-hideout', x: 79, y: 54, rotation: 0 },
      { instanceId: 'quiet-foraging', itemId: 'foraging-puzzle', x: 64, y: 24, rotation: 0 },
      { instanceId: 'quiet-water', itemId: 'raised-water', x: 20, y: 12, rotation: 0 },
    ],
  },
  {
    id: 'forage-levels',
    name: '높이별 탐색 동선',
    description: '횃대와 로프, 먹이 퍼즐을 이어 높이를 바꿔 움직이게 해. 숨을 곳은 없어.',
    // 은신처가 없어 스트레스 개체 조건이 비어 있다.
    placements: [
      { instanceId: 'levels-perch', itemId: 'natural-perch', x: 43, y: 50, rotation: 0 },
      { instanceId: 'levels-rope', itemId: 'rope-bridge', x: 71, y: 49, rotation: 90 },
      { instanceId: 'levels-foraging', itemId: 'foraging-puzzle', x: 62, y: 21, rotation: 0 },
      { instanceId: 'levels-water', itemId: 'raised-water', x: 28, y: 19, rotation: 0 },
    ],
  },
  {
    id: 'open-balanced',
    name: '열린 균형 동선',
    description: '가운데를 비우고 휴식·활동·급수 지점을 바깥쪽으로 나눠. 숨숨 공간 자리는 네가 정해.',
    // 숨숨 공간이 복도 쪽 소음 구역(LOUD_BAND)에 붙어 있어 스트레스 개체 조건이 비어 있다.
    placements: [
      { instanceId: 'open-perch', itemId: 'natural-perch', x: 42, y: 50, rotation: 0 },
      { instanceId: 'open-rope', itemId: 'rope-bridge', x: 69, y: 25, rotation: 0 },
      { instanceId: 'open-hideout', itemId: 'quiet-hideout', x: 84, y: 10, rotation: 0 },
      { instanceId: 'open-water', itemId: 'raised-water', x: 28, y: 19, rotation: 0 },
    ],
  },
];

interface Bounds { left: number; right: number; top: number; bottom: number }

export function placementBounds(placement: HabitatPlacement): Bounds {
  const item = HABITAT_ITEMS[placement.itemId];
  const rotated = Math.abs(Math.round(placement.rotation / 90)) % 2 === 1;
  const width = rotated ? item.height : item.width;
  const height = rotated ? item.width : item.height;
  return {
    left: placement.x - width / 2,
    right: placement.x + width / 2,
    top: placement.y - height / 2,
    bottom: placement.y + height / 2,
  };
}

function overlaps(a: Bounds, b: Bounds, padding = 0): boolean {
  return a.left < b.right - padding && a.right > b.left + padding && a.top < b.bottom - padding && a.bottom > b.top + padding;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function layoutConnected(placements: HabitatPlacement[]): boolean {
  if (placements.length === 0) return false;
  const entrance = { x: 15, y: 50 };
  const starts = placements.map((placement, index) => ({ placement, index })).filter(({ placement }) => distance(placement, entrance) <= 50);
  if (starts.length === 0) return false;
  const visited = new Set(starts.map(({ index }) => index));
  const queue = [...visited];
  while (queue.length) {
    const index = queue.shift();
    if (index === undefined) break;
    const current = placements[index];
    if (!current) continue;
    placements.forEach((candidate, candidateIndex) => {
      if (!visited.has(candidateIndex) && distance(current, candidate) <= 47) {
        visited.add(candidateIndex);
        queue.push(candidateIndex);
      }
    });
  }
  return visited.size === placements.length;
}

function matchStrategy(itemIds: Set<HabitatItemId>): HabitatStrategyId | 'custom' {
  if (itemIds.has('quiet-hideout') && itemIds.has('foraging-puzzle') && itemIds.has('raised-water') && itemIds.has('natural-perch')) return 'quiet-loop';
  if (itemIds.has('rope-bridge') && itemIds.has('foraging-puzzle') && itemIds.has('raised-water') && itemIds.has('natural-perch')) return 'forage-levels';
  if (itemIds.has('rope-bridge') && itemIds.has('quiet-hideout') && itemIds.has('raised-water') && itemIds.has('natural-perch')) return 'open-balanced';
  return 'custom';
}

export function evaluateHabitat(placements: HabitatPlacement[]): HabitatEvaluation {
  const budget = placements.reduce((sum, placement) => sum + HABITAT_ITEMS[placement.itemId].cost, 0);
  const collisionPairs: [string, string][] = [];
  placements.forEach((placement, index) => {
    placements.slice(index + 1).forEach((candidate) => {
      if (overlaps(placementBounds(placement), placementBounds(candidate), 1)) collisionPairs.push([placement.instanceId, candidate.instanceId]);
    });
  });
  const entranceArea: Bounds = { left: 0, right: 20, top: 34, bottom: 66 };
  const entranceClear = placements.every((placement) => !overlaps(placementBounds(placement), entranceArea));
  const categories = new Set(placements.flatMap((placement) => HABITAT_ITEMS[placement.itemId].categories));
  const ids = new Set(placements.map((placement) => placement.itemId));
  const strategyId = matchStrategy(ids);
  const strategyName = strategyId === 'custom' ? '사용자 맞춤 동선' : HABITAT_STRATEGIES.find((strategy) => strategy.id === strategyId)?.name ?? '사용자 맞춤 동선';
  const result = {
    budget,
    count: placements.length,
    enoughElements: placements.length >= 3,
    withinBudget: budget <= 8,
    withinCount: placements.length <= 4,
    hasWater: categories.has('water'),
    hasRest: categories.has('rest'),
    hasActivity: categories.has('activity'),
    entranceClear,
    noCollisions: collisionPairs.length === 0,
    connected: layoutConnected(placements),
    collisionPairs,
    strategyId,
    strategyName,
  };
  return {
    ...result,
    valid: result.enoughElements && result.withinBudget && result.withinCount && result.hasWater && result.hasRest && result.hasActivity && result.entranceClear && result.noCollisions && result.connected,
  };
}

/** S2-a 돌봄 기록에서 나온 개체별 조건. 탈수 → 물이 쉼터 가까이, 스트레스 → 은신처가 소음 쪽에서 떨어져. */
export interface HabitatConditions {
  dehydrated: boolean;
  stressed: boolean;
}

export const WATER_REACH = 36;
/** 보드 위쪽(y < LOUD_BAND) 은 복도 쪽 소음 구역 */
export const LOUD_BAND = 20;

export interface CareLogEntry { bird: 'green' | 'red'; issue: string; treatment: string }

/** 기록이 없으면(5페이지를 건너뜀) 두 조건을 모두 켠다 — 이야기상 두 마리 다 있으니까. */
export function conditionsFromCareLog(careLog: CareLogEntry[]): HabitatConditions {
  if (careLog.length === 0) return { dehydrated: true, stressed: true };
  return {
    dehydrated: careLog.some((entry) => entry.issue.includes('탈수')),
    stressed: careLog.some((entry) => entry.issue.includes('스트레스')),
  };
}

export interface ConditionCheck {
  /** 물그릇이 쉼터(횃대·숨숨 공간)에서 WATER_REACH 안에 있다. 탈수 조건이 꺼져 있으면 항상 true */
  waterNearRest: boolean;
  /** 은신처가 있고 소음 구역에 붙어 있지 않다. 스트레스 조건이 꺼져 있으면 항상 true */
  shelterQuiet: boolean;
}

export function checkConditions(placements: HabitatPlacement[], conditions: HabitatConditions): ConditionCheck {
  const water = placements.filter((placement) => HABITAT_ITEMS[placement.itemId].categories.includes('water'));
  const rest = placements.filter((placement) => HABITAT_ITEMS[placement.itemId].categories.includes('rest'));
  const shelters = placements.filter((placement) => HABITAT_ITEMS[placement.itemId].categories.includes('shelter'));
  const waterNearRest = !conditions.dehydrated || water.some((w) => rest.some((r) => distance(w, r) <= WATER_REACH));
  const shelterQuiet = !conditions.stressed || shelters.some((shelter) => placementBounds(shelter).top >= LOUD_BAND);
  return { waterNearRest, shelterQuiet };
}

export type Behavior = 'eat' | 'play' | 'rest';
export const BEHAVIOR_LABELS: Record<Behavior, string> = { eat: '먹기', play: '놀기', rest: '쉬기' };

export interface HabitatSimulationResult {
  route: number;
  comfort: number;
  safety: number;
  summary: string;
  behaviors: Record<Behavior, boolean>;
  stars: 0 | 1 | 2 | 3;
}

export function evaluateSimulation(placements: HabitatPlacement[], conditions: HabitatConditions = { dehydrated: false, stressed: false }): HabitatSimulationResult {
  const evaluation = evaluateHabitat(placements);
  const check = checkConditions(placements, conditions);
  const categories = new Set(placements.flatMap((placement) => HABITAT_ITEMS[placement.itemId].categories));
  const behaviors: Record<Behavior, boolean> = {
    eat: categories.has('water') && check.waterNearRest,
    play: categories.has('activity') && evaluation.connected,
    rest: categories.has('rest') && check.shelterQuiet,
  };
  const stars = Object.values(behaviors).filter(Boolean).length as 0 | 1 | 2 | 3;
  const route = evaluation.connected ? 88 + Math.min(8, placements.length * 2) : 48;
  const comfort = 58 + (behaviors.rest ? 16 : 0) + (behaviors.play ? 12 : 0) + (categories.has('shelter') ? 8 : 0);
  const safety = 50 + (evaluation.entranceClear ? 18 : 0) + (evaluation.noCollisions ? 18 : 0) + (evaluation.withinBudget ? 8 : 0);
  const missing = (Object.keys(behaviors) as Behavior[]).filter((key) => !behaviors[key]);
  const summary = missing.length === 0
    ? '먹고, 놀고, 쉬는 모습이 다 보였어. 꾸꾸와 앵자 모두 편안해 보여.'
    : missing.map((key) => key === 'eat'
      ? '앵자가 물까지 가다 말고 돌아왔어. 물이 쉬는 곳에서 너무 멀지 않았을까?'
      : key === 'rest'
        ? '꾸꾸가 쉴 곳을 찾다 계속 두리번거려. 숨을 곳이 있고, 시끄러운 쪽에서 떨어져 있을까?'
        : '놀이 기구까지 가는 길이 이어지지 않아 오가지 못했어. 어디가 끊겼을까?').join(' ');
  return { route: Math.min(100, route), comfort: Math.min(100, comfort), safety: Math.min(100, safety), summary, behaviors, stars };
}

export function layoutSignature(placements: HabitatPlacement[]): string {
  return [...placements]
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))
    .map((placement) => `${placement.itemId}:${Math.round(placement.x)}:${Math.round(placement.y)}:${((placement.rotation % 360) + 360) % 360}`)
    .join('|');
}

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
    description: '휴식 공간과 먹이 탐색을 짧은 순환 경로로 이어.',
    placements: [
      { instanceId: 'quiet-perch', itemId: 'natural-perch', x: 44, y: 50, rotation: 0 },
      { instanceId: 'quiet-hideout', itemId: 'quiet-hideout', x: 79, y: 54, rotation: 0 },
      { instanceId: 'quiet-foraging', itemId: 'foraging-puzzle', x: 64, y: 24, rotation: 0 },
      { instanceId: 'quiet-water', itemId: 'raised-water', x: 29, y: 20, rotation: 0 },
    ],
  },
  {
    id: 'forage-levels',
    name: '높이별 탐색 동선',
    description: '횃대와 로프, 먹이 퍼즐을 이어 높이를 바꿔 움직이게 해.',
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
    description: '가운데를 비우고 휴식·활동·급수 지점을 바깥쪽으로 나눠.',
    placements: [
      { instanceId: 'open-perch', itemId: 'natural-perch', x: 42, y: 50, rotation: 0 },
      { instanceId: 'open-rope', itemId: 'rope-bridge', x: 69, y: 25, rotation: 0 },
      { instanceId: 'open-hideout', itemId: 'quiet-hideout', x: 82, y: 55, rotation: 0 },
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

export interface HabitatSimulationResult {
  route: number;
  comfort: number;
  safety: number;
  summary: string;
}

export function evaluateSimulation(placements: HabitatPlacement[]): HabitatSimulationResult {
  const evaluation = evaluateHabitat(placements);
  const categories = new Set(placements.flatMap((placement) => HABITAT_ITEMS[placement.itemId].categories));
  const route = evaluation.connected ? 88 + Math.min(8, placements.length * 2) : 48;
  const comfort = 58 + (categories.has('rest') ? 16 : 0) + (categories.has('activity') ? 12 : 0) + (categories.has('shelter') ? 8 : 0);
  const safety = 50 + (evaluation.entranceClear ? 18 : 0) + (evaluation.noCollisions ? 18 : 0) + (evaluation.withinBudget ? 8 : 0);
  const summary = categories.has('shelter')
    ? '활동 지점 뒤에 쉴 선택지가 있어 움직임과 휴식이 자연스럽게 이어졌어.'
    : '동선은 이어졌지만 시선을 피할 조용한 선택지가 필요한지 다음 관찰에서 확인해 봐.';
  return { route: Math.min(100, route), comfort: Math.min(100, comfort), safety: Math.min(100, safety), summary };
}

export function layoutSignature(placements: HabitatPlacement[]): string {
  return [...placements]
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))
    .map((placement) => `${placement.itemId}:${Math.round(placement.x)}:${Math.round(placement.y)}:${((placement.rotation % 360) + 360) % 360}`)
    .join('|');
}

export function recommendedItemsFor(flags: string[]): HabitatItemId[] {
  const recommendations = new Set<HabitatItemId>();
  if (flags.includes('stable-perch')) recommendations.add('natural-perch');
  if (flags.includes('raised-water')) recommendations.add('raised-water');
  if (flags.includes('more-enrichment')) recommendations.add('foraging-puzzle');
  if (flags.includes('clear-entry')) recommendations.add('rope-bridge');
  if (flags.includes('quiet-route')) recommendations.add('quiet-hideout');
  return [...recommendations];
}

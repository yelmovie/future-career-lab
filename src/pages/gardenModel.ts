/** P6 새 정원 — 3구역 × 물건 4개의 단순 판정. 화면과 무관한 순수 함수. */
export type GardenSlot = 'shade' | 'perch' | 'path';
export type GardenItem = 'water' | 'hideout' | 'rope' | 'feeder';
export type GardenPlaced = Record<GardenSlot, GardenItem[]>;

export const GARDEN_SLOTS: GardenSlot[] = ['shade', 'perch', 'path'];
export const GARDEN_ITEMS: GardenItem[] = ['water', 'hideout', 'rope', 'feeder'];
export const EMPTY_GARDEN: GardenPlaced = { shade: [], perch: [], path: [] };

export interface GardenResult {
  /** 물그릇이 조용히 쉬는 곳에 있다. */
  waterQuiet: boolean;
  /** 숨는 집이 조용히 쉬는 곳에 있다. */
  hideoutQuiet: boolean;
  /** 놀이 물건은 먹고 노는 곳에 있고, 사람이 지나는 길은 비어 있다. */
  pathClear: boolean;
  stars: 0 | 1 | 2 | 3;
}

export const placedCount = (placed: GardenPlaced) => GARDEN_SLOTS.reduce((sum, slot) => sum + placed[slot].length, 0);

export function gardenStars(placed: GardenPlaced): GardenResult {
  const waterQuiet = placed.shade.includes('water');
  const hideoutQuiet = placed.shade.includes('hideout');
  const pathClear = placed.perch.includes('rope') && placed.perch.includes('feeder') && placed.path.length === 0;
  const stars = [waterQuiet, hideoutQuiet, pathClear].filter(Boolean).length as 0 | 1 | 2 | 3;
  return { waterQuiet, hideoutQuiet, pathClear, stars };
}

/** 저장된 배치를 안전하게 읽는다. 모르는 값은 버린다. */
export function readGarden(value: unknown): GardenPlaced {
  const placed: GardenPlaced = { shade: [], perch: [], path: [] };
  if (!value || typeof value !== 'object') return placed;
  const seen = new Set<GardenItem>();
  for (const slot of GARDEN_SLOTS) {
    const list = (value as Record<string, unknown>)[slot];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (GARDEN_ITEMS.includes(item as GardenItem) && !seen.has(item as GardenItem) && placed[slot].length < 2) {
        seen.add(item as GardenItem);
        placed[slot].push(item as GardenItem);
      }
    }
  }
  return placed;
}

/**
 * 놓인 물건을 보고 사육사가 주는 한 줄 힌트. 정답 자리를 그대로 말하지 않고 앵무새 입장에서 묻는다.
 * 순서: 사람 길에 놓인 것 → 물그릇 → 숨는 집 → 놀이 물건 → 다 맞으면 격려.
 */
export function gardenHint(placed: GardenPlaced): string {
  const count = placedCount(placed);
  if (count === 0) return '물건마다 어울리는 자리를 찾아보자. 지구와 젤리가 편할 곳은 어디일까?';
  if (placed.path.length > 0) return '사람이 지나는 길엔 발소리가 들려. 거기 물건이 있으면 앵무새가 놀라지 않을까?';
  const inShade = (item: GardenItem) => placed.shade.includes(item);
  const inPerch = (item: GardenItem) => placed.perch.includes(item);
  const has = (item: GardenItem) => GARDEN_SLOTS.some((slot) => placed[slot].includes(item));
  if (has('water') && !inShade('water')) return '젤리는 쉬면서 물을 마시고 싶어 해. 물그릇은 조용한 곳이 좋지 않을까?';
  if (has('hideout') && !inShade('hideout')) return '지구는 사람 소리를 피해 숨고 싶어 해. 숨는 집은 어디가 편할까?';
  if ((has('rope') && !inPerch('rope')) || (has('feeder') && !inPerch('feeder'))) return '놀이 줄과 먹이 나무는 밝고 넓은 곳에서 더 신나게 쓸 수 있어.';
  if (count < 4) return `잘하고 있어! 남은 물건 ${4 - count}개도 어울리는 자리를 찾아 줘.`;
  return '다 놓았네! 이제 불러서 정말 편한지 확인해 보자.';
}

/** P6 새 정원 — 3구역 × 물건 4개의 단순 판정. 화면과 무관한 순수 함수. */
export type GardenSlot = 'shade' | 'perch' | 'path';
export type GardenItem = 'water' | 'hideout' | 'rope' | 'feeder';
export type GardenPlaced = Record<GardenSlot, GardenItem[]>;

export const GARDEN_SLOTS: GardenSlot[] = ['shade', 'perch', 'path'];
export const GARDEN_ITEMS: GardenItem[] = ['water', 'hideout', 'rope', 'feeder'];
export const EMPTY_GARDEN: GardenPlaced = { shade: [], perch: [], path: [] };

export interface GardenResult {
  /** 물그릇이 루비가 쉬는 쪽(그늘 또는 횃대) — 루비(탈수)가 물을 마신다 */
  waterQuiet: boolean;
  /** 숨숨 상자가 왼쪽(조용한 그늘) — 모모(스트레스)가 쉰다 */
  hideoutQuiet: boolean;
  /** 관람로 쪽에 숨숨 상자·물그릇이 없다 */
  pathClear: boolean;
  stars: 0 | 1 | 2 | 3;
}

export const placedCount = (placed: GardenPlaced) => GARDEN_SLOTS.reduce((sum, slot) => sum + placed[slot].length, 0);

export function gardenStars(placed: GardenPlaced): GardenResult {
  const waterQuiet = placed.perch.includes('water') || placed.shade.includes('water');
  const hideoutQuiet = placed.shade.includes('hideout');
  const pathClear = !placed.path.includes('hideout') && !placed.path.includes('water');
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

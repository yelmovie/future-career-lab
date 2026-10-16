/** P6 새 정원 — 휴식/활동 두 공간에서 돌봄과 활동 조건을 확인한다. 먹이 나무는 두 배치가 가능하다. */
export type GardenSlot = 'shade' | 'perch';
export type GardenItem = 'water' | 'hideout' | 'rope' | 'feeder';
export type GardenPlaced = Record<GardenSlot, GardenItem[]>;

export const GARDEN_SLOTS: GardenSlot[] = ['shade', 'perch'];
export const GARDEN_ITEMS: GardenItem[] = ['water', 'hideout', 'rope', 'feeder'];
export const EMPTY_GARDEN: GardenPlaced = { shade: [], perch: [] };
export const GARDEN_CAPACITY = 3;

export interface GardenResult {
  /** 물그릇이 조용히 쉬는 곳에 있다. */
  waterQuiet: boolean;
  /** 숨는 집이 조용히 쉬는 곳에 있다. */
  hideoutQuiet: boolean;
  /** 놀이 줄은 활동 공간에, 먹이 나무는 두 공간 중 한 곳에 있다. */
  activityReady: boolean;
  stars: 0 | 1 | 2 | 3;
}

export const placedCount = (placed: GardenPlaced) => GARDEN_SLOTS.reduce((sum, slot) => sum + placed[slot].length, 0);

export function gardenStars(placed: GardenPlaced): GardenResult {
  const waterQuiet = placed.shade.includes('water');
  const hideoutQuiet = placed.shade.includes('hideout');
  const activityReady = placed.perch.includes('rope') && GARDEN_SLOTS.some((slot) => placed[slot].includes('feeder'));
  const stars = [waterQuiet, hideoutQuiet, activityReady].filter(Boolean).length as 0 | 1 | 2 | 3;
  return { waterQuiet, hideoutQuiet, activityReady, stars };
}

/** 저장된 배치를 안전하게 읽는다. 모르는 값은 버린다. */
export function readGarden(value: unknown): GardenPlaced {
  const placed: GardenPlaced = { shade: [], perch: [] };
  if (!value || typeof value !== 'object') return placed;
  const seen = new Set<GardenItem>();
  for (const slot of GARDEN_SLOTS) {
    const list = (value as Record<string, unknown>)[slot];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (GARDEN_ITEMS.includes(item as GardenItem) && !seen.has(item as GardenItem) && placed[slot].length < GARDEN_CAPACITY) {
        seen.add(item as GardenItem);
        placed[slot].push(item as GardenItem);
      }
    }
  }
  return placed;
}

/** 어느 입력 방식이든 같은 수용량과 중복 방지 규칙을 따른다. 가득 찬 곳에 놓아도 기존 배치를 보존한다. */
export function placeGardenItem(placed: GardenPlaced, item: GardenItem, slot: GardenSlot | null): GardenPlaced {
  if (!GARDEN_ITEMS.includes(item) || (slot !== null && !GARDEN_SLOTS.includes(slot))) return placed;
  if (slot && placed[slot].filter((id) => id !== item).length >= GARDEN_CAPACITY) return placed;
  const next = { shade: placed.shade.filter((id) => id !== item), perch: placed.perch.filter((id) => id !== item) };
  if (slot) next[slot].push(item);
  return next;
}

export interface GardenSession {
  placed: GardenPlaced;
  step: 1 | 2;
  tested: boolean;
  attempts: number;
  revisions: number;
}

/** 이전 버전의 배치도 이어 받는다. 시험 결과는 저장된 별을 신뢰하지 않고 현재 배치로 다시 계산한다. */
export function readGardenSession(value: unknown, legacyDraft?: unknown): GardenSession {
  const raw = value && typeof value === 'object' ? value as Partial<GardenSession> : {};
  const placed = readGarden(raw.placed ?? legacyDraft);
  const ready = placedCount(placed) === GARDEN_ITEMS.length;
  const count = (input: unknown) => typeof input === 'number' && Number.isFinite(input) && input >= 0 ? Math.floor(input) : 0;
  return { placed, step: raw.step === 2 && ready ? 2 : 1, tested: raw.tested === true && ready, attempts: count(raw.attempts), revisions: count(raw.revisions) };
}

/**
 * 놓인 물건을 보고 사육사가 주는 한 줄 힌트. 정답 자리를 그대로 말하지 않고 앵무새 입장에서 묻는다.
 * 순서: 물그릇 → 숨는 집 → 놀이 물건 → 다 맞으면 격려.
 */
export function gardenHint(placed: GardenPlaced): string {
  const count = placedCount(placed);
  if (count === 0) return '물건마다 어울리는 자리를 찾아보자. 꾸꾸와 앵자가 편할 곳은 어디일까?';
  const inShade = (item: GardenItem) => placed.shade.includes(item);
  const inPerch = (item: GardenItem) => placed.perch.includes(item);
  const has = (item: GardenItem) => GARDEN_SLOTS.some((slot) => placed[slot].includes(item));
  if (has('water') && !inShade('water')) return '앵자는 쉬면서 물을 마시고 싶어 해. 물그릇은 조용한 곳이 좋지 않을까?';
  if (has('hideout') && !inShade('hideout')) return '꾸꾸는 사람 소리를 피해 숨고 싶어 해. 숨는 집은 어디가 편할까?';
  if (has('rope') && !inPerch('rope')) return '놀이 줄은 넓은 곳에서 쓰면 쉬는 새를 방해하지 않아.';
  if (count < 4) return `잘하고 있어! 남은 물건 ${4 - count}개도 어울리는 자리를 찾아 줘.`;
  return '다 놓았네! 이제 불러서 정말 편한지 확인해 보자.';
}

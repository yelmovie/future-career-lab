import { backgroundFor, pageAsset, v2Asset } from '../shared/assets';
import { seededShuffle } from '../shared/rng';
import type { CauseId, PhotoId } from '../shared/types';

/* ---------- S1-a 드론 정찰 (게임 페이지 3) ---------- */

export interface DronePoint { x: number; y: number }
export interface DroneRect { x: number; y: number; width: number; height: number }

export const DRONE_START: DronePoint = { x: .08, y: .5 };
export const MAX_WAYPOINTS = 4;
/** 촬영 목표 3곳. 원 안에 들어오면 REC 창이 열린다. */
export const DRONE_TARGETS: readonly { id: PhotoId; name: string; x: number; y: number }[] = [
  { id: 'logging', name: '벌목지', x: .3, y: .28 },
  { id: 'stream', name: '막힌 물길', x: .6, y: .72 },
  { id: 'construction', name: '공사장', x: .82, y: .3 },
];
export const REC_RADIUS = .12;
export const REC_CENTER_RATIO = .45;

/** 바람 구간. 화살표(wind)는 바람이 부는 쪽. 목표 3곳이 각 구간 안에 있어 반드시 지나가야 하고, 어느 방향으로 지나가느냐가 배터리를 가른다. */
export interface WindZone extends DroneRect { id: string; wind: DronePoint }
const WIND_RECTS: readonly DroneRect[] = [
  { x: .14, y: .06, width: .33, height: .44 },
  { x: .43, y: .5, width: .34, height: .44 },
  { x: .64, y: .06, width: .34, height: .44 },
];
export const WIND_VECTORS = { left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } } as const;
/** 두 구간은 항상 왼쪽 바람(→ 왼쪽에서 오른쪽으로 곧장 가면 맞바람), 나머지 하나는 위·아래. 배치는 세션 시드로 섞인다. */
export function windZonesFor(seed: number): WindZone[] {
  const directions = seededShuffle<keyof typeof WIND_VECTORS>(['left', 'left', seed % 2 ? 'up' : 'down'], seed);
  return WIND_RECTS.map((rect, index) => ({ ...rect, id: `wind-${index}`, wind: WIND_VECTORS[directions[index]!] }));
}

export type WindRelation = 'head' | 'side' | 'tail' | 'calm';
export const WIND_LABEL: Record<WindRelation, string> = { head: '맞바람', side: '옆바람', tail: '뒷바람', calm: '잔잔함' };
/** 맞바람은 3배, 뒷바람은 오히려 덜 든다. 균형은 simulateFlight 테스트가 지킨다. */
export const DRAIN_MULTIPLIER: Record<WindRelation, number> = { head: 3, side: 1.3, tail: .6, calm: 1 };
export const BASE_DRAIN_PER_SECOND = 3.8;
export const NUDGE_DRAIN = .3;
export const DRONE_SPEED = .17;
export const REC_DWELL_MS = 900;

export function pointInRect(point: DronePoint, rect: DroneRect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
export function distance(a: DronePoint, b: DronePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
/** 진행 방향(단위 벡터)과 바람 방향의 내적으로 맞바람·옆바람·뒷바람을 가른다. 제자리(heading 0)는 옆바람. */
export function windRelation(point: DronePoint, heading: DronePoint, zones: readonly WindZone[]): { zone: WindZone | null; relation: WindRelation } {
  const zone = zones.find((item) => pointInRect(point, item)) ?? null;
  if (!zone) return { zone, relation: 'calm' };
  const dot = heading.x * zone.wind.x + heading.y * zone.wind.y;
  return { zone, relation: dot < -.3 ? 'head' : dot > .3 ? 'tail' : 'side' };
}
export function batteryDrain(point: DronePoint, heading: DronePoint, zones: readonly WindZone[], seconds: number): number {
  return BASE_DRAIN_PER_SECOND * DRAIN_MULTIPLIER[windRelation(point, heading, zones).relation] * seconds;
}
/** 경로를 통째로 날려 본 결과(배터리 잔량). 목표마다 REC 정지 시간을 포함하고, 이륙장 복귀까지 센다. 균형 테스트·미리보기용. */
export function simulateFlight(waypoints: readonly DronePoint[], zones: readonly WindZone[], dt = .02): number {
  let position = { ...DRONE_START };
  let heading = { x: 0, y: 0 };
  let battery = 100;
  const path = [...waypoints, DRONE_START];
  path.forEach((goal, index) => {
    for (;;) {
      const remaining = distance(position, goal);
      if (remaining < 1e-9 || battery <= 0) break;
      heading = { x: (goal.x - position.x) / remaining, y: (goal.y - position.y) / remaining };
      const step = Math.min(DRONE_SPEED * dt, remaining);
      position = { x: position.x + heading.x * step, y: position.y + heading.y * step };
      battery -= batteryDrain(position, heading, zones, step / DRONE_SPEED);
    }
    if (index < path.length - 1) battery -= batteryDrain(position, heading, zones, REC_DWELL_MS / 1000);
  });
  return Math.max(0, battery);
}
/** REC 창 판정. 원 밖이면 null, 중앙 45% 안이면 center, 그 외 edge. */
export function recQuality(dist: number): 'center' | 'edge' | null {
  if (dist > REC_RADIUS) return null;
  return dist <= REC_RADIUS * REC_CENTER_RATIO ? 'center' : 'edge';
}

export interface DronePhoto { id: PhotoId; quality: 'center' | 'edge' }
export interface DroneResult {
  photos: DronePhoto[];
  batteryRemaining: number;
  drainByZone: Record<string, number>;
  passed: boolean;
  precision: boolean;
}
export const PRECISION_BATTERY = 30;
export function evaluateFlight(input: { photos: DronePhoto[]; batteryRemaining: number; drainByZone: Record<string, number> }): DroneResult {
  const passed = input.photos.length === DRONE_TARGETS.length;
  const precision = passed && input.batteryRemaining >= PRECISION_BATTERY && input.photos.every((photo) => photo.quality === 'center');
  return { ...input, passed, precision };
}
export function photoAsset(id: PhotoId): string {
  return v2Asset(`photo-${id}`);
}

/* ---------- S1-b 증거판 (게임 페이지 4) ---------- */

export type BinId = 'sure' | 'doubt' | 'none';
export const BINS: readonly { id: BinId; label: string }[] = [
  { id: 'sure', label: '확실' },
  { id: 'doubt', label: '의심' },
  { id: 'none', label: '무관' },
];

export type DetailId = 'stump' | 'dam' | 'noise-sign';
export interface PhotoDetail { id: DetailId; photo: PhotoId; label: string; hint: string; rect: DroneRect }
/** 숨은 세부 핫스팟. rect 는 사진 크기에 대한 비율. */
export const PHOTO_DETAILS: readonly PhotoDetail[] = [
  { id: 'stump', photo: 'logging', label: '톱 자국 그루터기', hint: '갈색 땅 가운데를 잘 봐. 나무가 어떻게 잘렸지?', rect: { x: .14, y: .28, width: .32, height: .36 } },
  { id: 'dam', photo: 'stream', label: '물길 막은 자재', hint: '물이 끊긴 자리에 무엇이 놓여 있지?', rect: { x: .24, y: .34, width: .5, height: .28 } },
  { id: 'noise-sign', photo: 'construction', label: '소음 작업 표지', hint: '공사장 울타리 안, 동그란 표지판을 찾아 봐.', rect: { x: .5, y: .54, width: .12, height: .16 } },
];
/** 초등학생 손가락 기준으로 핫스팟 가장자리를 조금 넉넉하게 잡는다. */
export const DETAIL_TOUCH_PAD = .05;
export function hitDetail(photo: PhotoId, fx: number, fy: number): DetailId | null {
  const detail = PHOTO_DETAILS.find((item) => item.photo === photo && pointInRect({ x: fx, y: fy }, {
    x: item.rect.x - DETAIL_TOUCH_PAD,
    y: item.rect.y - DETAIL_TOUCH_PAD,
    width: item.rect.width + DETAIL_TOUCH_PAD * 2,
    height: item.rect.height + DETAIL_TOUCH_PAD * 2,
  }));
  return detail?.id ?? null;
}

export type FactId = 'cctv' | 'footprint' | 'silence' | 'city-night';
export interface EvidenceCard { id: PhotoId | FactId; kind: 'photo' | 'fact'; title: string; note: string; image: string }
export const FACT_CARDS: readonly EvidenceCard[] = [
  { id: 'cctv', kind: 'fact', title: 'CCTV 클립', note: '밤마다 큰 트럭이 숲길로 들어갔다 나와.', image: pageAsset(3, 4) },
  { id: 'footprint', kind: 'fact', title: '발자국 단서', note: '큰 부츠 자국이 물가까지 이어져.', image: pageAsset(3, 7) },
  { id: 'silence', kind: 'fact', title: '녹음기 기록', note: '새소리가 일주일 전부터 숲 가장자리에서 안 들려.', image: pageAsset(3, 8) },
  { id: 'city-night', kind: 'fact', title: '도시 야경', note: '도시 불빛이 예쁘게 찍혔어.', image: backgroundFor(9) },
];
export const IRRELEVANT_CARD: FactId = 'city-night';
export function photoCards(photos: readonly DronePhoto[]): EvidenceCard[] {
  const ids = photos.length ? photos.map((photo) => photo.id) : DRONE_TARGETS.map((target) => target.id);
  return ids.map((id) => ({
    id, kind: 'photo', image: photoAsset(id),
    title: `${DRONE_TARGETS.find((target) => target.id === id)?.name ?? id} 사진`,
    note: photos.find((photo) => photo.id === id)?.quality === 'edge' ? '가장자리에 찍혔어. 확대해서 모모와 루비가 갈 만한 단서를 찾아봐.' : '탭해서 확대하면 모모와 루비가 갈 만한 단서가 보여.',
  }));
}

/** 세부 ↔ 관찰 사실. 여기 없는 조합은 뒷받침하는 사진이 없는 연결이다. */
export const VALID_LINKS: readonly [DetailId, FactId][] = [
  ['stump', 'cctv'],
  ['dam', 'footprint'],
  ['noise-sign', 'silence'],
];
export function linkKey(detail: DetailId, fact: FactId): string {
  return `${detail}::${fact}`;
}
export function isValidLink(detail: DetailId, fact: FactId): boolean {
  return VALID_LINKS.some(([d, f]) => d === detail && f === fact);
}
export const LINKS_TO_UNLOCK = 2;

/** '확실' 칸에 못 넣는 이유. 사진 카드는 세부를 찾고 사실과 이었을 때, 사실 카드는 세부와 이어졌을 때만 확실. 도시 야경은 이을 수 없어 영원히 불가. */
export function sureBlocker(cardId: string, found: readonly DetailId[], links: readonly string[]): string | null {
  const detail = PHOTO_DETAILS.find((item) => item.photo === cardId);
  if (detail) {
    if (!found.includes(detail.id)) return "확대해서 세부를 찾았어? 아직이면 '의심'에 두자.";
    if (!links.some((key) => key.startsWith(`${detail.id}::`))) return "세부는 찾았어. 사실 카드와 선으로 이어야 '확실'이 돼. 그때까진 '의심'에 두자.";
    return null;
  }
  return links.some((key) => key.endsWith(`::${cardId}`)) ? null : "이 사실을 뒷받침하는 사진 세부와 이었어? 아직이면 '의심'에 두자.";
}

export const HYPOTHESES: readonly { id: CauseId; label: string; note: string }[] = [
  { id: 'logging', label: '벌목 때문', note: '열매 나무가 잘려 먹이가 없어 더 깊은 숲으로 갔을 거야.' },
  { id: 'noise', label: '소음 때문', note: '공사 소리에 놀라 조용한 곳으로 갔을 거야.' },
  { id: 'water', label: '물 때문', note: '물길이 막혀 물 있는 곳을 찾아갔을 거야.' },
];

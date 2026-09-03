import { backgroundFor, pageAsset, v2Asset } from '../shared/assets';
import { seededShuffle } from '../shared/rng';
import type { CauseId, PhotoId } from '../shared/types';

/* ---------- S1-a 드론 정찰 (게임 페이지 3) ---------- */

export interface DronePoint { x: number; y: number }
export interface DroneRect { x: number; y: number; width: number; height: number }

export const DRONE_START: DronePoint = { x: .08, y: .5 };
/** 촬영 목표 3곳. 원 안에 들어오면 REC 창이 열린다. */
export const DRONE_TARGETS: readonly { id: PhotoId; name: string; x: number; y: number }[] = [
  { id: 'logging', name: '벌목지', x: .3, y: .28 },
  { id: 'stream', name: '막힌 물길', x: .6, y: .72 },
  { id: 'construction', name: '공사장', x: .82, y: .3 },
];
export const REC_RADIUS = .12;
export const REC_CENTER_RATIO = .45;

export type WindDirection = 'head' | 'side' | 'tail';
export interface WindZone extends DroneRect { id: string; name: string; direction: WindDirection }
const WIND_RECTS: readonly DroneRect[] = [
  { x: .16, y: .1, width: .26, height: .3 },
  { x: .42, y: .5, width: .34, height: .3 },
  { x: .66, y: .1, width: .3, height: .28 },
];
const WIND_LABEL: Record<WindDirection, string> = { head: '맞바람', side: '옆바람', tail: '뒷바람' };
/** 바람 방향은 세션 시드로 섞인다. 맞바람은 배터리 2배, 뒷바람은 오히려 덜 든다. */
export function windZonesFor(seed: number): WindZone[] {
  const directions = seededShuffle<WindDirection>(['head', 'side', 'tail'], seed);
  return WIND_RECTS.map((rect, index) => ({ ...rect, id: `wind-${index}`, direction: directions[index]!, name: WIND_LABEL[directions[index]!] }));
}
export const DRAIN_MULTIPLIER: Record<WindDirection, number> = { head: 2, side: 1.3, tail: .7 };
export const BASE_DRAIN_PER_SECOND = 2.1;
export const NUDGE_DRAIN = .3;

export function pointInRect(point: DronePoint, rect: DroneRect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
export function distance(a: DronePoint, b: DronePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function batteryDrain(point: DronePoint, zones: readonly WindZone[], seconds: number): number {
  const zone = zones.find((item) => pointInRect(point, item));
  return BASE_DRAIN_PER_SECOND * (zone ? DRAIN_MULTIPLIER[zone.direction] : 1) * seconds;
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
  passes: number;
  drainByZone: Record<string, number>;
  passed: boolean;
  precision: boolean;
}
export const PRECISION_BATTERY = 30;
export function evaluateFlight(input: { photos: DronePhoto[]; batteryRemaining: number; passes: number; drainByZone: Record<string, number> }): DroneResult {
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
export function hitDetail(photo: PhotoId, fx: number, fy: number): DetailId | null {
  const detail = PHOTO_DETAILS.find((item) => item.photo === photo && pointInRect({ x: fx, y: fy }, item.rect));
  return detail?.id ?? null;
}

export type FactId = 'cctv' | 'footprint' | 'silence' | 'city-night';
export interface EvidenceCard { id: PhotoId | FactId; kind: 'photo' | 'fact'; title: string; note: string; image: string }
export const FACT_CARDS: readonly EvidenceCard[] = [
  { id: 'cctv', kind: 'fact', title: 'CCTV 클립', note: '밤마다 큰 트럭이 숲길로 들어갔다 나와.', image: pageAsset(3, 4) },
  { id: 'footprint', kind: 'fact', title: '발자국 단서', note: '큰 부츠 자국이 물가까지 이어져.', image: pageAsset(3, 7) },
  { id: 'silence', kind: 'fact', title: '녹음기 기록', note: '앵무새 울음이 일주일 전부터 안 들려.', image: pageAsset(3, 8) },
  { id: 'city-night', kind: 'fact', title: '도시 야경', note: '도시 불빛이 예쁘게 찍혔어.', image: backgroundFor(9) },
];
export const IRRELEVANT_CARD: FactId = 'city-night';
export function photoCards(photos: readonly DronePhoto[]): EvidenceCard[] {
  const ids = photos.length ? photos.map((photo) => photo.id) : DRONE_TARGETS.map((target) => target.id);
  return ids.map((id) => ({
    id, kind: 'photo', image: photoAsset(id),
    title: `${DRONE_TARGETS.find((target) => target.id === id)?.name ?? id} 사진`,
    note: photos.find((photo) => photo.id === id)?.quality === 'edge' ? '가장자리에 찍혔어. 확대해서 살펴봐.' : '탭해서 확대하면 숨은 세부가 보여.',
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

export const HYPOTHESES: readonly { id: CauseId; label: string; note: string }[] = [
  { id: 'logging', label: '벌목 때문', note: '나무가 잘려 살 곳과 먹이가 사라졌어.' },
  { id: 'noise', label: '소음 때문', note: '공사 소리에 놀라 멀리 떠났어.' },
  { id: 'water', label: '물 때문', note: '물길이 막혀 마실 물이 없어졌어.' },
];

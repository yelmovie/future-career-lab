import { PAGE_META } from './constants';
import type { PageNumber } from './types';

/** 배경은 게임 페이지 순서가 아니라 PAGE_META.background 폴더 번호를 따른다. */
export const backgroundFor = (page: PageNumber) => `/assets/backgrounds/page-${String(PAGE_META[page].background).padStart(2, '0')}.webp`;
/** folder 는 에셋 폴더 번호(page-01~10). 게임 페이지 번호가 아니다. */
export const pageAsset = (folder: number, slot: number) => `/assets/page-${String(folder).padStart(2, '0')}/slot-${String(slot).padStart(2, '0')}.webp`;
export const homeAsset = (name: 'student' | 'mentor' | 'keyart' | 'logo' | 'tagline' | 'badge' | 'parrot-pair' | 'drone') => `/assets/page-01/${name}.webp`;
export const sample3d = (slot: number) => `/assets/3d-samples/sample-${String(slot).padStart(2, '0')}.webp`;

export type V2Asset =
  | 'photo-logging' | 'photo-stream' | 'photo-construction'
  | 'badge-ecology' | 'badge-broadcast'
  | 'scene-incident' | 'scene-restored'
  | 'parrot-sick-green' | 'parrot-sick-red'
  | 'trace-footprint-cat' | 'trace-footprint-boot' | 'trace-stump' | 'trace-fruit'
  | 'reporter';
export const v2Asset = (name: V2Asset) => `/assets/v2/${name}.webp`;

/**
 * v3 서사(지구·젤리 탈출 사건)용 신규 그림 자리. 파일은 아직 없다 — docs/ASSET_REQUEST_v3.md 프롬프트로 만들어
 * public/assets/v3/ 에 넣으면 그대로 뜨고, 없으면 <img onError> 로 v2 그림으로 되돌아간다.
 */
export type V3Asset = 'scene-escape' | 'scene-found' | 'scene-reunion' | 'keeper-haneul';
export const v3Asset = (name: V3Asset) => `/assets/v3/${name}.webp`;

export type V5Asset =
  | 'closeup-green-eyes' | 'closeup-green-feathers' | 'closeup-green-behavior'
  | 'closeup-red-eyes' | 'closeup-red-water' | 'closeup-red-posture'
  | 'treat-water' | 'treat-shelter' | 'treat-puzzle' | 'treat-feather'
  | 'parrot-well-green' | 'parrot-well-red'
  | 'garden-water' | 'garden-hideout' | 'garden-play-rope' | 'garden-food-tree'
  | 'garden-zone-rest' | 'garden-zone-play' | 'garden-zone-path'
  // P7 숲 생태 조사 v6 — 그림으로 보는 "새가 왜 줄었나" (docs/ASSET_REQUEST_v6.md). 없으면 fallbackTo 로 v2 그림.
  | 'scene-edge-before' | 'scene-edge-trees' | 'scene-edge-quiet' | 'scene-edge-water'
  | 'scene-stream' | 'scene-deep'
  | 'act-plant-tree' | 'act-quiet' | 'act-fill-water' | 'bird-small'
  | 'trace-machine-sound' | 'trace-parrot-call' | 'trace-parrot-footprint'
  | 'drone-map-wide';
export const v5Asset = (name: V5Asset, extension: 'webp' | 'png' = 'webp') => `/assets/v5/${name}.${extension}`;
/** v3 그림이 없을 때 v2 그림으로 조용히 되돌린다 (한 번만). */
export const fallbackTo = (src: string) => (event: { currentTarget: HTMLImageElement }) => {
  const img = event.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = src;
};

export const FEATURE_FLAGS = {
  FEATURE_3D_PARROT_INSPECTION: false,
  FEATURE_3D_HABITAT: false,
  FEATURE_3D_DRONE: false,
} as const;

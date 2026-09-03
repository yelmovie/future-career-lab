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

export const FEATURE_FLAGS = {
  FEATURE_3D_PARROT_INSPECTION: false,
  FEATURE_3D_HABITAT: false,
  FEATURE_3D_DRONE: false,
} as const;

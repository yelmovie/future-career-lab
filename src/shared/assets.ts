import type { PageNumber } from './types';

export const backgroundFor = (page: PageNumber) => `/assets/backgrounds/page-${String(page).padStart(2, '0')}.webp`;
export const pageAsset = (page: PageNumber, slot: number) => `/assets/page-${String(page).padStart(2, '0')}/slot-${String(slot).padStart(2, '0')}.webp`;
export const homeAsset = (name: 'student' | 'mentor' | 'keyart' | 'logo' | 'tagline' | 'badge' | 'parrot-pair' | 'drone') => `/assets/page-01/${name}.webp`;
export const sample3d = (slot: number) => `/assets/3d-samples/sample-${String(slot).padStart(2, '0')}.webp`;

export const FEATURE_FLAGS = {
  FEATURE_3D_PARROT_INSPECTION: false,
  FEATURE_3D_HABITAT: false,
  FEATURE_3D_DRONE: false,
} as const;

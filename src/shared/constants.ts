import type { PageNumber, StageNumber, TraitKey } from './types';

export const CONTENT_VERSION = '2026.08';
export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_KEY = 'future-career-lab.save.v1';
export const STORAGE_POLICY_TEXT = '기록은 이 기기에만 저장돼요. 서버로 보내지 않아요.';

// Phaser 캔버스는 CSS 밖이라 --fs-* 토큰이 닿지 않는다. 전자칠판 하한 16px 을
// 캔버스에서도 지키려고 같은 위계를 상수로 둔다. Scale.RESIZE 라 값이 곧 CSS px 이다.
export const CANVAS_FONT = {
  head: '22px',
  body: '18px',
  label: '17px',
  cap: '16px',
} as const;

export const TRAIT_KEYS: TraitKey[] = [
  'exploration',
  'analysis',
  'creation',
  'care',
  'execution',
  'collaboration',
];

export const TRAIT_LABELS: Record<TraitKey, string> = {
  exploration: '새로운 곳을 살펴보기',
  analysis: '근거를 비교하기',
  creation: '만들고 개선하기',
  care: '생명과 사람을 살피기',
  execution: '계획을 실행하기',
  collaboration: '함께 조율하기',
};

export const PAGE_META: Record<PageNumber, { title: string; stage?: StageNumber; short: string }> = {
  1: { title: '미래 직업실', short: 'HOME' },
  2: { title: '내가 좋아하는 일 방식', stage: 1, short: '나를 알기' },
  3: { title: '단서로 직업 찾기', stage: 2, short: '단서 찾기' },
  4: { title: '드론 안전 촬영', stage: 2, short: '직접 해 보기' },
  5: { title: '앵무새 건강 살피기', stage: 3, short: '살펴보기' },
  6: { title: '앵무새 집 다시 만들기', stage: 3, short: '다시 만들기' },
  7: { title: '중요한 일 먼저 하기', stage: 4, short: '순서 정하기' },
  8: { title: '도시 문제 함께 풀기', stage: 5, short: '함께 풀기' },
  9: { title: '나의 일하기 지도', short: '탐험 돌아보기' },
  10: { title: '탐험 수료증', short: '최종 보상' },
};

export const STAGE_PAGES: Record<StageNumber, PageNumber[]> = {
  1: [2],
  2: [3, 4],
  3: [5, 6],
  4: [7],
  5: [8],
};

import type { JobId, PageNumber, StageNumber, TraitKey } from './types';

export const CONTENT_VERSION = '2026.09';
export const SAVE_SCHEMA_VERSION = 2;
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

/**
 * 페이지 번호는 "게임 순서"다. 에셋 폴더 번호(page-03 등)와는 다르다.
 * 에셋은 pageAsset(폴더, 슬롯)으로 폴더 번호를 직접 가리킨다.
 */
export const PAGE_META: Record<PageNumber, { title: string; stage?: StageNumber; short: string; background: number }> = {
  1: { title: '미래 직업실', short: 'HOME', background: 1 },
  2: { title: '탐험단 브리핑', short: '사건 접수', background: 2 },
  3: { title: '드론 정찰 비행', stage: 1, short: '하늘에서 보기', background: 4 },
  4: { title: '현장 증거판', stage: 1, short: '단서 잇기', background: 3 },
  5: { title: '구조된 지구와 젤리 살피기', stage: 2, short: '살펴보기', background: 5 },
  6: { title: '새 정원 다시 만들기', stage: 2, short: '다시 만들기', background: 7 },
  7: { title: '숲 생태 조사', stage: 3, short: '하나씩 바꿔 보기', background: 6 },
  8: { title: '생방송 컨트롤룸', stage: 4, short: '정확하게 알리기', background: 9 },
  9: { title: '숲 살리기 연합 작전', stage: 5, short: '함께 풀기', background: 8 },
  10: { title: '탐험 돌아보기', short: '예측과 실제', background: 3 },
  11: { title: '탐험 수료증', short: '최종 보상', background: 10 },
};

export const STAGE_PAGES: Record<StageNumber, PageNumber[]> = {
  1: [3, 4],
  2: [5, 6],
  3: [7],
  4: [8],
  5: [9],
};

export interface StageMeta {
  id: StageNumber;
  job: JobId | 'alliance';
  label: string;
  jobTitle: string;
  subtitle: string;
  goal: string;
  reward: string;
  learn: string;
  page: PageNumber;
  /** 배지 이미지 — v2 에셋 또는 기존 페이지 슬롯 */
  badge: string;
  badgeName: string;
}

export const STAGE_META: StageMeta[] = [
  { id: 1, job: 'drone', label: '드론 현장가', jobTitle: '드론 현장가', subtitle: '찍고 잇기', goal: '바람을 읽고 푸른솔 숲 위를 날아 숲 가장자리에서 달라진 곳 3곳을 찍어. 사진을 증거판에 이어 지구와 젤리가 왜 떠났을지 짐작해.', reward: '드론 배지 + 현장 사진 3장', learn: '제약 속에서 계획하고, 사진을 근거로 잇기', page: 3, badge: '/assets/page-08/slot-05.webp', badgeName: '드론 현장가 배지' },
  { id: 2, job: 'care', label: '동물돌봄 전문가', jobTitle: '동물돌봄 전문가', subtitle: '살피고 고치기', goal: '구조된 지구와 젤리는 상태가 달라. 따로 살피고, 찢어진 새 정원을 다시 만들어.', reward: '돌봄 배지 + 돌봄 기록', learn: '관찰 → 기록 → 개체마다 다른 돌봄', page: 5, badge: '/assets/page-08/slot-04.webp', badgeName: '동물돌봄 배지' },
  { id: 3, job: 'ecology', label: '생태연구가', jobTitle: '생태연구가', subtitle: '하나씩 바꾸기', goal: '숲 가장자리에서 새가 사라진 이유를 찾아. 흔적을 모으고, 조건을 하나씩 바꿔 진짜 원인을 확인해.', reward: '생태 배지 + 연구 그래프', learn: '변인을 하나씩 바꿔 원인 찾기', page: 7, badge: '/assets/v2/badge-ecology.webp', badgeName: '생태연구가 배지' },
  { id: 4, job: 'broadcast', label: '미래방송기술자', jobTitle: '미래방송기술자', subtitle: '정확히 알리기', goal: '근거 있는 자막만 골라 생방송을 완성해. 사고가 나면 순서를 정해 복구해.', reward: '방송 배지 + 방송 클립', learn: '출처가 있는 정보만 내보내기', page: 8, badge: '/assets/v2/badge-broadcast.webp', badgeName: '방송기술자 배지' },
  { id: 5, job: 'alliance', label: '네 직업 연합', jobTitle: '탐험단 연합', subtitle: '함께 풀기', goal: '네 직업이 각자 찾은 것을 둘씩 합쳐 숲 살리기 작전 3개를 끝내. 나무 심기, 물길 트기, 소음 줄이기.', reward: '연합 엠블럼 + 숲의 새소리 복귀', learn: '협업은 역할의 조합이다', page: 9, badge: '/assets/page-08/slot-10.webp', badgeName: '연합 엠블럼' },
];

export const JOB_LABELS: Record<JobId, string> = {
  drone: '드론 현장가',
  care: '동물돌봄 전문가',
  ecology: '생태연구가',
  broadcast: '미래방송기술자',
};

export const ABILITY_STATEMENTS = [
  '바람과 배터리를 생각해서 드론 경로를 짤 수 있다',
  '사진을 자세히 보고 단서를 근거로 이을 수 있다',
  '동물 두 마리를 따로 살피고 다른 돌봄을 줄 수 있다',
  '조건을 하나씩 바꿔서 원인을 찾을 수 있다',
  '출처가 있는 정보만 골라 알릴 수 있다',
  '문제에 맞는 직업을 짝지어 함께 해결할 수 있다',
];

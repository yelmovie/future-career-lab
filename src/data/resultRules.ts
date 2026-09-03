import type { GameLog, JobId, PageNumber, TraitKey } from '../shared/types';

export interface CareerFieldRule {
  id: string;
  title: string;
  copy: string;
  jobs: string[];
  tags: string[];
  weights: Record<TraitKey, number>;
  assetSlot: number;
}

export const CAREER_FIELDS: CareerFieldRule[] = [
  {
    id: 'field_animal_life',
    title: '동물·생명',
    copy: '환경과 행동을 함께 살펴보고 필요한 돌봄 조치를 생각한 장면이 있었어.',
    jobs: ['야생동물 관리원', '동물행동 연구원', '생태복원 활동가'],
    tags: ['동물·생명', '근거 관찰', '공간 설계', '판단 보류', '안전'],
    weights: { exploration: .15, analysis: .15, creation: .05, care: .35, execution: .15, collaboration: .15 },
    assetSlot: 2,
  },
  {
    id: 'field_science_research',
    title: '과학·연구',
    copy: '여러 단서를 비교하고 원인을 더 확인한 장면이 있었어.',
    jobs: ['생태 연구원', '환경 데이터 연구원', '식품 과학 연구원'],
    tags: ['근거', '결과물', '근거 확인', '재설계', '의사결정'],
    weights: { exploration: .3, analysis: .35, creation: .1, care: .05, execution: .1, collaboration: .1 },
    assetSlot: 3,
  },
  {
    id: 'field_tech_making',
    title: '기술·제작',
    copy: '도구를 조작하고 경로나 배치를 고쳐 본 장면이 있었어.',
    jobs: ['드론 정비·운용 전문가', '로봇 엔지니어', '스마트 시설 기술자'],
    tags: ['드론', '기술·제작', '공간 설계', '재설계', '현장'],
    weights: { exploration: .15, analysis: .2, creation: .3, care: .05, execution: .25, collaboration: .05 },
    assetSlot: 4,
  },
  {
    id: 'field_content_media',
    title: '콘텐츠·미디어',
    copy: '촬영 목적과 구도를 생각하고 결과를 다시 살펴본 장면이 있었어.',
    jobs: ['드론 영상 촬영가', '과학 콘텐츠 제작자', '영상 편집자'],
    tags: ['촬영', '드론', '결과물', '목적', '현장'],
    weights: { exploration: .2, analysis: .1, creation: .3, care: .05, execution: .15, collaboration: .2 },
    assetSlot: 5,
  },
  {
    id: 'field_social_service',
    title: '사회·서비스',
    copy: '다른 역할과 정보를 나누고 사람들의 안전과 안내를 챙긴 장면이 있었어.',
    jobs: ['안전 교육 기획자', '시민 안내 조정가', '보건 지원 전문가'],
    tags: ['우선순위', '복구 가능', '협업', '직업 협업', '연합 대응'],
    weights: { exploration: .1, analysis: .1, creation: .1, care: .25, execution: .15, collaboration: .3 },
    assetSlot: 6,
  },
];

export const RESULT_DISCLAIMER = '이 결과는 이번 게임에서 선택한 활동을 모아 본 거야. 잘하고 못함을 정하거나 미래 직업을 정해 주는 검사가 아니야. 다시 탐험하면 달라질 수 있어.';

/** 직업별로 그 직업 스테이지가 남긴 로그 페이지. 예측 vs 실제 비교에 쓴다. */
export const JOB_STAGE_PAGES: Record<JobId, PageNumber[]> = { drone: [3, 4], care: [5, 6], ecology: [7], broadcast: [8] };

/**
 * "실제로 가장 많이 한 직업": 그 직업 페이지 로그 수 + 로그가 준 성향 점수 합이 가장 큰 직업.
 * 동점이면 JOB_STAGE_PAGES 순서(앞 스테이지 우선). 로그가 없으면 null. 진단이 아니라 이번 플레이 기록이다.
 */
export function actualJobFromLogs(logs: readonly GameLog[]): JobId | null {
  let best: { job: JobId; score: number } | null = null;
  for (const job of Object.keys(JOB_STAGE_PAGES) as JobId[]) {
    const pages = JOB_STAGE_PAGES[job];
    const score = logs.filter((log) => pages.includes(log.page))
      .reduce((sum, log) => sum + 1 + Object.values(log.traits).reduce((inner, value) => inner + (value ?? 0), 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { job, score };
  }
  return best?.job ?? null;
}

export const PREDICTION_NOTE = '맞았든 달랐든 둘 다 의미 있어. 예측은 내가 나를 어떻게 보는지, 실제는 이번 탐험에서 내가 어떻게 움직였는지를 보여 줘.';

/** 생활 전이 상황 카드 (P10). 정답 없음 — "내 계획"을 기록한다. */
export const TRANSFER_SITUATION = {
  id: 'playground-construction',
  title: '우리 학교 옆 놀이터 공사로 새들이 안 와',
  copy: '놀이터 옆 공사가 시작된 뒤로 아침마다 오던 새들이 안 보여. 네 직업이 우리 동네에서 순서대로 무엇을 하면 좋을까? 정답은 없어. 네 계획이 답이야.',
};

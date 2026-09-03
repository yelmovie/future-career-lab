import type { Artifacts, GameLog, JobId, PageNumber, TraitKey, TraitScores } from '../shared/types';

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

/** 직업별로 그 직업 스테이지가 남긴 로그 페이지. */
export const JOB_STAGE_PAGES: Record<JobId, PageNumber[]> = { drone: [3, 4], care: [5, 6], ecology: [7], broadcast: [8] };

/** 동점 가르기에 쓰는 직업별 성향 키 */
const JOB_TRAITS: Record<JobId, TraitKey[]> = {
  drone: ['execution', 'exploration'],
  care: ['care'],
  ecology: ['analysis', 'exploration'],
  broadcast: ['execution', 'collaboration'],
};

export interface JobEvidence { job: JobId; quality: number; reason: string }

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * 직업별 "얼마나 잘 해냈나"를 0..1 로 맞춘 근거. 스테이지마다 로그 개수가 정해져 있어서
 * 로그 수로 세면 항상 같은 직업이 이기므로, 산출물(artifacts) 품질로 본다. 진단이 아니라 이번 플레이 기록이다.
 */
export function jobEvidence(artifacts: Artifacts, logs: readonly GameLog[]): JobEvidence[] {
  const has = (type: string) => logs.some((log) => log.type === type);

  const centerCount = artifacts.photos.filter((photo) => photo.quality === 'center').length;
  const centerRatio = artifacts.photos.length ? centerCount / artifacts.photos.length : 0;
  const precision = has('drone-precision');
  const drone = clamp01(centerRatio * 0.8 + (precision ? 0.2 : 0));

  const birds = new Set(artifacts.careLog.map((entry) => entry.bird));
  const bothStable = birds.has('green') && birds.has('red');
  const perfect = bothStable && has('care-perfect');
  const care = clamp01(((bothStable ? 0.5 : 0) + (perfect ? 0.5 : 0) + artifacts.habitatStars / 3) / 2);

  const mainDeclared = artifacts.graphs.some((graph) => graph.verdict === 'main');
  const ecology = clamp01((clamp01(artifacts.traces.length / 8) + (mainDeclared ? 1 : 0)) / 2);

  const broadcast = artifacts.clip ? clamp01(artifacts.clip.trust / 100 - artifacts.clip.corrections * 0.2) : 0;

  return [
    { job: 'drone', quality: drone, reason: precision ? '정밀 비행 도장까지 찍었어.' : artifacts.photos.length ? `세 곳 중 정중앙 사진 ${centerCount}장.` : '아직 비행 기록이 없어.' },
    { job: 'care', quality: care, reason: perfect ? `헛 처치 없이 두 마리를 안정시키고 회복 공간 별 ${artifacts.habitatStars}개.` : bothStable ? `두 마리를 안정시켰고 회복 공간 별 ${artifacts.habitatStars}개.` : '아직 돌봄 기록이 없어.' },
    { job: 'ecology', quality: ecology, reason: mainDeclared ? `흔적 ${artifacts.traces.length}개를 모으고 주원인을 정했어.` : artifacts.traces.length ? `흔적 ${artifacts.traces.length}개를 모았어. 주원인은 아직.` : '아직 조사 기록이 없어.' },
    { job: 'broadcast', quality: broadcast, reason: artifacts.clip ? (artifacts.clip.corrections === 0 ? `정정 없이 신뢰도 ${artifacts.clip.trust}점 클린 방송.` : `신뢰도 ${artifacts.clip.trust}점, 정정 ${artifacts.clip.corrections}회.`) : '아직 방송 기록이 없어.' },
  ];
}

/**
 * "실제로 가장 잘 움직인 직업": 산출물 품질이 가장 높은 직업. 동점이면 그 직업 성향 키(최대 성향 대비)로 살짝 가르고,
 * 그래도 같으면 스테이지 순서. 품질이 전부 0이면 null.
 */
export function actualJob(artifacts: Artifacts, logs: readonly GameLog[], traits: TraitScores): { job: JobId | null; evidence: JobEvidence[] } {
  const evidence = jobEvidence(artifacts, logs);
  const maxTrait = Math.max(1, ...Object.values(traits));
  let best: { job: JobId; score: number } | null = null;
  for (const entry of evidence) {
    if (entry.quality <= 0) continue;
    const keys = JOB_TRAITS[entry.job];
    const fit = keys.reduce((sum, key) => sum + traits[key] / maxTrait, 0) / keys.length;
    const score = entry.quality + fit * 0.05;
    if (!best || score > best.score) best = { job: entry.job, score };
  }
  return { job: best?.job ?? null, evidence };
}

export const PREDICTION_NOTE = '맞았든 달랐든 둘 다 의미 있어. 예측은 내가 나를 어떻게 보는지, 실제는 이번 탐험에서 내가 어떻게 움직였는지를 보여 줘.';

/** 생활 전이 상황 카드 (P10). 정답 없음 — "내 계획"을 기록한다. */
export const TRANSFER_SITUATION = {
  id: 'playground-construction',
  title: '우리 학교 옆 놀이터 공사로 새들이 안 와',
  copy: '놀이터 옆 공사가 시작된 뒤로 아침마다 오던 새들이 안 보여. 네 직업이 우리 동네에서 순서대로 무엇을 하면 좋을까? 정답은 없어. 네 계획이 답이야.',
};

import type { TraitKey } from '../shared/types';

export interface WorkStyleOption {
  id: string;
  title: string;
  description: string;
  traits: Partial<Record<TraitKey, number>>;
}

export interface WorkStyleScenario {
  id: string;
  title: string;
  prompt: string;
  imageSlot: number;
  options: readonly [WorkStyleOption, WorkStyleOption];
}

export const WORK_STYLE_SCENARIOS: readonly WorkStyleScenario[] = [
  {
    id: 'ws01', title: '서로 다른 관찰 기록', imageSlot: 1,
    prompt: '친구와 같은 장소를 관찰했는데 적어 온 내용이 서로 달라. 다음에는 어떻게 해 볼까?',
    options: [
      { id: 'share_compare', title: '함께 펼쳐 비교하기', description: '서로 본 것을 설명하고 공통점과 차이점을 찾는다.', traits: { collaboration: 2, care: 1 } },
      { id: 'trace_pattern', title: '기록의 규칙 찾기', description: '시간과 위치 순서로 정리해 반복되는 단서를 찾는다.', traits: { analysis: 2, execution: 1 } },
    ],
  },
  {
    id: 'ws02', title: '첫 촬영 순서', imageSlot: 2,
    prompt: '처음 맡은 촬영이라 어디서 시작할지 고민돼. 너라면 어떤 첫걸음을 고를까?',
    options: [
      { id: 'new_move', title: '새로운 움직임 시험하기', description: '짧게 움직여 보며 재미있는 화면을 발견한다.', traits: { creation: 2, exploration: 1 } },
      { id: 'known_checklist', title: '확인표부터 점검하기', description: '안전과 준비물 순서를 확인한 뒤 차근차근 시작한다.', traits: { execution: 2, analysis: 1 } },
    ],
  },
  {
    id: 'ws03', title: '가끔 울리는 센서', imageSlot: 3,
    prompt: '센서가 가끔만 울려 원인을 바로 알기 어려워. 어떻게 살펴볼까?',
    options: [
      { id: 'history_test', title: '기록을 모아 시험하기', description: '울린 시간과 조건을 모아 하나씩 확인한다.', traits: { analysis: 2, exploration: 1 } },
      { id: 'safe_detour', title: '안전한 우회로 만들기', description: '먼저 위험을 피할 방법을 마련하고 담당자와 나눈다.', traits: { execution: 2, collaboration: 1 } },
    ],
  },
  {
    id: 'ws04', title: '새 놀이 장치', imageSlot: 4,
    prompt: '동물을 위한 새 놀이 장치를 설치하려고 해. 무엇부터 할까?',
    options: [
      { id: 'watch_together', title: '함께 반응 살피기', description: '익숙한 돌봄 담당자와 거리를 두고 천천히 관찰한다.', traits: { care: 2, collaboration: 1 } },
      { id: 'prototype_first', title: '작은 모형부터 만들기', description: '안전한 재료로 작은 시제품을 시험하고 고친다.', traits: { creation: 2, execution: 1 } },
    ],
  },
  {
    id: 'ws05', title: '강변 나무의 변화', imageSlot: 5,
    prompt: '강변 나무의 잎 색이 달라졌어. 어떤 방법으로 변화를 알아볼까?',
    options: [
      { id: 'survey_marks', title: '현장 표시를 따라 조사하기', description: '여러 지점을 직접 돌아다니며 사진과 표시를 남긴다.', traits: { exploration: 2, analysis: 1 } },
      { id: 'people_records', title: '사람들의 기록 모으기', description: '근처 사람의 경험을 듣고 함께 변화 지도를 만든다.', traits: { collaboration: 2, care: 1 } },
    ],
  },
  {
    id: 'ws06', title: '어려운 전시 설명', imageSlot: 6,
    prompt: '전시 설명이 너무 어려워 친구들이 금방 지나쳐. 어떻게 바꿔 볼까?',
    options: [
      { id: 'co_make_route', title: '함께 체험 길 만들기', description: '친구들과 질문하고 만져 보는 순서를 새롭게 만든다.', traits: { creation: 2, collaboration: 1 } },
      { id: 'sort_evidence', title: '핵심 근거부터 정리하기', description: '꼭 필요한 사실을 골라 이해하기 쉬운 순서로 놓는다.', traits: { analysis: 2, execution: 1 } },
    ],
  },
  {
    id: 'ws07', title: '모두가 보기 어려운 화면', imageSlot: 7,
    prompt: '화면의 글씨와 버튼이 작아 여러 친구가 사용하기 어려워해. 무엇을 해 볼까?',
    options: [
      { id: 'rearrange_now', title: '지금 바로 보기 좋게 정리하기', description: '가장 불편한 부분부터 크게 바꾸고 사용해 보게 한다.', traits: { care: 2, execution: 1 } },
      { id: 'try_new_display', title: '새 표시 방법 시험하기', description: '소리, 모양, 색을 함께 쓰는 여러 방법을 실험한다.', traits: { exploration: 2, creation: 1 } },
    ],
  },
  {
    id: 'ws08', title: '처음 보는 작업 공간', imageSlot: 8,
    prompt: '처음 방문한 작업 공간에서 임무를 준비해야 해. 어떻게 익힐까?',
    options: [
      { id: 'walk_and_sketch', title: '걸으며 구조 그리기', description: '직접 둘러보며 중요한 위치를 빠르게 스케치한다.', traits: { exploration: 2, creation: 1 } },
      { id: 'listen_then_plan', title: '설명을 듣고 계획 세우기', description: '담당자의 주의사항을 듣고 서로 역할을 정한다.', traits: { care: 2, collaboration: 1 } },
    ],
  },
] as const;

export type CameraId = 'cam-a' | 'cam-b' | 'cam-c';
export type ClueType = '영상' | '공간' | '도구' | '음성' | '결과물' | '행동';

export interface MysteryClue {
  id: string;
  camera: CameraId;
  type: ClueType;
  title: string;
  note: string;
  x: number;
  y: number;
}

export const MYSTERY_CLUES: readonly MysteryClue[] = [
  { id: 'route-video', camera: 'cam-a', type: '영상', title: '경로 확인 영상', note: '촬영 전에 비행 길과 장애물을 먼저 확인했어.', x: .28, y: .42 },
  { id: 'brief-permit', camera: 'cam-a', type: '공간', title: '현장 브리핑과 허가표', note: '사람이 모인 구역을 피해 허가된 공간을 표시했어.', x: .72, y: .68 },
  { id: 'shared-kit', camera: 'cam-b', type: '도구', title: '공용 촬영 장비함', note: '드론, 여분 배터리, 짐벌을 팀이 함께 확인했어.', x: .33, y: .69 },
  { id: 'director-audio', camera: 'cam-b', type: '음성', title: '연출가의 음성 지시', note: '“강변의 저녁 분위기가 이어지게 찍어 주세요.”', x: .7, y: .35 },
  { id: 'shot-list', camera: 'cam-c', type: '결과물', title: '완료된 촬영 목록', note: '다리 전경, 인터뷰 대상, 강변 분위기에 완료 표시가 있어.', x: .3, y: .35 },
  { id: 'retake-behavior', camera: 'cam-c', type: '행동', title: '장면을 다시 찍는 행동', note: '화면이 흔들리자 같은 경로를 더 안정적으로 다시 날렸어.', x: .73, y: .66 },
] as const;

export const MYSTERY_CANDIDATES = [
  { id: 'drone-filmmaker', name: '드론 영상 촬영가', description: '목적에 맞는 항공 영상을 안전하게 계획하고 촬영해.' },
  { id: 'drone-inspector', name: '드론 시설 점검원', description: '높거나 위험한 시설의 상태를 촬영해 점검해.' },
  { id: 'field-researcher', name: '생태 현장 연구원', description: '현장을 관찰하고 생태 자료를 모아 분석해.' },
] as const;

export const VALID_MYSTERY_LINKS = [
  ['route-video', 'brief-permit'],
  ['director-audio', 'shot-list'],
  ['retake-behavior', 'shot-list'],
  ['shared-kit', 'route-video'],
] as const;

export const CORE_MYSTERY_LINKS = [
  ['director-audio', 'shot-list'],
  ['retake-behavior', 'shot-list'],
] as const;

export function normalizedPair(first: string, second: string): string {
  return [first, second].sort().join('::');
}

export const validMysteryLinkKeys = new Set(VALID_MYSTERY_LINKS.map(([a, b]) => normalizedPair(a, b)));
export const coreMysteryLinkKeys = new Set(CORE_MYSTERY_LINKS.map(([a, b]) => normalizedPair(a, b)));

export interface DronePoint { x: number; y: number }

export const DRONE_TARGETS = [
  { id: 'bridge', name: '다리 전경', x: .77, y: .26 },
  { id: 'interview', name: '인터뷰 대상', x: .32, y: .38 },
  { id: 'river', name: '강변 분위기', x: .58, y: .72 },
] as const;

export const DRONE_PRESETS = [
  { id: 'interview', name: '인터뷰 지점', x: .32, y: .38 },
  { id: 'bridge', name: '다리 전경 지점', x: .77, y: .26 },
  { id: 'river', name: '강변 촬영 지점', x: .58, y: .72 },
  { id: 'trees', name: '나무길 대기 지점', x: .19, y: .67 },
] as const;

export const DRONE_NO_FLY_ZONES = [
  { id: 'bridge-deck', name: '다리 위 통행 구역', x: .68, y: .41, width: .24, height: .13 },
  { id: 'crowd', name: '관람객 밀집 구역', x: .17, y: .15, width: .19, height: .13 },
  { id: 'backstage', name: '행사 장비 구역', x: .08, y: .76, width: .2, height: .14 },
] as const;

export const DRONE_WIND_ZONES = [
  { id: 'river-wind', name: '강바람', x: .45, y: .53, width: .32, height: .29 },
  { id: 'tree-gust', name: '나무 돌풍', x: .08, y: .48, width: .2, height: .23 },
] as const;

export interface DroneReview {
  purpose: number;
  safety: number;
  framing: number;
  battery: number;
  total: number;
  coveredTargets: string[];
  violations: number;
  batteryRemaining: number;
  passed: boolean;
}

export function scoreDroneFlight(input: {
  coveredTargets: number;
  violations: number;
  stableRecordSeconds: number;
  batteryRemaining: number;
}): DroneReview {
  const purposePct = Math.min(100, Math.round((input.coveredTargets / 3) * 100));
  const safetyPct = Math.max(0, 100 - input.violations * 35);
  const framingPct = Math.min(100, Math.round((input.stableRecordSeconds / 4.5) * 100));
  const batteryPct = Math.min(100, Math.round((input.batteryRemaining / 35) * 100));
  const purpose = Math.round(purposePct * .35);
  const safety = Math.round(safetyPct * .30);
  const framing = Math.round(framingPct * .20);
  const battery = Math.round(batteryPct * .15);
  const total = purpose + safety + framing + battery;
  return {
    purpose, safety, framing, battery, total,
    coveredTargets: [], violations: input.violations,
    batteryRemaining: input.batteryRemaining,
    passed: total >= 70 && purposePct >= 65 && safetyPct >= 60,
  };
}

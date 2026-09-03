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
    id: 'ws01', title: '친구와 다르게 봤어', imageSlot: 1,
    prompt: '친구와 내가 본 것이 달라. 어떻게 해 볼까?',
    options: [
      { id: 'share_compare', title: '친구와 같이 보기', description: '서로 본 것을 말하고 같은 점을 찾아.', traits: { collaboration: 2, care: 1 } },
      { id: 'trace_pattern', title: '차례대로 정리하기', description: '언제 어디서 봤는지 차례대로 놓아 봐.', traits: { analysis: 2, execution: 1 } },
    ],
  },
  {
    id: 'ws02', title: '처음 찍는 영상', imageSlot: 2,
    prompt: '처음 찍는 영상이야. 무엇부터 할까?',
    options: [
      { id: 'new_move', title: '먼저 움직여 보기', description: '짧게 움직이며 멋진 화면을 찾아.', traits: { creation: 2, exploration: 1 } },
      { id: 'known_checklist', title: '준비부터 확인하기', description: '안전과 준비물을 보고 시작해.', traits: { execution: 2, analysis: 1 } },
    ],
  },
  {
    id: 'ws03', title: '가끔 울리는 알림', imageSlot: 3,
    prompt: '알림이 가끔만 울려. 어떻게 알아볼까?',
    options: [
      { id: 'history_test', title: '울린 때를 적어 보기', description: '언제 울렸는지 모아 하나씩 살펴.', traits: { analysis: 2, exploration: 1 } },
      { id: 'safe_detour', title: '안전한 길 먼저 만들기', description: '위험을 피할 길부터 친구와 정해.', traits: { execution: 2, collaboration: 1 } },
    ],
  },
  {
    id: 'ws04', title: '새 놀이 기구', imageSlot: 4,
    prompt: '동물에게 새 놀이 기구를 주려고 해. 무엇부터 할까?',
    options: [
      { id: 'watch_together', title: '함께 천천히 살피기', description: '돌보는 사람과 멀리서 반응을 봐.', traits: { care: 2, collaboration: 1 } },
      { id: 'prototype_first', title: '작게 만들어 보기', description: '작게 만들고 시험한 뒤 고쳐.', traits: { creation: 2, execution: 1 } },
    ],
  },
  {
    id: 'ws05', title: '나뭇잎 색이 달라졌어', imageSlot: 5,
    prompt: '강가 나뭇잎 색이 달라졌어. 어떻게 알아볼까?',
    options: [
      { id: 'survey_marks', title: '직접 다니며 찍기', description: '여러 곳을 돌며 사진을 남겨.', traits: { exploration: 2, analysis: 1 } },
      { id: 'people_records', title: '사람들에게 물어보기', description: '사람들의 이야기를 모아 지도를 만들어.', traits: { collaboration: 2, care: 1 } },
    ],
  },
  {
    id: 'ws06', title: '어려운 설명', imageSlot: 6,
    prompt: '설명이 어려워서 친구들이 그냥 지나가. 어떻게 바꿀까?',
    options: [
      { id: 'co_make_route', title: '친구와 체험 만들기', description: '묻고 만져 보는 놀이로 만들어.', traits: { creation: 2, collaboration: 1 } },
      { id: 'sort_evidence', title: '중요한 말만 남기기', description: '꼭 필요한 말을 쉬운 차례로 놓아.', traits: { analysis: 2, execution: 1 } },
    ],
  },
  {
    id: 'ws07', title: '보기 힘든 화면', imageSlot: 7,
    prompt: '글씨와 버튼이 작아서 쓰기 어려워. 무엇을 할까?',
    options: [
      { id: 'rearrange_now', title: '크고 보기 좋게 바꾸기', description: '가장 불편한 곳부터 크게 바꿔.', traits: { care: 2, execution: 1 } },
      { id: 'try_new_display', title: '새 표시를 써 보기', description: '소리와 모양과 색을 함께 써 봐.', traits: { exploration: 2, creation: 1 } },
    ],
  },
  {
    id: 'ws08', title: '처음 온 곳', imageSlot: 8,
    prompt: '처음 온 곳에서 일을 해야 해. 어떻게 익힐까?',
    options: [
      { id: 'walk_and_sketch', title: '걸으며 지도 그리기', description: '직접 둘러보고 중요한 곳을 그려.', traits: { exploration: 2, creation: 1 } },
      { id: 'listen_then_plan', title: '설명 듣고 나누기', description: '조심할 점을 듣고 역할을 나눠.', traits: { care: 2, collaboration: 1 } },
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
  { id: 'route-video', camera: 'cam-a', type: '영상', title: '날아갈 길', note: '촬영 전에 날아갈 길과 막힌 곳을 먼저 확인했어.', x: .28, y: .42 },
  { id: 'brief-permit', camera: 'cam-a', type: '공간', title: '들어가도 된다는 표', note: '사람이 많은 곳을 피해 들어가도 되는 곳을 표시했어.', x: .72, y: .68 },
  { id: 'shared-kit', camera: 'cam-b', type: '도구', title: '촬영 도구 상자', note: '드론과 여분 배터리를 함께 확인했어.', x: .33, y: .69 },
  { id: 'director-audio', camera: 'cam-b', type: '음성', title: '찍어 달라는 말', note: '“강가의 저녁 모습이 이어지게 찍어 주세요.”', x: .7, y: .35 },
  { id: 'shot-list', camera: 'cam-c', type: '결과물', title: '찍을 장면 목록', note: '다리와 사람과 강가 모습에 완료 표시가 있어.', x: .3, y: .35 },
  { id: 'retake-behavior', camera: 'cam-c', type: '행동', title: '다시 찍는 모습', note: '화면이 흔들리자 같은 길을 더 안정되게 다시 날렸어.', x: .73, y: .66 },
] as const;

export const MYSTERY_CANDIDATES = [
  { id: 'drone-filmmaker', name: '드론 영상 촬영가', description: '목적에 맞는 항공 영상을 안전하게 계획하고 촬영해.' },
  { id: 'drone-inspector', name: '드론 시설 살피는 사람', description: '높거나 위험한 시설을 찍어 살펴.' },
  { id: 'field-researcher', name: '자연을 살피는 연구원', description: '자연을 보고 자료를 모아.' },
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

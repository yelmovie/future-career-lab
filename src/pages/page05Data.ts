import { sample3d } from '../shared/assets';

export type CareZoneId = 'water-feed' | 'perches' | 'enrichment' | 'entry-safety' | 'behavior';
export type ObservationStatus = 'normal' | 'follow-up' | 'uncertain';

export interface CareObservation {
  id: string;
  zoneId: CareZoneId;
  title: string;
  status: ObservationStatus;
  evidence: string;
  handoffFlag?: 'stable-perch' | 'raised-water' | 'more-enrichment' | 'clear-entry' | 'quiet-route';
  needsExpertShare?: boolean;
}

export interface CareZone {
  id: CareZoneId;
  number: number;
  title: string;
  prompt: string;
  image: string;
  hotspot: { x: number; y: number };
  observations: CareObservation[];
}

export const STATUS_META: Record<ObservationStatus, { label: string; description: string }> = {
  normal: { label: '평소 범위', description: '지금 확인한 근거에서는 안정적으로 보여.' },
  'follow-up': { label: '추가 확인', description: '한 번 더 살피거나 환경을 조정할 근거가 있어.' },
  uncertain: { label: '판단 보류', description: '한 장면만으로 정하지 않고 다음 기록과 비교해.' },
};

export const CARE_ZONES: CareZone[] = [
  {
    id: 'water-feed',
    number: 1,
    title: '물·먹이 구역',
    prompt: '양, 청결, 고정 상태를 눈에 보이는 근거로 확인해.',
    image: sample3d(6),
    hotspot: { x: 29, y: 72 },
    observations: [
      {
        id: 'water-line-clear',
        zoneId: 'water-feed',
        title: '물 높이가 기준선 안에 있어',
        status: 'normal',
        evidence: '투명 물그릇의 수면이 오전 급수 표시선과 나란해.',
      },
      {
        id: 'water-stand-tilted',
        zoneId: 'water-feed',
        title: '물그릇 고정대가 한쪽으로 기울었어',
        status: 'follow-up',
        evidence: '왼쪽 받침과 바닥 사이에 손가락 한 마디 정도 틈이 보여.',
        handoffFlag: 'raised-water',
      },
    ],
  },
  {
    id: 'perches',
    number: 2,
    title: '횃대 구역',
    prompt: '굵기와 높이가 다양하고 흔들림이 없는지 살펴봐.',
    image: sample3d(3),
    hotspot: { x: 54, y: 47 },
    observations: [
      {
        id: 'perch-variety',
        zoneId: 'perches',
        title: '서로 다른 굵기의 횃대가 있어',
        status: 'normal',
        evidence: '가는 횃대와 굵은 횃대가 각각 한 개 이상 보여 발을 바꿔 디딜 수 있어.',
      },
      {
        id: 'perch-wobble-mark',
        zoneId: 'perches',
        title: '높은 횃대 연결부에 움직인 자국이 있어',
        status: 'uncertain',
        evidence: '고정 나사 주변의 먼지가 반달 모양으로 밀려 있지만 실제 흔들림은 더 확인해야 해.',
        handoffFlag: 'stable-perch',
      },
    ],
  },
  {
    id: 'enrichment',
    number: 3,
    title: '놀이·탐색 구역',
    prompt: '사용 흔적과 안전 상태를 함께 확인해.',
    image: sample3d(5),
    hotspot: { x: 76, y: 29 },
    observations: [
      {
        id: 'foraging-used',
        zoneId: 'enrichment',
        title: '먹이 찾기 장치에 사용 흔적이 있어',
        status: 'normal',
        evidence: '종이 조각이 입구 쪽으로 밀리고 안쪽 먹이가 조금 줄어 있어.',
      },
      {
        id: 'rope-fray',
        zoneId: 'enrichment',
        title: '놀이 줄 끝이 조금 풀려 보여',
        status: 'follow-up',
        evidence: '줄 끝 세 가닥이 다른 부분보다 길게 튀어나와 교체 시점을 확인할 필요가 있어.',
        handoffFlag: 'more-enrichment',
      },
    ],
  },
  {
    id: 'entry-safety',
    number: 4,
    title: '출입 안전 구역',
    prompt: '문 잠금과 비상 동선을 먼저 확인해.',
    image: sample3d(7),
    hotspot: { x: 16, y: 38 },
    observations: [
      {
        id: 'double-latch',
        zoneId: 'entry-safety',
        title: '위·아래 잠금 장치가 모두 닫혀 있어',
        status: 'normal',
        evidence: '두 잠금 핀이 표시선 끝까지 들어가 있고 문 틈이 일정해.',
      },
      {
        id: 'entry-box',
        zoneId: 'entry-safety',
        title: '출입선 가까이에 보관 상자가 있어',
        status: 'follow-up',
        evidence: '문이 열리는 선에서 한 걸음 안쪽에 상자 모서리가 걸쳐 있어 이동이 필요해.',
        handoffFlag: 'clear-entry',
      },
    ],
  },
  {
    id: 'behavior',
    number: 5,
    title: '행동 관찰 구역',
    prompt: '한 번의 모습으로 단정하지 말고 횟수와 상황을 기록해.',
    image: sample3d(1),
    hotspot: { x: 78, y: 72 },
    observations: [
      {
        id: 'balanced-activity',
        zoneId: 'behavior',
        title: '쉬기와 탐색 행동이 번갈아 보여',
        status: 'normal',
        evidence: '5분 동안 횃대에서 쉬기와 먹이 찾기가 각각 두 번 이상 관찰됐어.',
      },
      {
        id: 'repeated-route',
        zoneId: 'behavior',
        title: '같은 이동 경로를 짧게 반복했어',
        status: 'uncertain',
        evidence: '문 앞과 높은 횃대 사이를 2분 동안 세 번 오갔어. 다음 시간대 기록과 비교해야 해.',
        handoffFlag: 'quiet-route',
        needsExpertShare: true,
      },
    ],
  },
];

export interface CareMissionResult {
  zonesVisited: number;
  observationCount: number;
  normalCount: number;
  concernCount: number;
  safetyReady: boolean;
  expertShareRequired: boolean;
  expertReady: boolean;
  ready: boolean;
}

export function getObservation(id: string): CareObservation | undefined {
  return CARE_ZONES.flatMap((zone) => zone.observations).find((observation) => observation.id === id);
}

export function evaluateCareMission(recordIds: Iterable<string>, safetyChecked: boolean, expertShared: boolean): CareMissionResult {
  const records = [...new Set(recordIds)].map(getObservation).filter((item): item is CareObservation => Boolean(item));
  const zonesVisited = new Set(records.map((record) => record.zoneId)).size;
  const normalCount = records.filter((record) => record.status === 'normal').length;
  const concernCount = records.filter((record) => record.status !== 'normal').length;
  const expertShareRequired = records.some((record) => record.needsExpertShare);
  const expertReady = !expertShareRequired || expertShared;
  return {
    zonesVisited,
    observationCount: records.length,
    normalCount,
    concernCount,
    safetyReady: safetyChecked,
    expertShareRequired,
    expertReady,
    ready: zonesVisited >= 4 && records.length >= 7 && normalCount >= 1 && concernCount >= 2 && safetyChecked && expertReady,
  };
}

export function buildCareHandoff(recordIds: Iterable<string>) {
  const records = [...new Set(recordIds)].map(getObservation).filter((item): item is CareObservation => Boolean(item));
  return {
    source: 'page05-parrot-check',
    flags: [...new Set(records.flatMap((record) => record.handoffFlag ? [record.handoffFlag] : []))],
    evidence: records.filter((record) => record.status !== 'normal').map((record) => ({
      zoneId: record.zoneId,
      observationId: record.id,
      status: record.status,
      summary: record.title,
    })),
  };
}

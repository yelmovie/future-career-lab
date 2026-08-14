export type RegionId = 'wetland' | 'bridge' | 'clinic' | 'station' | 'park';
export type JobId = 'caretaker' | 'drone' | 'health' | 'researcher' | 'engineer' | 'network';
export type JobStatus = 'ready' | 'assigned' | 'resolving' | 'cooldown';
export type RegionState = 'stable' | 'warning' | 'critical' | 'responding' | 'restored';

export interface RegionDefinition {
  id: RegionId;
  label: string;
  x: number;
  y: number;
}

export interface JobDefinition {
  id: JobId;
  label: string;
  skill: string;
  slot: number;
}

export interface IncidentDefinition {
  id: string;
  regionId: RegionId;
  title: string;
  symptom: string;
  clue: string;
  severity: 'warning' | 'critical';
  solutions: readonly (readonly JobId[])[];
  stabilityGain: number;
}

export interface IncidentSet {
  id: string;
  title: string;
  briefing: string;
  incidents: readonly IncidentDefinition[];
}

export interface JobRuntime extends JobDefinition {
  status: JobStatus;
  assignedRegion?: RegionId;
  stageAt?: number;
  resolveAt?: number;
  readyAt?: number;
}

export interface RegionRuntime extends RegionDefinition {
  state: RegionState;
  incident: IncidentDefinition;
  contributors: JobId[];
  resolvedBy?: JobId[];
}

export interface CrisisRuntime {
  jobs: Record<JobId, JobRuntime>;
  regions: Record<RegionId, RegionRuntime>;
  stability: number;
  synergiesTriggered: string[];
  feedback: string[];
}

export const REGIONS: readonly RegionDefinition[] = [
  { id: 'wetland', label: '습지 연구 구역', x: 23, y: 27 },
  { id: 'bridge', label: '에너지 다리', x: 73, y: 25 },
  { id: 'clinic', label: '생명 돌봄소', x: 50, y: 48 },
  { id: 'station', label: '연결 관제소', x: 22, y: 73 },
  { id: 'park', label: '공존 공원', x: 76, y: 72 },
] as const;

export const JOBS: readonly JobDefinition[] = [
  { id: 'caretaker', label: '동물 돌봄가', skill: '행동과 생활 환경을 살펴', slot: 4 },
  { id: 'drone', label: '드론 현장가', skill: '넓은 지역을 빠르게 확인해', slot: 5 },
  { id: 'health', label: '생명 건강가', skill: '건강 신호와 안전을 판단해', slot: 7 },
  { id: 'researcher', label: '생태 연구가', skill: '관찰 자료의 원인을 비교해', slot: 2 },
  { id: 'engineer', label: '시설 설계가', skill: '시설과 이동 경로를 복구해', slot: 6 },
  { id: 'network', label: '연결 기술가', skill: '센서와 연락망을 이어 줘', slot: 8 },
] as const;

const SET_A: IncidentSet = {
  id: 'river-signal',
  title: '강변 신호 흔들림',
  briefing: '강변 도시의 센서와 이동 경로에서 동시에 이상이 발견됐어. 생명 안전과 시설 복구를 함께 생각해 보자.',
  incidents: [
    { id: 'a-wetland', regionId: 'wetland', title: '수위 자료 불일치', symptom: '두 수위 센서의 값이 다르게 보여.', clue: '현장 모습과 관찰 자료를 함께 비교해야 해.', severity: 'warning', solutions: [['drone', 'researcher'], ['researcher', 'network']], stabilityGain: 12 },
    { id: 'a-bridge', regionId: 'bridge', title: '통행 신호 정지', symptom: '다리 일부의 안내 불빛이 꺼졌어.', clue: '전원 경로와 원격 연결을 함께 확인해야 해.', severity: 'critical', solutions: [['engineer', 'network'], ['engineer', 'drone']], stabilityGain: 14 },
    { id: 'a-clinic', regionId: 'clinic', title: '이동 동물 상태 확인', symptom: '구조된 새가 도착했지만 사전 정보가 늦고 있어.', clue: '건강 확인과 정보 연결이 모두 필요해.', severity: 'critical', solutions: [['health', 'network'], ['health', 'caretaker']], stabilityGain: 14 },
    { id: 'a-station', regionId: 'station', title: '관제 사각지대', symptom: '한 구역의 영상과 센서가 함께 끊겼어.', clue: '현장을 보거나 연결 장치를 우회할 수 있어.', severity: 'warning', solutions: [['drone', 'network'], ['engineer', 'network']], stabilityGain: 12 },
    { id: 'a-park', regionId: 'park', title: '공원 새들의 갑작스러운 이동', symptom: '새들이 평소 쉬던 곳을 피하고 있어.', clue: '행동 관찰과 환경 원인 비교가 중요해.', severity: 'warning', solutions: [['caretaker', 'researcher'], ['caretaker', 'drone']], stabilityGain: 12 },
  ],
};

const SET_B: IncidentSet = {
  id: 'heat-wave',
  title: '도시 열기 대응',
  briefing: '갑자기 기온이 올라 생명 쉼터와 도시 장비가 동시에 영향을 받고 있어. 서로 다른 직업의 관점을 이어 보자.',
  incidents: [
    { id: 'b-wetland', regionId: 'wetland', title: '습지 그늘 감소', symptom: '물가 동물들이 한쪽으로 모이고 있어.', clue: '행동 변화와 넓은 지역의 열 분포를 봐야 해.', severity: 'critical', solutions: [['caretaker', 'drone'], ['health', 'researcher']], stabilityGain: 14 },
    { id: 'b-bridge', regionId: 'bridge', title: '냉각 장치 과부하', symptom: '다리 전력 장치가 반복해서 멈춰.', clue: '장치 설계와 전력 신호를 함께 점검해야 해.', severity: 'critical', solutions: [['engineer', 'network'], ['engineer', 'researcher']], stabilityGain: 14 },
    { id: 'b-clinic', regionId: 'clinic', title: '건강 상담 급증', symptom: '더위에 지친 동물 신고가 한꺼번에 들어와.', clue: '건강 우선순위와 돌봄 공간을 함께 정해야 해.', severity: 'warning', solutions: [['health', 'caretaker'], ['health', 'network']], stabilityGain: 12 },
    { id: 'b-station', regionId: 'station', title: '온도 지도 빈칸', symptom: '센서 일부가 뜨거워져 자료를 보내지 못해.', clue: '연결을 복구하거나 다른 관찰 자료로 채울 수 있어.', severity: 'warning', solutions: [['network', 'drone'], ['network', 'researcher']], stabilityGain: 12 },
    { id: 'b-park', regionId: 'park', title: '급수대 접근 문제', symptom: '급수대 주변 길이 뜨거워 동물이 다가가지 못해.', clue: '안전한 이동 경로와 행동 관찰이 필요해.', severity: 'warning', solutions: [['engineer', 'caretaker'], ['caretaker', 'health']], stabilityGain: 12 },
  ],
};

const SET_C: IncidentSet = {
  id: 'storm-recovery',
  title: '돌풍 뒤 도시 복구',
  briefing: '짧은 돌풍 뒤 도시 곳곳에 서로 연결된 문제가 남았어. 한 가지 직업만으로 해결하려 하지 말고 근거를 이어 보자.',
  incidents: [
    { id: 'c-wetland', regionId: 'wetland', title: '관찰 표지 유실', symptom: '습지 표지 일부가 사라져 이동 경로를 알기 어려워.', clue: '넓게 찾은 위치와 기존 기록을 비교해야 해.', severity: 'warning', solutions: [['drone', 'researcher'], ['researcher', 'engineer']], stabilityGain: 12 },
    { id: 'c-bridge', regionId: 'bridge', title: '안전 난간 손상', symptom: '다리 난간 한 곳이 흔들리고 있어.', clue: '현장 범위 확인과 안전한 구조 보강이 필요해.', severity: 'critical', solutions: [['drone', 'engineer'], ['engineer', 'network']], stabilityGain: 14 },
    { id: 'c-clinic', regionId: 'clinic', title: '구조 동물 정보 단절', symptom: '구조 지점 정보가 돌봄소에 도착하지 않았어.', clue: '건강 확인을 하면서 현장 정보도 되찾아야 해.', severity: 'critical', solutions: [['health', 'network'], ['health', 'drone']], stabilityGain: 14 },
    { id: 'c-station', regionId: 'station', title: '비상 연락망 혼선', symptom: '서로 다른 두 안내가 동시에 퍼지고 있어.', clue: '연결을 바로잡고 현장 사실로 확인해야 해.', severity: 'warning', solutions: [['network', 'researcher'], ['network', 'drone']], stabilityGain: 12 },
    { id: 'c-park', regionId: 'park', title: '쉼터 가지 낙하', symptom: '동물 쉼터 주변에 부러진 가지가 떨어졌어.', clue: '동물의 안전 거리와 시설 정리를 함께 봐야 해.', severity: 'warning', solutions: [['caretaker', 'engineer'], ['caretaker', 'health']], stabilityGain: 12 },
  ],
};

export const INCIDENT_SETS: readonly IncidentSet[] = [SET_A, SET_B, SET_C] as const;

export const SYNERGIES: readonly { id: string; jobs: readonly [JobId, JobId]; label: string; bonus: number }[] = [
  { id: 'life-care', jobs: ['caretaker', 'health'], label: '생명 돌봄 연계', bonus: 7 },
  { id: 'field-data', jobs: ['drone', 'researcher'], label: '현장 데이터 연계', bonus: 6 },
  { id: 'system-repair', jobs: ['engineer', 'network'], label: '시설 복구 연계', bonus: 6 },
] as const;

export function incidentSetForSeed(seed: number): IncidentSet {
  return INCIDENT_SETS[Math.abs(seed) % INCIDENT_SETS.length] ?? SET_A;
}

export function createCrisisRuntime(set: IncidentSet): CrisisRuntime {
  const jobs = Object.fromEntries(JOBS.map((job) => [job.id, { ...job, status: 'ready' as const }])) as Record<JobId, JobRuntime>;
  const regions = REGIONS.reduce<Record<RegionId, RegionRuntime>>((result, region) => {
    const incident = set.incidents.find((candidate) => candidate.regionId === region.id);
    if (!incident) throw new Error(`Missing incident for ${region.id}`);
    result[region.id] = { ...region, incident, state: incident.severity, contributors: [] };
    return result;
  }, {} as Record<RegionId, RegionRuntime>);
  return { jobs, regions, stability: 42, synergiesTriggered: [], feedback: [] };
}

export function assignCrisisJob(runtime: CrisisRuntime, jobId: JobId, regionId: RegionId, elapsedMs: number, speedFactor = 1): CrisisRuntime {
  const job = runtime.jobs[jobId];
  const region = runtime.regions[regionId];
  if (!job || job.status !== 'ready' || region.state === 'restored') return runtime;
  return {
    ...runtime,
    jobs: {
      ...runtime.jobs,
      [jobId]: {
        ...job,
        status: 'assigned',
        assignedRegion: regionId,
        stageAt: elapsedMs + 350 * speedFactor,
        resolveAt: elapsedMs + 1500 * speedFactor,
      },
    },
    regions: { ...runtime.regions, [regionId]: { ...region, state: 'responding' } },
    feedback: [`${job.label} 직업 카드가 ${region.label} 지역으로 이동 중이야.`, ...runtime.feedback].slice(0, 4),
  };
}

function completeContribution(runtime: CrisisRuntime, job: JobRuntime, elapsedMs: number, cooldownMs: number): CrisisRuntime {
  const regionId = job.assignedRegion;
  if (!regionId) return runtime;
  const region = runtime.regions[regionId];
  const contributors = region.contributors.includes(job.id) ? region.contributors : [...region.contributors, job.id];
  const solution = region.incident.solutions.find((path) => path.every((required) => contributors.includes(required)));
  const useful = region.incident.solutions.some((path) => path.includes(job.id));
  let stability = Math.max(0, Math.min(100, runtime.stability + (useful ? 2 : -3)));
  let synergiesTriggered = runtime.synergiesTriggered;
  const feedback: string[] = [];

  for (const synergy of SYNERGIES) {
    const triggerKey = `${regionId}:${synergy.id}`;
    if (!synergiesTriggered.includes(triggerKey) && synergy.jobs.every((required) => contributors.includes(required))) {
      synergiesTriggered = [...synergiesTriggered, triggerKey];
      stability = Math.min(100, stability + synergy.bonus);
      feedback.push(`${synergy.label}가 이어져 도시 안정도가 높아졌어.`);
    }
  }

  const solved = Boolean(solution);
  if (solved) {
    stability = Math.min(100, stability + region.incident.stabilityGain);
    feedback.unshift(`${region.label}의 ${region.incident.title} 대응이 이어졌어.`);
  } else if (!useful) {
    feedback.unshift(`${job.label}의 강점은 이 단서와 거리가 있었어. 다른 연결을 찾아보자.`);
  } else {
    feedback.unshift(`${job.label}의 관점이 도움이 됐어. 한 가지 관점을 더 이어 보자.`);
  }

  return {
    ...runtime,
    stability,
    synergiesTriggered,
    jobs: {
      ...runtime.jobs,
      [job.id]: {
        ...job,
        status: 'cooldown',
        assignedRegion: undefined,
        stageAt: undefined,
        resolveAt: undefined,
        readyAt: elapsedMs + cooldownMs,
      },
    },
    regions: {
      ...runtime.regions,
      [regionId]: {
        ...region,
        contributors,
        state: solved ? 'restored' : region.incident.severity,
        resolvedBy: solution ? [...solution] : undefined,
      },
    },
    feedback: [...feedback, ...runtime.feedback].slice(0, 4),
  };
}

export function advanceCrisisRuntime(runtime: CrisisRuntime, elapsedMs: number, speedFactor = 1): CrisisRuntime {
  let next = runtime;
  for (const definition of JOBS) {
    const job = next.jobs[definition.id];
    if (job.status === 'assigned' && elapsedMs >= (job.stageAt ?? Number.POSITIVE_INFINITY)) {
      next = {
        ...next,
        jobs: { ...next.jobs, [job.id]: { ...job, status: 'resolving' } },
      };
    }
    const current = next.jobs[definition.id];
    if (current.status === 'resolving' && elapsedMs >= (current.resolveAt ?? Number.POSITIVE_INFINITY)) {
      next = completeContribution(next, current, elapsedMs, 8000 * speedFactor);
    }
    const cooled = next.jobs[definition.id];
    if (cooled.status === 'cooldown' && elapsedMs >= (cooled.readyAt ?? Number.POSITIVE_INFINITY)) {
      next = {
        ...next,
        jobs: {
          ...next.jobs,
          [cooled.id]: { ...cooled, status: 'ready', readyAt: undefined },
        },
      };
    }
  }
  return next;
}

export function crisisOutcome(runtime: CrisisRuntime) {
  const restored = REGIONS.map((region) => runtime.regions[region.id]).filter((region) => region.state === 'restored');
  const unresolved = REGIONS.map((region) => runtime.regions[region.id]).filter((region) => region.state !== 'restored');
  return {
    restored,
    unresolved,
    success: restored.length >= 4 && runtime.stability >= 55,
    synergyCount: runtime.synergiesTriggered.length,
  };
}

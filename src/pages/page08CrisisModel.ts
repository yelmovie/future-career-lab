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
  { id: 'wetland', label: '습지', x: 23, y: 27 },
  { id: 'bridge', label: '에너지 다리', x: 73, y: 25 },
  { id: 'clinic', label: '동물 돌봄소', x: 50, y: 48 },
  { id: 'station', label: '연결 센터', x: 22, y: 73 },
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
  title: '강가 도시 돕기',
  briefing: '도시 다섯 곳에 문제가 생겼어. 서로 다른 직업 두 명의 힘으로 도와 줘.',
  incidents: [
    { id: 'a-wetland', regionId: 'wetland', title: '물 높이 숫자가 달라', symptom: '두 기계가 서로 다른 숫자를 보여.', clue: '직접 본 모습과 적힌 숫자를 같이 봐야 해.', severity: 'warning', solutions: [['drone', 'researcher'], ['researcher', 'network']], stabilityGain: 12 },
    { id: 'a-bridge', regionId: 'bridge', title: '다리 불빛이 꺼졌어', symptom: '다리의 안내 불빛이 켜지지 않아.', clue: '다리 시설과 연결 장치를 같이 살펴야 해.', severity: 'critical', solutions: [['engineer', 'network'], ['engineer', 'drone']], stabilityGain: 14 },
    { id: 'a-clinic', regionId: 'clinic', title: '다친 새가 왔어', symptom: '구조한 새의 정보가 아직 오지 않았어.', clue: '새의 건강과 잃어버린 정보를 같이 찾아야 해.', severity: 'critical', solutions: [['health', 'network'], ['health', 'caretaker']], stabilityGain: 14 },
    { id: 'a-station', regionId: 'station', title: '화면이 끊겼어', symptom: '한 곳의 화면과 알림이 모두 끊겼어.', clue: '직접 가서 보거나 연결 장치를 고쳐야 해.', severity: 'warning', solutions: [['drone', 'network'], ['engineer', 'network']], stabilityGain: 12 },
    { id: 'a-park', regionId: 'park', title: '새들이 자리를 옮겼어', symptom: '새들이 늘 쉬던 곳을 피하고 있어.', clue: '새의 모습과 주변 환경을 같이 살펴야 해.', severity: 'warning', solutions: [['caretaker', 'researcher'], ['caretaker', 'drone']], stabilityGain: 12 },
  ],
};

const SET_B: IncidentSet = {
  id: 'heat-wave',
  title: '더워진 도시 돕기',
  briefing: '도시가 갑자기 너무 더워졌어. 서로 다른 직업 두 명의 힘으로 도와 줘.',
  incidents: [
    { id: 'b-wetland', regionId: 'wetland', title: '그늘이 줄었어', symptom: '물가 동물들이 한쪽에 모여 있어.', clue: '동물의 모습과 뜨거운 곳을 같이 찾아야 해.', severity: 'critical', solutions: [['caretaker', 'drone'], ['health', 'researcher']], stabilityGain: 14 },
    { id: 'b-bridge', regionId: 'bridge', title: '다리 기계가 자꾸 멈춰', symptom: '다리의 전기 장치가 자꾸 멈춰.', clue: '기계와 전기 연결을 같이 살펴야 해.', severity: 'critical', solutions: [['engineer', 'network'], ['engineer', 'researcher']], stabilityGain: 14 },
    { id: 'b-clinic', regionId: 'clinic', title: '아픈 동물이 많아졌어', symptom: '더위에 지친 동물 신고가 한꺼번에 왔어.', clue: '먼저 도울 동물과 쉴 곳을 같이 정해야 해.', severity: 'warning', solutions: [['health', 'caretaker'], ['health', 'network']], stabilityGain: 12 },
    { id: 'b-station', regionId: 'station', title: '온도 지도에 빈칸이 생겼어', symptom: '기계 몇 개가 숫자를 보내지 못해.', clue: '연결을 고치거나 직접 본 모습으로 채워야 해.', severity: 'warning', solutions: [['network', 'drone'], ['network', 'researcher']], stabilityGain: 12 },
    { id: 'b-park', regionId: 'park', title: '물 마시는 길이 뜨거워', symptom: '동물들이 물 마시는 곳에 가지 못해.', clue: '안전한 길을 만들고 동물의 모습을 살펴야 해.', severity: 'warning', solutions: [['engineer', 'caretaker'], ['caretaker', 'health']], stabilityGain: 12 },
  ],
};

const SET_C: IncidentSet = {
  id: 'storm-recovery',
  title: '센 바람 뒤 도시 돕기',
  briefing: '센 바람이 지나가고 도시 곳곳에 문제가 남았어. 서로 다른 직업 두 명의 힘으로 도와 줘.',
  incidents: [
    { id: 'c-wetland', regionId: 'wetland', title: '길 표지가 사라졌어', symptom: '표지가 없어져 다닐 길을 알기 어려워.', clue: '넓게 찾아본 위치와 옛 지도를 같이 봐야 해.', severity: 'warning', solutions: [['drone', 'researcher'], ['researcher', 'engineer']], stabilityGain: 12 },
    { id: 'c-bridge', regionId: 'bridge', title: '다리 난간이 흔들려', symptom: '다리 난간 한 곳이 흔들리고 있어.', clue: '망가진 곳을 찾고 튼튼하게 고쳐야 해.', severity: 'critical', solutions: [['drone', 'engineer'], ['engineer', 'network']], stabilityGain: 14 },
    { id: 'c-clinic', regionId: 'clinic', title: '구조한 동물 정보가 없어', symptom: '어디에서 구조했는지 정보가 오지 않았어.', clue: '건강을 살피면서 현장 정보도 찾아야 해.', severity: 'critical', solutions: [['health', 'network'], ['health', 'drone']], stabilityGain: 14 },
    { id: 'c-station', regionId: 'station', title: '안내가 서로 달라', symptom: '서로 다른 두 안내가 함께 퍼지고 있어.', clue: '연결을 바로잡고 현장에서 무엇이 맞는지 봐야 해.', severity: 'warning', solutions: [['network', 'researcher'], ['network', 'drone']], stabilityGain: 12 },
    { id: 'c-park', regionId: 'park', title: '쉼터에 가지가 떨어졌어', symptom: '동물 쉼터 옆에 부러진 가지가 있어.', clue: '동물을 안전하게 옮기고 가지를 치워야 해.', severity: 'warning', solutions: [['caretaker', 'engineer'], ['caretaker', 'health']], stabilityGain: 12 },
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
      feedback.push(`${synergy.label}가 이어져 도시 회복 점수가 높아졌어.`);
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

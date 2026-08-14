export type WorkEventStatus = 'queued' | 'active' | 'expired' | 'recovery' | 'resolved';

export interface WorkActionDefinition {
  id: string;
  label: string;
  cost: number;
  quality: 1 | 2 | 3;
  approach: string;
  evidence: string;
}

export interface WorkEventDefinition {
  id: string;
  title: string;
  signal: string;
  priorityReason: string;
  iconSlot: number;
  startsAt: number;
  expiresAt: number;
  actions: readonly WorkActionDefinition[];
  recovery: WorkActionDefinition;
}

export interface WorkEventRuntime extends WorkEventDefinition {
  status: WorkEventStatus;
  resolvedWith?: WorkActionDefinition;
  expiredAt?: number;
}

/**
 * Times are fractions of the selected run length. The primary choices cost 15 AP
 * altogether, so a player with 12 AP has to prioritise instead of clearing every
 * card with the most expensive response.
 */
export const WORK_EVENTS: readonly WorkEventDefinition[] = [
  {
    id: 'health-signal',
    title: '앵무새 건강 신호',
    signal: '평소보다 먹이 반응이 느리고 깃털을 오래 부풀리고 있어.',
    priorityReason: '생명 상태는 늦게 확인할수록 원인을 구분하기 어려워져.',
    iconSlot: 4,
    startsAt: 0,
    expiresAt: 0.25,
    actions: [
      { id: 'observe-log', label: '행동을 관찰하고 기록하기', cost: 3, quality: 3, approach: '관찰·기록', evidence: '먹이 반응과 깃털 상태를 시간과 함께 남겼어.' },
      { id: 'quiet-check', label: '조용한 곳에서 빠르게 확인하기', cost: 3, quality: 2, approach: '안전 확인', evidence: '자극을 줄이고 기본 건강 신호를 확인했어.' },
    ],
    recovery: { id: 'late-health-note', label: '늦어진 이유와 상태 남기기', cost: 0, quality: 1, approach: '복구 기록', evidence: '확인이 늦었지만 다음 근무자가 이어 볼 수 있게 상태를 남겼어.' },
  },
  {
    id: 'visitor-question',
    title: '관람객의 돌봄 질문',
    signal: '어린 관람객이 앵무새가 장난감을 부수는 이유를 묻고 있어.',
    priorityReason: '짧고 정확한 안내는 사람과 동물 모두의 안전을 돕지.',
    iconSlot: 8,
    startsAt: 0.08,
    expiresAt: 0.34,
    actions: [
      { id: 'explain-enrichment', label: '풍부화 행동을 예로 설명하기', cost: 2, quality: 3, approach: '이해 돕기', evidence: '부수는 행동이 탐색과 놀이가 될 수 있다고 쉬운 예로 설명했어.' },
      { id: 'guide-card', label: '안내 카드를 건네고 핵심 말하기', cost: 2, quality: 2, approach: '빠른 안내', evidence: '안내 자료와 한 문장 설명으로 궁금증을 풀었어.' },
    ],
    recovery: { id: 'followup-guide', label: '추가 안내 받을 곳 알려 주기', cost: 0, quality: 1, approach: '후속 안내', evidence: '바로 답하지 못했지만 정확히 확인할 수 있는 안내소를 연결했어.' },
  },
  {
    id: 'humidity-sensor',
    title: '습도 센서 이상',
    signal: '서식지 센서가 짧게 경고하고 정상으로 돌아오기를 반복해.',
    priorityReason: '환경 수치는 생명 상태와 연결되니 기록 비교가 필요해.',
    iconSlot: 7,
    startsAt: 0.17,
    expiresAt: 0.47,
    actions: [
      { id: 'compare-sensors', label: '보조 측정값과 비교하기', cost: 3, quality: 3, approach: '근거 비교', evidence: '주 센서와 보조 측정값을 비교해 기기 문제인지 환경 변화인지 좁혔어.' },
      { id: 'manual-check', label: '현장 상태를 직접 확인하기', cost: 3, quality: 2, approach: '현장 점검', evidence: '물그릇과 환기 상태를 직접 살펴 급한 위험이 없는지 확인했어.' },
    ],
    recovery: { id: 'sensor-ticket', label: '점검 요청과 수치 남기기', cost: 0, quality: 1, approach: '복구 요청', evidence: '놓친 경고 시간과 마지막 수치를 남겨 다음 점검이 이어지게 했어.' },
  },
  {
    id: 'feeding-change',
    title: '먹이 계획 변경',
    signal: '오늘 들어온 과일 양이 적어 오후 먹이 구성을 바꿔야 해.',
    priorityReason: '먹이의 양과 종류는 건강 기록을 기준으로 조정해야 해.',
    iconSlot: 6,
    startsAt: 0.30,
    expiresAt: 0.58,
    actions: [
      { id: 'review-plan', label: '기록을 보고 대체 먹이 정하기', cost: 2, quality: 3, approach: '계획 조정', evidence: '섭취 기록과 영양 기준을 보고 안전한 대체 먹이를 골랐어.' },
      { id: 'reserve-feed', label: '준비된 예비 먹이 사용하기', cost: 2, quality: 2, approach: '준비 실행', evidence: '검증된 예비 먹이로 급여 시간을 지켰어.' },
    ],
    recovery: { id: 'feeding-handoff', label: '변경하지 못한 내용 인계하기', cost: 0, quality: 1, approach: '업무 인계', evidence: '남은 먹이와 필요한 조정을 다음 담당자에게 구체적으로 인계했어.' },
  },
  {
    id: 'team-call',
    title: '현장팀 긴급 연락',
    signal: '이동장 준비 시간이 바뀌어 두 팀의 순서를 다시 맞춰야 해.',
    priorityReason: '팀 간 순서가 어긋나면 동물 이동 시간이 길어질 수 있어.',
    iconSlot: 5,
    startsAt: 0.43,
    expiresAt: 0.73,
    actions: [
      { id: 'coordinate-teams', label: '두 팀과 새 순서 조율하기', cost: 3, quality: 3, approach: '협업 조율', evidence: '각 팀의 준비 시간을 확인하고 동물 대기 시간을 줄이는 새 순서를 공유했어.' },
      { id: 'send-checklist', label: '공통 체크리스트 먼저 보내기', cost: 3, quality: 2, approach: '정보 공유', evidence: '모두가 같은 준비 기준을 보도록 체크리스트를 먼저 공유했어.' },
    ],
    recovery: { id: 'call-summary', label: '바뀐 순서를 요약해 보내기', cost: 0, quality: 1, approach: '복구 공유', evidence: '조율은 늦었지만 혼선을 줄이도록 현재 순서를 한 번에 정리했어.' },
  },
  {
    id: 'closing-report',
    title: '마감 기록 요청',
    signal: '다음 근무자가 볼 오늘의 핵심 변화 세 가지를 정리해야 해.',
    priorityReason: '관찰과 결정의 근거가 남아야 내일의 돌봄이 이어져.',
    iconSlot: 9,
    startsAt: 0.59,
    expiresAt: 0.91,
    actions: [
      { id: 'evidence-report', label: '근거와 결정까지 함께 정리하기', cost: 2, quality: 3, approach: '근거 기록', evidence: '관찰한 사실, 선택한 대응, 다음 확인점을 한 묶음으로 기록했어.' },
      { id: 'three-point-note', label: '핵심 변화 세 가지 남기기', cost: 2, quality: 2, approach: '핵심 요약', evidence: '건강, 환경, 일정 변화를 짧고 분명하게 남겼어.' },
    ],
    recovery: { id: 'minimum-handoff', label: '확인할 항목만이라도 남기기', cost: 0, quality: 1, approach: '최소 인계', evidence: '완전한 보고는 못 했지만 다음 근무자가 먼저 볼 항목을 남겼어.' },
  },
] as const;

export function createWorkEvents(): WorkEventRuntime[] {
  return WORK_EVENTS.map((event) => ({ ...event, actions: [...event.actions], status: 'queued' }));
}

/** Advances one explicit state at a time so expired cards are announced before recovery begins. */
export function advanceWorkEvents(events: readonly WorkEventRuntime[], elapsedRatio: number): WorkEventRuntime[] {
  return events.map((event) => {
    if (event.status === 'queued' && elapsedRatio >= event.startsAt) return { ...event, status: 'active' };
    if (event.status === 'active' && elapsedRatio >= event.expiresAt) {
      return { ...event, status: 'expired', expiredAt: elapsedRatio };
    }
    if (event.status === 'expired') return { ...event, status: 'recovery' };
    return event;
  });
}

export function resolveWorkEvent(
  events: readonly WorkEventRuntime[],
  eventId: string,
  action: WorkActionDefinition,
): WorkEventRuntime[] {
  return events.map((event) => event.id === eventId
    ? { ...event, status: 'resolved', resolvedWith: action }
    : event);
}

export function isWorkEventActionable(event: WorkEventRuntime): boolean {
  return event.status === 'active' || event.status === 'recovery';
}

export function workOutcome(events: readonly WorkEventRuntime[]) {
  const handled = events.filter((event) => event.status === 'resolved' && event.resolvedWith?.approach !== '복구 기록' && event.resolvedWith?.approach !== '후속 안내' && event.resolvedWith?.approach !== '복구 요청' && event.resolvedWith?.approach !== '업무 인계' && event.resolvedWith?.approach !== '복구 공유' && event.resolvedWith?.approach !== '최소 인계');
  const recovered = events.filter((event) => event.status === 'resolved' && !handled.includes(event));
  const pending = events.filter((event) => event.status !== 'resolved');
  const evidenceScore = events.reduce((sum, event) => sum + (event.resolvedWith?.quality ?? 0), 0);
  return { handled, recovered, pending, evidenceScore };
}

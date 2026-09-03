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
    title: '앵무새가 달라 보여',
    signal: '먹이에 늦게 오고 깃털을 오래 부풀리고 있어.',
    priorityReason: '아픈지 빨리 살펴야 안전하게 도울 수 있어.',
    iconSlot: 4,
    startsAt: 0,
    expiresAt: 0.25,
    actions: [
      { id: 'observe-log', label: '먹는 모습과 깃털 적기', cost: 3, quality: 3, approach: '관찰하며 적기', evidence: '먹는 모습과 깃털 상태를 시간과 함께 남겼어.' },
      { id: 'quiet-check', label: '조용한 곳에서 살펴보기', cost: 3, quality: 2, approach: '안전 살피기', evidence: '놀라지 않게 조용히 건강 상태를 살폈어.' },
    ],
    recovery: { id: 'late-health-note', label: '지금 모습이라도 적기', cost: 0, quality: 1, approach: '복구 기록', evidence: '늦었지만 다음 사람이 이어 볼 수 있게 지금 모습을 적었어.' },
  },
  {
    id: 'visitor-question',
    title: '어린이의 질문',
    signal: '한 어린이가 앵무새가 왜 장난감을 부수는지 묻고 있어.',
    priorityReason: '쉽게 알려 주면 사람과 동물 모두 안전해져.',
    iconSlot: 8,
    startsAt: 0.08,
    expiresAt: 0.34,
    actions: [
      { id: 'explain-enrichment', label: '놀이 행동이라고 쉽게 말하기', cost: 2, quality: 3, approach: '쉽게 알려 주기', evidence: '부수는 것도 앵무새에게는 놀이가 될 수 있다고 알려 줬어.' },
      { id: 'guide-card', label: '그림 카드로 알려 주기', cost: 2, quality: 2, approach: '짧게 알려 주기', evidence: '그림 카드와 짧은 말로 궁금증을 풀었어.' },
    ],
    recovery: { id: 'followup-guide', label: '물어볼 곳 알려 주기', cost: 0, quality: 1, approach: '후속 안내', evidence: '바로 답하지 못했지만 정확히 물어볼 곳을 알려 줬어.' },
  },
  {
    id: 'humidity-sensor',
    title: '습도 알림이 이상해',
    signal: '습도 알림이 울렸다가 꺼지기를 되풀이해.',
    priorityReason: '앵무새가 지내는 곳의 공기가 알맞은지 살펴야 해.',
    iconSlot: 7,
    startsAt: 0.17,
    expiresAt: 0.47,
    actions: [
      { id: 'compare-sensors', label: '다른 온습도계와 비교하기', cost: 3, quality: 3, approach: '근거 비교', evidence: '두 온습도계의 숫자를 비교해 무엇이 문제인지 좁혔어.' },
      { id: 'manual-check', label: '물과 공기를 직접 살피기', cost: 3, quality: 2, approach: '직접 보기', evidence: '물그릇과 공기가 잘 통하는지 직접 살폈어.' },
    ],
    recovery: { id: 'sensor-ticket', label: '살펴 달라고 알리기', cost: 0, quality: 1, approach: '복구 요청', evidence: '알림이 울린 때와 마지막 숫자를 남겼어.' },
  },
  {
    id: 'feeding-change',
    title: '먹이가 모자라',
    signal: '오늘 온 과일이 적어서 오후 먹이를 바꿔야 해.',
    priorityReason: '건강 기록을 보고 알맞은 먹이를 골라야 해.',
    iconSlot: 6,
    startsAt: 0.30,
    expiresAt: 0.58,
    actions: [
      { id: 'review-plan', label: '기록을 보고 다른 먹이 고르기', cost: 2, quality: 3, approach: '계획 바꾸기', evidence: '먹은 기록을 보고 안전한 다른 먹이를 골랐어.' },
      { id: 'reserve-feed', label: '준비해 둔 먹이 쓰기', cost: 2, quality: 2, approach: '준비 실행', evidence: '준비해 둔 먹이로 먹는 시간을 지켰어.' },
    ],
    recovery: { id: 'feeding-handoff', label: '다음 사람에게 알려 주기', cost: 0, quality: 1, approach: '업무 인계', evidence: '남은 먹이와 바꿀 것을 다음 사람에게 알려 줬어.' },
  },
  {
    id: 'team-call',
    title: '두 팀의 시간이 바뀌었어',
    signal: '앵무새를 옮길 시간이 바뀌어서 일의 순서를 다시 맞춰야 해.',
    priorityReason: '순서가 어긋나면 앵무새가 오래 기다려야 해.',
    iconSlot: 5,
    startsAt: 0.43,
    expiresAt: 0.73,
    actions: [
      { id: 'coordinate-teams', label: '두 팀과 새 순서 맞추기', cost: 3, quality: 3, approach: '협업으로 맞추기', evidence: '두 팀의 시간을 보고 앵무새가 덜 기다리는 순서를 나눴어.' },
      { id: 'send-checklist', label: '같은 확인표 보내기', cost: 3, quality: 2, approach: '정보 공유', evidence: '모두가 같은 준비를 보도록 확인표를 보냈어.' },
    ],
    recovery: { id: 'call-summary', label: '바뀐 순서 보내기', cost: 0, quality: 1, approach: '복구 공유', evidence: '늦었지만 헷갈리지 않게 지금 순서를 정리해 보냈어.' },
  },
  {
    id: 'closing-report',
    title: '오늘 일 적기',
    signal: '다음 사람이 볼 오늘의 중요한 변화 세 가지를 적어야 해.',
    priorityReason: '오늘 본 것과 한 일을 적어야 내일도 잘 돌볼 수 있어.',
    iconSlot: 9,
    startsAt: 0.59,
    expiresAt: 0.91,
    actions: [
      { id: 'evidence-report', label: '본 것과 한 일 함께 적기', cost: 2, quality: 3, approach: '근거 기록', evidence: '본 것과 한 일, 다음에 볼 것을 한데 적었어.' },
      { id: 'three-point-note', label: '중요한 변화 세 가지 적기', cost: 2, quality: 2, approach: '짧게 정리', evidence: '건강과 공간과 시간의 변화를 짧게 적었어.' },
    ],
    recovery: { id: 'minimum-handoff', label: '꼭 볼 것만 남기기', cost: 0, quality: 1, approach: '최소 인계', evidence: '다 적지는 못했지만 다음 사람이 먼저 볼 것을 남겼어.' },
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

export function isWorkOutcomeComplete(outcome: ReturnType<typeof workOutcome>): boolean {
  return outcome.handled.length + outcome.recovered.length >= 3;
}

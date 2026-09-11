import type { JobId } from '../shared/types';

/**
 * P9 푸른솔 숲 살리기 릴레이 — 지도 위 위험 지점 3곳을 네 직업이 차례로 힘을 보태 고친다.
 * 화면과 무관한 순수 데이터·판정.
 *
 * 흐름: 혼자 출동(한 직업만 골라 보내 봄 → 맡은 역할만 하고 숲은 그대로)
 *   → 작전 3개, 작전마다 릴레이 4턴(드론: 지도에서 찾기 / 생태: 왜 그런지 흔적 고르기 /
 *     돌봄: 새가 돌아올 때까지 챙길 것 고르기 / 방송: 확인된 말만 골라 사람 모으기)
 *   → 엔딩(핀 3개 초록 + 함께한 직업 넷).
 */
export type MissionId = 'trees' | 'water' | 'quiet';
export type EcoClue = 'stump' | 'dry' | 'noise';
export type CareItem = 'food' | 'water' | 'hide' | 'rope';

/** 릴레이 순서 — 찾고(드론) → 알아내고(생태) → 돌보고(돌봄) → 알린다(방송). */
export const RELAY: readonly JobId[] = ['drone', 'ecology', 'care', 'broadcast'];
export const JOB_ORDER = RELAY;
export const TURNS_PER_MISSION = RELAY.length;

/** 각 직업의 "힘" 한 줄 — 배지 아래·도움말·엔딩에 같이 적힌다. */
export const JOB_POWER: Record<JobId, string> = {
  drone: '하늘에서 찾기',
  ecology: '원인 조사하기',
  care: '새를 돌보기',
  broadcast: '사람들 모으기',
};

/** 각 턴에서 그 직업이 하는 말 — 자기 힘을 소개하고 뭘 누를지 짚는다. 정답은 말하지 않는다. */
export const TURN_LINE: Record<JobId, string> = {
  drone: '하늘에서 찾는 건 내 힘이야. 지도에서 문제가 있는 자리를 눌러 봐.',
  ecology: '왜 그런지 알아내는 게 내 힘이야. 새가 떠난 이유를 골라 봐.',
  care: '새가 돌아올 때까지 돌보는 게 내 힘이야. 지금 새들한테 꼭 필요한 걸 골라.',
  broadcast: '사람들을 모으는 게 내 힘이야. 확인된 말만 골라 방송하자.',
};

/** 혼자 출동했을 때 — 할 수 있는 것 하나, 못 하는 것 셋. */
export interface SoloResult { did: string; couldNot: readonly string[] }
export const SOLO: Record<JobId, SoloResult> = {
  drone: {
    did: '하늘에서 나무가 베인 자리를 찾았어!',
    couldNot: ['사진만으로 원인을 단정하진 않아', '회복 방법은 생태·돌봄 팀과 정해', '확인한 자료는 방송 팀에 전달해'],
  },
  ecology: {
    did: '새가 떠난 이유를 알아냈어. 나무가 베여서야!',
    couldNot: ['넓은 현장 사진은 드론 팀과 모아', '새의 상태는 돌봄 팀과 확인해', '조사 결과는 방송 팀과 함께 알려'],
  },
  care: {
    did: '지구와 젤리를 잘 돌봤어!',
    couldNot: ['돌봄과 함께 숲 환경도 바꿔야 해', '현장 위치와 원인은 조사 팀과 찾아', '도움 요청은 방송 팀과 준비해'],
  },
  broadcast: {
    did: '생방송을 켰어!',
    couldNot: ['방송할 사진과 원인 자료가 필요해', '돌봄 팀이 확인한 변화도 함께 알려', '확인 안 된 말은 방송하면 안 돼'],
  },
};

export interface Pin { x: number; y: number }
/** 말 카드 위에 붙는 그림 — 출처가 무엇인지 한눈에 보이게. */
export type SayArt = 'graph' | 'rumor' | 'record' | 'photo-logging' | 'photo-stream' | 'photo-construction';
export interface SayOption { id: 'ok' | 'rumor' | 'other'; text: string; lines?: readonly string[]; source: string; art: SayArt; why?: string }

export interface Mission {
  id: MissionId;
  title: string;
  /** 무엇이 문제인지 — 앞 스테이지에서 본 것 */
  problem: string;
  /** 지도(v5 drone-map-wide) 위 위치, 그림 % */
  pin: Pin;
  /** 지도 핀 옆 짧은 이름 */
  place: string;
  /** 드론 턴: 틀린 곳을 눌렀을 때 */
  droneHint: string;
  /** 생태 턴: 새가 떠난 이유 */
  clue: EcoClue;
  clueHints: Partial<Record<EcoClue, string>>;
  /** 돌봄 턴: 새가 돌아올 때까지 챙길 것 */
  care: CareItem;
  careHints: Partial<Record<CareItem, string>>;
  /** 방송 턴: 말 3개 중 확인된 것 */
  says: readonly SayOption[];
  /** 성공했을 때 무슨 일이 생기는지 */
  result: string;
  /** 릴레이 결과 카드: 직업별 "한 일" */
  did: Record<JobId, string>;
}

export const ECO_OPTIONS: readonly { id: EcoClue; label: string }[] = [
  { id: 'stump', label: '나무가 베였어' },
  { id: 'dry', label: '개울이 막혀 말랐어' },
  { id: 'noise', label: '기계 소리가 시끄러워' },
];

export const CARE_OPTIONS: readonly { id: CareItem; label: string; caption: string }[] = [
  { id: 'food', label: '먹이 나무', caption: '배고플 때' },
  { id: 'water', label: '물그릇', caption: '목마를 때' },
  { id: 'hide', label: '숨는 집', caption: '놀랐을 때' },
  { id: 'rope', label: '놀이 밧줄', caption: '심심할 때' },
];

export const MISSIONS: readonly Mission[] = [
  {
    id: 'trees',
    title: '열매 나무 다시 심기',
    problem: '숲 가장자리 나무가 베여서 새들이 먹을 게 없어.',
    pin: { x: 36, y: 40 },
    place: '베인 자리',
    droneHint: '거긴 아니야. 그루터기가 잔뜩 있는 갈색 땅을 찾아 봐.',
    clue: 'stump',
    clueHints: { dry: '개울은 아직 흐르고 있어. 새들이 먹을 게 왜 없어졌을까?', noise: '여긴 공사장에서 멀어. 열매가 열리던 나무는 어디 갔지?' },
    care: 'food',
    careHints: { water: '물그릇은 목마를 때. 지금 새들은 먹을 열매가 없어!', hide: '숨는 집은 놀랐을 때. 지금 새들은 배가 고파!', rope: '놀이 밧줄은 심심할 때. 지금 새들은 배가 고파!' },
    says: [
      { id: 'ok', text: '하늘 사진과 조사로 확인했어요. 베인 자리에 열매 나무를 같이 심어 주세요!', lines: ['하늘 사진과 조사로 확인했어요.', '베인 자리에 열매 나무를', '같이 심어 주세요!'], source: '드론 사진 · 생태 조사', art: 'photo-logging' },
      { id: 'rumor', text: '누가 그러던데, 숲에 나무는 저절로 자란대요. 그냥 두면 돼요.', lines: ['누가 그러던데,', '숲에 나무는 저절로 자란대요.', '그냥 두면 돼요.'], source: '누가 그러던데', art: 'rumor', why: '"누가 그러던데"는 확인된 말이 아니야. 우리가 직접 본 걸 말하자.' },
      { id: 'other', text: '개울에 쌓인 자재를 치우러 모여 주세요!', lines: ['개울에 쌓인 자재를', '치우러 모여 주세요!'], source: '드론 사진', art: 'photo-stream', why: '그건 다음 작전이야. 지금은 베인 나무 얘기를 하자.' },
    ],
    result: '시민들이 모여 베인 자리에 열매 나무를 심었어. 새들이 먹을 게 다시 생겨!',
    did: { drone: '베인 자리를 찾음', ecology: '이유: 나무가 베여서', care: '먹이 나무로 새를 돌봄', broadcast: '나무 심기 도움을 요청' },
  },
  {
    id: 'water',
    title: '막힌 개울 다시 흐르게',
    problem: '개울이 통나무와 자재에 막혀 말랐고, 새들이 마실 물이 없어.',
    pin: { x: 61, y: 66 },
    place: '막힌 물길',
    droneHint: '거긴 아니야. 통나무가 물을 막고 있는 곳을 찾아 봐.',
    clue: 'dry',
    clueHints: { stump: '베인 자리는 아까 고쳤잖아. 이번엔 새들이 왜 목말라할까?', noise: '여긴 조용한 개울이야. 물이 왜 안 흐르지?' },
    care: 'water',
    careHints: { food: '먹이는 이미 열매 나무가 있어. 지금 새들은 목이 말라!', hide: '숨는 집은 놀랐을 때. 지금 새들은 목이 말라!', rope: '놀이 밧줄은 심심할 때. 지금 새들은 목이 말라!' },
    says: [
      { id: 'ok', text: '개울이 자재에 막힌 걸 확인했어요. 자재를 치우러 같이 모여 주세요!', lines: ['개울이 자재에 막힌 걸', '확인했어요. 자재를 치우러', '같이 모여 주세요!'], source: '드론 사진 · 돌봄 기록', art: 'record' },
      { id: 'rumor', text: 'SNS에서 봤는데, 새들은 물을 안 마셔도 된대요.', lines: ['SNS에서 봤는데,', '새들은 물을 안 마셔도 된대요.'], source: 'SNS 제보', art: 'rumor', why: 'SNS 제보는 누가 봤는지 몰라. 젤리가 목말랐던 돌봄 기록이 있잖아.' },
      { id: 'other', text: '베인 자리에 열매 나무를 심어 주세요!', lines: ['베인 자리에 열매 나무를', '심어 주세요!'], source: '드론 사진', art: 'photo-logging', why: '나무는 이미 심었어. 지금은 막힌 개울 얘기를 하자.' },
    ],
    result: '시민들이 자재를 치워 개울이 다시 흘러. 새들이 물을 마셔!',
    did: { drone: '막힌 물길을 찾음', ecology: '이유: 개울이 막혀서', care: '물그릇으로 새를 돌봄', broadcast: '물길 정리 도움을 요청' },
  },
  {
    id: 'quiet',
    title: '공사 소음 줄이기 약속',
    problem: '숲 옆 공사장 기계 소리에 새들이 놀라서 떠나.',
    pin: { x: 80, y: 38 },
    place: '공사장',
    droneHint: '거긴 아니야. 노란 기계와 울타리가 있는 곳을 찾아 봐.',
    clue: 'noise',
    clueHints: { stump: '나무는 이미 심었어. 새들이 왜 자꾸 놀라서 날아갈까?', dry: '개울은 다시 흘러. 새들을 놀라게 하는 건 뭘까?' },
    care: 'hide',
    careHints: { food: '먹이는 이미 있어. 놀란 새한테는 뭐가 필요할까?', water: '물도 이미 흘러. 놀란 새한테는 뭐가 필요할까?', rope: '놀이 밧줄은 심심할 때. 지금 새들은 놀라서 떨고 있어!' },
    says: [
      { id: 'ok', text: '조사 결과 기계 소리에 새가 놀라요. 새가 쉬는 시간엔 기계를 멈춰 주세요!', lines: ['조사 결과 기계 소리에', '새가 놀라요.', '새가 쉬는 시간엔', '기계를 멈춰 주세요!'], source: '생태 조사 그래프', art: 'graph' },
      { id: 'rumor', text: '익명 댓글에 새들은 시끄러운 걸 좋아한대요.', lines: ['익명 댓글에 새들은', '시끄러운 걸 좋아한대요.'], source: '익명 댓글', art: 'rumor', why: '이름도 모르는 사람 말이야. 우리 조사 그래프가 있잖아.' },
      { id: 'other', text: '개울에 쌓인 자재를 치워 주세요!', lines: ['개울에 쌓인 자재를', '치워 주세요!'], source: '드론 사진', art: 'photo-stream', why: '개울은 이미 치웠어. 지금은 기계 소리 얘기를 하자.' },
    ],
    result: '공사장이 새들이 쉬는 시간엔 기계를 멈추기로 약속했어. 숲이 조용해져!',
    did: { drone: '공사장을 찾음', ecology: '이유: 기계 소리 때문', care: '숨는 집으로 새를 돌봄', broadcast: '공사장과 멈춤 약속' },
  },
];

export const TOTAL_TURNS = MISSIONS.length * TURNS_PER_MISSION;

export const getMission = (id: MissionId) => MISSIONS.find((mission) => mission.id === id)!;

/** 드론 턴: 지도에서 누른 곳이 이 작전의 자리인가. 다른 작전 핀은 틀림. */
export const isRightPin = (mission: Mission, pinId: MissionId) => mission.id === pinId;

/** 한 턴의 답이 맞는가. 턴 종류마다 고른 값의 종류가 다르다. */
export function isRightAnswer(mission: Mission, job: JobId, answer: string): boolean {
  switch (job) {
    case 'drone': return mission.id === answer;
    case 'ecology': return mission.clue === answer;
    case 'care': return mission.care === answer;
    case 'broadcast': return answer === 'ok';
  }
}

/** 틀렸을 때 그 직업이 해 주는 힌트. */
export function wrongHint(mission: Mission, job: JobId, answer: string): string {
  switch (job) {
    case 'drone': return mission.droneHint;
    case 'ecology': return mission.clueHints[answer as EcoClue] ?? '흔적을 다시 봐.';
    case 'care': return mission.careHints[answer as CareItem] ?? '새들한테 지금 필요한 게 뭘까?';
    case 'broadcast': return mission.says.find((say) => say.id === answer)?.why ?? '확인된 말만 방송하자.';
  }
}

/** 갱신 목표: 12턴을 한 번도 안 틀리면 "한 번에 다 맞춤". attempts = 확인 누른 횟수. */
export const isClean = (attempts: number) => attempts === TOTAL_TURNS;

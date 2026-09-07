import type { JobId } from '../shared/types';

/**
 * P9 푸른솔 숲 살리기 작전 — 앞 스테이지에서 네 직업이 각자 모은 것을 둘씩 합쳐 숲을 되돌린다.
 * 화면과 무관한 순수 데이터·판정. 작전은 앞 스테이지 사건(벌목·막힌 물길·공사 소음)에서 그대로 이어진다.
 */
export type MissionId = 'trees' | 'water' | 'quiet';

/** 각 직업이 앞 스테이지에서 가져온 것 — 배지 칩에 같이 적힌다. */
export const JOB_BRINGS: Record<JobId, string> = {
  drone: '하늘 사진',
  care: '돌봄 기록',
  ecology: '실험 결과',
  broadcast: '방송 클립',
};

export const JOB_ORDER: readonly JobId[] = ['drone', 'care', 'ecology', 'broadcast'];

export interface Mission {
  id: MissionId;
  title: string;
  /** 무엇이 문제였는지 — 앞 스테이지에서 본 것 */
  problem: string;
  /** 필요한 두 직업. 힌트는 직업 이름이 아니라 "가져와야 할 것"으로 적는다. */
  needs: [JobId, JobId];
  hints: Record<JobId, string>;
  /** 성공했을 때 무슨 일이 생기는지 */
  result: string;
  /** 탐험단장 질문 */
  bubble: string;
  /** 틀린 짝일 때 되묻는 말 */
  wrong: string;
}

export const MISSIONS: readonly Mission[] = [
  {
    id: 'trees',
    title: '열매 나무 다시 심기',
    problem: '숲 가장자리 나무가 베여서 새들이 먹을 게 없어졌어.',
    needs: ['drone', 'ecology'],
    hints: {
      drone: '어디가 베였는지 하늘에서 찍은 사진',
      ecology: '나무를 심으면 새가 돌아온다는 실험 결과',
      care: '', broadcast: '',
    },
    result: '베인 자리에 열매 나무를 심기로 했어. 새들이 먹을 게 다시 생겨!',
    bubble: '어디가 베였는지, 뭘 심어야 새가 오는지 누가 알고 있지?',
    wrong: '베인 곳 사진과 나무 실험 결과, 누가 가지고 있었지?',
  },
  {
    id: 'water',
    title: '물길 트고 쉴 곳 만들기',
    problem: '개울이 자재에 막혀 말랐고, 새들이 숨어 쉴 곳이 없어.',
    needs: ['drone', 'care'],
    hints: {
      drone: '물길이 어디서 막혔는지 찍은 사진',
      care: '지구·젤리한테 물과 숨을 곳이 필요했던 돌봄 기록',
      ecology: '', broadcast: '',
    },
    result: '막힌 자재를 치워 물이 흐르고, 숲에 숨을 곳을 만들었어. 새들이 물을 마셔!',
    bubble: '지구와 젤리한테 뭐가 필요했지? 물은 어디서 막혔더라?',
    wrong: '막힌 물길 사진과 돌봄 기록, 누가 가지고 있었지?',
  },
  {
    id: 'quiet',
    title: '공사 소음 줄이기 약속',
    problem: '숲 옆 공사장 기계 소리에 새들이 놀라서 떠나.',
    needs: ['ecology', 'broadcast'],
    hints: {
      ecology: '기계 소리를 멈추면 새가 돌아온다는 실험 결과',
      broadcast: '사람들과 공사장에 알린 방송',
      drone: '', care: '',
    },
    result: '공사장이 새들이 쉬는 시간엔 기계를 멈추기로 약속했어. 숲이 조용해져!',
    bubble: '공사장을 조용히 하려면 누구한테, 무슨 근거로 말해야 하지?',
    wrong: '소리 실험 결과와 방송, 누가 가지고 있었지?',
  },
];

export const getMission = (id: MissionId) => MISSIONS.find((mission) => mission.id === id)!;

/** 두 배지가 작전에 필요한 두 직업과 정확히 같은가 (순서 무관). */
export function isRightPair(mission: Mission, jobs: readonly JobId[]): boolean {
  if (jobs.length !== 2 || jobs[0] === jobs[1]) return false;
  return mission.needs.every((job) => jobs.includes(job));
}

/** 갱신 목표: 헛 출동 0번이면 "한 번에 다 맞춤". */
export const isClean = (attempts: number) => attempts === MISSIONS.length;

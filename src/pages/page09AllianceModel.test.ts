import { describe, expect, it } from 'vitest';
import { CARE_OPTIONS, ECO_OPTIONS, MISSIONS, RELAY, SOLO, TOTAL_TURNS, isClean, isRightAnswer, wrongHint } from './page09AllianceModel';

describe('P9 숲 살리기 릴레이', () => {
  it('릴레이는 네 직업을 한 번씩, 작전 3개 × 4턴 = 12턴', () => {
    expect(new Set(RELAY).size).toBe(4);
    expect(TOTAL_TURNS).toBe(12);
    expect(MISSIONS).toHaveLength(3);
  });

  it('작전마다 이유·돌봄 정답이 다르고, 보기 목록 안에 있다', () => {
    expect(new Set(MISSIONS.map((m) => m.clue)).size).toBe(3);
    expect(new Set(MISSIONS.map((m) => m.care)).size).toBe(3);
    for (const mission of MISSIONS) {
      expect(ECO_OPTIONS.some((o) => o.id === mission.clue)).toBe(true);
      expect(CARE_OPTIONS.some((o) => o.id === mission.care)).toBe(true);
      expect(mission.says.filter((s) => s.id === 'ok')).toHaveLength(1);
      // 틀린 보기마다 그 직업이 해 줄 힌트가 있다
      for (const option of ECO_OPTIONS) if (option.id !== mission.clue) expect(mission.clueHints[option.id]).toBeTruthy();
      for (const option of CARE_OPTIONS) if (option.id !== mission.care) expect(mission.careHints[option.id]).toBeTruthy();
      for (const say of mission.says) if (say.id !== 'ok') expect(say.why).toBeTruthy();
    }
  });

  it('턴 판정: 드론은 자리, 생태는 이유, 돌봄은 물건, 방송은 확인된 말', () => {
    const trees = MISSIONS[0]!;
    expect(isRightAnswer(trees, 'drone', 'trees')).toBe(true);
    expect(isRightAnswer(trees, 'drone', 'water')).toBe(false);
    expect(isRightAnswer(trees, 'ecology', 'stump')).toBe(true);
    expect(isRightAnswer(trees, 'care', 'food')).toBe(true);
    expect(isRightAnswer(trees, 'care', 'rope')).toBe(false);
    expect(isRightAnswer(trees, 'broadcast', 'ok')).toBe(true);
    expect(isRightAnswer(trees, 'broadcast', 'rumor')).toBe(false);
    expect(wrongHint(trees, 'care', 'rope')).toContain('심심할 때');
    expect(wrongHint(trees, 'broadcast', 'rumor')).toContain('누가 그러던데');
  });

  it('혼자 출동은 한 일 하나 + 못 한 일 셋', () => {
    for (const job of RELAY) {
      expect(SOLO[job].did.length).toBeGreaterThan(0);
      expect(SOLO[job].couldNot).toHaveLength(3);
    }
  });

  it('12번 만에 끝내면 클린', () => {
    expect(isClean(12)).toBe(true);
    expect(isClean(13)).toBe(false);
  });
});

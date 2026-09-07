import { describe, expect, it } from 'vitest';
import { JOB_ORDER, MISSIONS, isClean, isRightPair } from './page09AllianceModel';

describe('P9 숲 살리기 작전', () => {
  it('세 작전이 네 직업을 전부 한 번 이상 쓰고, 힌트는 직업 이름을 말하지 않는다', () => {
    const used = new Set(MISSIONS.flatMap((mission) => mission.needs));
    for (const job of JOB_ORDER) expect(used.has(job)).toBe(true);
    for (const mission of MISSIONS) {
      for (const job of mission.needs) {
        expect(mission.hints[job]).not.toMatch(/드론|돌봄 전문가|생태연구가|방송기술자/);
        expect(mission.hints[job].length).toBeGreaterThan(0);
      }
    }
  });

  it('짝 판정은 순서 무관, 같은 배지 두 번은 실패', () => {
    const trees = MISSIONS[0]!;
    expect(isRightPair(trees, ['drone', 'ecology'])).toBe(true);
    expect(isRightPair(trees, ['ecology', 'drone'])).toBe(true);
    expect(isRightPair(trees, ['drone', 'drone'])).toBe(false);
    expect(isRightPair(trees, ['drone', 'care'])).toBe(false);
    expect(isRightPair(trees, ['drone'])).toBe(false);
  });

  it('헛 출동 없이 세 번이면 클린', () => {
    expect(isClean(3)).toBe(true);
    expect(isClean(4)).toBe(false);
  });
});

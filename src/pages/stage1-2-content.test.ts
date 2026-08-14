import { describe, expect, it } from 'vitest';
import {
  CORE_MYSTERY_LINKS,
  MYSTERY_CLUES,
  VALID_MYSTERY_LINKS,
  WORK_STYLE_SCENARIOS,
  coreMysteryLinkKeys,
  normalizedPair,
  scoreDroneFlight,
  validMysteryLinkKeys,
} from './stage1-2-content';

describe('stage 1 work-style content', () => {
  it('offers eight distinct, equally weighted no-wrong-answer choices', () => {
    expect(WORK_STYLE_SCENARIOS).toHaveLength(8);
    expect(new Set(WORK_STYLE_SCENARIOS.map((scenario) => scenario.id)).size).toBe(8);
    for (const scenario of WORK_STYLE_SCENARIOS) {
      expect(scenario.options).toHaveLength(2);
      expect(scenario.options[0].id).not.toBe(scenario.options[1].id);
      for (const option of scenario.options) {
        expect(Object.values(option.traits).reduce((sum, value) => sum + (value ?? 0), 0)).toBe(3);
      }
    }
  });
});

describe('stage 2 mystery rules', () => {
  it('keeps six clue types across three camera views', () => {
    expect(MYSTERY_CLUES).toHaveLength(6);
    expect(new Set(MYSTERY_CLUES.map((clue) => clue.type)).size).toBe(6);
    expect(new Set(MYSTERY_CLUES.map((clue) => clue.camera)).size).toBe(3);
  });

  it('treats every core connection as a valid connection', () => {
    expect(VALID_MYSTERY_LINKS).toHaveLength(4);
    for (const [first, second] of CORE_MYSTERY_LINKS) {
      const key = normalizedPair(first, second);
      expect(validMysteryLinkKeys.has(key)).toBe(true);
      expect(coreMysteryLinkKeys.has(key)).toBe(true);
    }
  });
});

describe('drone review scoring', () => {
  it('awards the documented 35/30/20/15 perfect review', () => {
    expect(scoreDroneFlight({ coveredTargets: 3, violations: 0, stableRecordSeconds: 5, batteryRemaining: 50 })).toMatchObject({
      purpose: 35, safety: 30, framing: 20, battery: 15, total: 100, passed: true,
    });
  });

  it('allows a safe partial route to pass and sends an unsafe route to retry', () => {
    expect(scoreDroneFlight({ coveredTargets: 2, violations: 1, stableRecordSeconds: 4.5, batteryRemaining: 35 }).passed).toBe(true);
    expect(scoreDroneFlight({ coveredTargets: 2, violations: 2, stableRecordSeconds: 2, batteryRemaining: 20 }).passed).toBe(false);
  });
});

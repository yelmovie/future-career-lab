import { describe, expect, it } from 'vitest';
import type { GameLog } from '../shared/types';
import { actualJobFromLogs } from './resultRules';

const log = (page: GameLog['page'], traits: GameLog['traits'] = {}): GameLog => ({ id: `${page}`, page, type: 't', summary: '', tags: [], traits, contextRef: '', createdAt: '' });

describe('actualJobFromLogs', () => {
  it('returns null without logs and picks the job whose stage pages carry the most weight', () => {
    expect(actualJobFromLogs([])).toBeNull();
    expect(actualJobFromLogs([log(3), log(4), log(7)])).toBe('drone');
    expect(actualJobFromLogs([log(3), log(7, { analysis: 2 })])).toBe('ecology');
  });

  it('breaks ties by stage order so the result is deterministic', () => {
    expect(actualJobFromLogs([log(8), log(5)])).toBe('care');
    expect(actualJobFromLogs([log(9), log(10)])).toBeNull();
  });
});

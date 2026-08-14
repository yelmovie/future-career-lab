import { describe, expect, it } from 'vitest';
import { buildCareHandoff, evaluateCareMission } from '../src/pages/page05Data';

describe('page 5 evidence journal', () => {
  const readyRecords = [
    'water-line-clear',
    'water-stand-tilted',
    'perch-variety',
    'perch-wobble-mark',
    'foraging-used',
    'double-latch',
    'entry-box',
  ];

  it('requires broad observation, concern evidence, and the entry safety action', () => {
    expect(evaluateCareMission(readyRecords, false, false).ready).toBe(false);
    const result = evaluateCareMission(readyRecords, true, false);
    expect(result.ready).toBe(true);
    expect(result.zonesVisited).toBe(4);
    expect(result.observationCount).toBe(7);
    expect(result.concernCount).toBe(3);
  });

  it('requires expert sharing only when a repeated behavior record is selected', () => {
    const withRepeatedBehavior = [...readyRecords, 'repeated-route'];
    expect(evaluateCareMission(withRepeatedBehavior, true, false).ready).toBe(false);
    expect(evaluateCareMission(withRepeatedBehavior, true, true).ready).toBe(true);
  });

  it('passes concrete improvement flags to the habitat mission', () => {
    const handoff = buildCareHandoff(['water-stand-tilted', 'entry-box', 'repeated-route']);
    expect(handoff.flags).toEqual(expect.arrayContaining(['raised-water', 'clear-entry', 'quiet-route']));
    expect(handoff.evidence).toHaveLength(3);
  });
});


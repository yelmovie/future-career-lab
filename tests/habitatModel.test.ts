import { describe, expect, it } from 'vitest';
import {
  checkConditions,
  conditionsFromCareLog,
  evaluateHabitat,
  evaluateSimulation,
  HABITAT_STRATEGIES,
  type HabitatPlacement,
} from '../src/pages/habitatModel';

const BOTH = { dehydrated: true, stressed: true };

describe('page 6 habitat rules', () => {
  it.each(HABITAT_STRATEGIES)('accepts the $name strategy without rewarding item count alone', (strategy) => {
    const result = evaluateHabitat(strategy.placements);
    expect(result.valid).toBe(true);
    expect(result.withinBudget).toBe(true);
    expect(result.withinCount).toBe(true);
    expect(result.strategyId).toBe(strategy.id);
  });

  it('rejects an expensive layout even when it has many useful objects', () => {
    const placements: HabitatPlacement[] = [
      { instanceId: 'a', itemId: 'quiet-hideout', x: 40, y: 18, rotation: 0 },
      { instanceId: 'b', itemId: 'wood-tunnel', x: 70, y: 18, rotation: 0 },
      { instanceId: 'c', itemId: 'natural-perch', x: 45, y: 52, rotation: 0 },
      { instanceId: 'd', itemId: 'raised-water', x: 75, y: 52, rotation: 0 },
    ];
    const result = evaluateHabitat(placements);
    expect(result.budget).toBe(9);
    expect(result.valid).toBe(false);
  });

  it('rejects collisions and a blocked entrance as separate safety rules', () => {
    const placements: HabitatPlacement[] = [
      { instanceId: 'a', itemId: 'natural-perch', x: 16, y: 50, rotation: 0 },
      { instanceId: 'b', itemId: 'raised-water', x: 16, y: 50, rotation: 0 },
      { instanceId: 'c', itemId: 'foraging-puzzle', x: 45, y: 50, rotation: 0 },
    ];
    const result = evaluateHabitat(placements);
    expect(result.noCollisions).toBe(false);
    expect(result.entranceClear).toBe(false);
    expect(result.valid).toBe(false);
  });
});

describe('page 6 bird conditions from care log', () => {
  it('derives conditions from the care log and defaults to both when empty', () => {
    expect(conditionsFromCareLog([])).toEqual(BOTH);
    expect(conditionsFromCareLog([{ bird: 'red', issue: '탈수', treatment: '물·전해질' }])).toEqual({ dehydrated: true, stressed: false });
    expect(conditionsFromCareLog([{ bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' }])).toEqual({ dehydrated: false, stressed: true });
  });

  it('dehydrated bird needs water near a rest spot; stressed bird needs a shelter away from the loud band', () => {
    const farWater: HabitatPlacement[] = [
      { instanceId: 'p', itemId: 'natural-perch', x: 40, y: 55, rotation: 0 },
      { instanceId: 'w', itemId: 'raised-water', x: 90, y: 15, rotation: 0 },
      { instanceId: 'h', itemId: 'quiet-hideout', x: 40, y: 12, rotation: 0 },
    ];
    expect(checkConditions(farWater, BOTH)).toEqual({ waterNearRest: false, shelterQuiet: false });
    expect(checkConditions(farWater, { dehydrated: false, stressed: false })).toEqual({ waterNearRest: true, shelterQuiet: true });
  });

  it.each(HABITAT_STRATEGIES)('quick-start preset $name leaves one bird condition unmet so it cannot clear the stage as-is', (strategy) => {
    const check = checkConditions(strategy.placements, BOTH);
    expect([check.waterNearRest, check.shelterQuiet].filter(Boolean)).toHaveLength(1);
    expect(evaluateSimulation(strategy.placements, BOTH).stars).toBe(2);
  });

  it('counts stars from the three observed behaviours and moving the water fixes the quiet loop', () => {
    const quietLoop = HABITAT_STRATEGIES.find((s) => s.id === 'quiet-loop')!.placements;
    expect(evaluateSimulation(quietLoop, BOTH).behaviors).toEqual({ eat: false, play: true, rest: true });
    const fixed = quietLoop.map((p) => (p.itemId === 'raised-water' ? { ...p, x: 29, y: 20 } : p));
    expect(evaluateHabitat(fixed).valid).toBe(true);
    expect(evaluateSimulation(fixed, BOTH).stars).toBe(3);
    // 은신처가 없는 전략은 스트레스 개체가 쉬지 못한다
    const levels = HABITAT_STRATEGIES.find((s) => s.id === 'forage-levels')!.placements;
    const result = evaluateSimulation(levels, BOTH);
    expect(result.behaviors).toEqual({ eat: true, play: true, rest: false });
    expect(result.stars).toBe(2);
    expect(evaluateSimulation(levels, { dehydrated: true, stressed: false }).stars).toBe(3);
  });
});

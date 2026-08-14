import { describe, expect, it } from 'vitest';
import { evaluateHabitat, HABITAT_STRATEGIES, type HabitatPlacement } from '../src/pages/habitatModel';

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

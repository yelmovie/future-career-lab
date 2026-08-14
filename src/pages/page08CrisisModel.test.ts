import { describe, expect, it } from 'vitest';
import {
  INCIDENT_SETS,
  advanceCrisisRuntime,
  assignCrisisJob,
  createCrisisRuntime,
  crisisOutcome,
  incidentSetForSeed,
} from './page08CrisisModel';

describe('page 8 crisis model', () => {
  it('selects one of three incident sets deterministically', () => {
    expect(incidentSetForSeed(4).id).toBe(INCIDENT_SETS[1]?.id);
    expect(incidentSetForSeed(4).id).toBe(incidentSetForSeed(4).id);
    expect(new Set([0, 1, 2].map((seed) => incidentSetForSeed(seed).id)).size).toBe(3);
  });

  it('moves a job through ready, assigned, resolving, cooldown and ready', () => {
    let runtime = createCrisisRuntime(INCIDENT_SETS[0]!);
    runtime = assignCrisisJob(runtime, 'caretaker', 'park', 0);
    expect(runtime.jobs.caretaker.status).toBe('assigned');
    runtime = advanceCrisisRuntime(runtime, 400);
    expect(runtime.jobs.caretaker.status).toBe('resolving');
    runtime = advanceCrisisRuntime(runtime, 1_600);
    expect(runtime.jobs.caretaker.status).toBe('cooldown');
    runtime = advanceCrisisRuntime(runtime, 10_000);
    expect(runtime.jobs.caretaker.status).toBe('ready');
  });

  it('restores a region and triggers synergy when two useful viewpoints connect', () => {
    let runtime = createCrisisRuntime(INCIDENT_SETS[0]!);
    runtime = assignCrisisJob(runtime, 'drone', 'wetland', 0);
    runtime = assignCrisisJob(runtime, 'researcher', 'wetland', 0);
    runtime = advanceCrisisRuntime(runtime, 1_600);
    expect(runtime.regions.wetland.state).toBe('restored');
    expect(runtime.regions.wetland.resolvedBy).toEqual(['drone', 'researcher']);
    expect(runtime.synergiesTriggered).toContain('wetland:field-data');
    expect(runtime.stability).toBeGreaterThan(42);
  });

  it('describes partial success without turning it into a game over', () => {
    const runtime = createCrisisRuntime(INCIDENT_SETS[2]!);
    const outcome = crisisOutcome(runtime);
    expect(outcome.success).toBe(false);
    expect(outcome.unresolved).toHaveLength(5);
    expect(outcome.restored).toHaveLength(0);
  });
});

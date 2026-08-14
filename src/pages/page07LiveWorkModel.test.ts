import { describe, expect, it } from 'vitest';
import {
  WORK_EVENTS,
  advanceWorkEvents,
  createWorkEvents,
  resolveWorkEvent,
  workOutcome,
} from './page07LiveWorkModel';

describe('page 7 live work model', () => {
  it('announces each queued, active, expired, recovery and resolved state', () => {
    let events = createWorkEvents();
    expect(events[0]?.status).toBe('queued');

    events = advanceWorkEvents(events, 0);
    expect(events[0]?.status).toBe('active');

    events = advanceWorkEvents(events, 0.26);
    expect(events[0]?.status).toBe('expired');

    events = advanceWorkEvents(events, 0.27);
    expect(events[0]?.status).toBe('recovery');

    const first = events[0];
    expect(first).toBeDefined();
    if (!first) return;
    events = resolveWorkEvent(events, first.id, first.recovery);
    expect(events[0]?.status).toBe('resolved');
    expect(workOutcome(events).recovered).toHaveLength(1);
  });

  it('requires prioritisation because all immediate responses cost more than 12 AP', () => {
    const leastImmediateCost = WORK_EVENTS.reduce((sum, event) => (
      sum + Math.min(...event.actions.map((action) => action.cost))
    ), 0);
    expect(leastImmediateCost).toBeGreaterThan(12);
  });

  it('keeps direct handling and recovery evidence separate', () => {
    let events = createWorkEvents();
    const direct = events[0];
    const recovered = events[1];
    expect(direct).toBeDefined();
    expect(recovered).toBeDefined();
    if (!direct || !recovered) return;
    events = resolveWorkEvent(events, direct.id, direct.actions[0]!);
    events = resolveWorkEvent(events, recovered.id, recovered.recovery);
    const outcome = workOutcome(events);
    expect(outcome.handled.map((event) => event.id)).toContain(direct.id);
    expect(outcome.recovered.map((event) => event.id)).toContain(recovered.id);
    expect(outcome.evidenceScore).toBe(4);
  });
});

import { describe, expect, it } from 'vitest';
import type { Artifacts, JobId } from '../shared/types';
import {
  CRISES,
  type CrisisId,
  GAUGE_START,
  SPREAD_PER_TURN,
  advanceTurn,
  cardQualities,
  createAllianceState,
  pairVerdict,
  toggleAssign,
  turnsUsed,
} from './page08CrisisModel';

const emptyCards = cardQualities(undefined);
const fire = CRISES[0]!;

describe('alliance turn model', () => {
  it('spreads every unhandled crisis each turn and caps the gauge', () => {
    let state = createAllianceState();
    state = advanceTurn(state, emptyCards);
    expect(state.turn).toBe(2);
    expect(state.gauges.fire).toBe(GAUGE_START + SPREAD_PER_TURN);
    for (let i = 0; i < 10; i += 1) state = advanceTurn(state, emptyCards);
    expect(state.gauges.flock).toBe(100);
    expect(state.done).toBe(false);
  });

  it('judges pairs by the crisis needs, never by job name', () => {
    expect(pairVerdict(fire, ['drone', 'broadcast'])).toBe('pair');
    expect(pairVerdict(fire, ['broadcast'])).toBe('hold');
    expect(pairVerdict(fire, ['drone', 'care'])).toBe('wrong');
    expect(pairVerdict(fire, [])).toBe('none');
    CRISES.forEach((crisis) => crisis.hints.forEach((hint) => expect(hint).not.toMatch(/드론|돌봄|생태|방송/)));
  });

  it('wrong pair has no effect and asks the question; correct pair reduces; single correct job holds', () => {
    let state = toggleAssign(toggleAssign(createAllianceState(), 'drone', 'fire'), 'care', 'fire');
    state = toggleAssign(state, 'broadcast', 'flock');
    state = toggleAssign(state, 'ecology', 'citizens');
    state = advanceTurn(state, emptyCards);
    expect(state.gauges.fire).toBe(GAUGE_START + SPREAD_PER_TURN);
    expect(state.feedback[0]).toContain('무엇이 필요하다고');
    expect(state.gauges.flock).toBe(GAUGE_START + SPREAD_PER_TURN); // broadcast is wrong for flock
    expect(state.gauges.citizens).toBe(GAUGE_START - 10); // hold: half of one baseline badge, no spread

    let good = toggleAssign(toggleAssign(createAllianceState(), 'drone', 'fire'), 'broadcast', 'fire');
    good = advanceTurn(good, emptyCards);
    expect(good.gauges.fire).toBe(Math.max(0, GAUGE_START - 40));
    expect(good.cooldown.drone).toBe(1);
    expect(good.cooldown.care).toBe(0);
    expect(good.assigned.fire).toEqual([]);
  });

  it('cooldown blocks a badge for exactly one turn and toggling moves a badge between crises', () => {
    let state = toggleAssign(createAllianceState(), 'drone', 'fire');
    state = toggleAssign(state, 'drone', 'flock');
    expect(state.assigned.fire).toEqual([]);
    expect(state.assigned.flock).toEqual(['drone']);
    state = toggleAssign(state, 'drone', 'flock');
    expect(state.assigned.flock).toEqual([]);
    state = advanceTurn(toggleAssign(state, 'drone', 'fire'), emptyCards);
    expect(toggleAssign(state, 'drone', 'fire')).toBe(state);
    state = advanceTurn(state, emptyCards);
    expect(state.cooldown.drone).toBe(0);
  });

  it('maps artifacts to badge power and stronger cards clear faster', () => {
    const artifacts: Artifacts = {
      photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'edge' }],
      hypothesis: 'logging',
      careLog: [],
      habitatStars: 3,
      traces: [],
      graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'sub' }],
      clip: { trust: 80, corrections: 0 },
      allianceTurns: null,
    };
    const cards = cardQualities(artifacts);
    expect(cards.map((card) => card.power)).toEqual([30, 35, 35, 32]);
    expect(cards[0]!.chip).toBe('정중앙 2/3');
    expect(emptyCards.every((card) => card.power === 20)).toBe(true);

    const strong = advanceTurn(toggleAssign(toggleAssign(createAllianceState(), 'ecology', 'flock'), 'care', 'flock'), cards);
    expect(strong.gauges.flock).toBe(0);
  });

  it('is completable with baseline cards; the smart order (pair + two holds) clears in 3 turns', () => {
    let state = createAllianceState();
    const play = (pairs: Array<[JobId, CrisisId]>) => { pairs.forEach(([job, crisis]) => { state = toggleAssign(state, job, crisis); }); state = advanceTurn(state, emptyCards); };
    play([['broadcast', 'citizens'], ['ecology', 'citizens'], ['drone', 'fire'], ['care', 'flock']]);
    expect(state.gauges).toEqual({ fire: 30, flock: 30, citizens: 0 });
    play([]);
    expect(state.gauges).toEqual({ fire: 40, flock: 40, citizens: 0 });
    play([['drone', 'fire'], ['broadcast', 'fire'], ['ecology', 'flock'], ['care', 'flock']]);
    expect(state.done).toBe(true);
    expect(turnsUsed(state)).toBe(3);
  });
});

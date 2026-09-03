import { describe, expect, it } from 'vitest';
import {
  BASE_DRAIN_PER_SECOND,
  DRONE_TARGETS,
  FACT_CARDS,
  IRRELEVANT_CARD,
  PHOTO_DETAILS,
  REC_RADIUS,
  VALID_LINKS,
  batteryDrain,
  evaluateFlight,
  hitDetail,
  isValidLink,
  photoCards,
  recQuality,
  windZonesFor,
} from './stage1-2-content';

describe('drone wind and battery', () => {
  it('seeds three zones with one of each direction, deterministically', () => {
    const zones = windZonesFor(42);
    expect(zones).toHaveLength(3);
    expect(new Set(zones.map((zone) => zone.direction))).toEqual(new Set(['head', 'side', 'tail']));
    expect(windZonesFor(42)).toEqual(zones);
  });

  it('doubles drain in the headwind zone and leaves calm air at base rate', () => {
    const zones = windZonesFor(7);
    const head = zones.find((zone) => zone.direction === 'head')!;
    const centre = { x: head.x + head.width / 2, y: head.y + head.height / 2 };
    expect(batteryDrain(centre, zones, 1)).toBeCloseTo(BASE_DRAIN_PER_SECOND * 2);
    expect(batteryDrain({ x: .02, y: .98 }, zones, 1)).toBeCloseTo(BASE_DRAIN_PER_SECOND);
  });

  it('keeps the launch pad out of every wind zone', () => {
    expect(windZonesFor(1).some((zone) => zone.x <= .08 && zone.x + zone.width >= .08 && zone.y <= .5 && zone.y + zone.height >= .5)).toBe(false);
  });
});

describe('REC window', () => {
  it('returns center inside 45% of the radius, edge inside the radius, null outside', () => {
    expect(recQuality(0)).toBe('center');
    expect(recQuality(REC_RADIUS * .44)).toBe('center');
    expect(recQuality(REC_RADIUS * .9)).toBe('edge');
    expect(recQuality(REC_RADIUS * 1.01)).toBeNull();
  });

  it('stamps precision only for 3 center shots with 30% battery left', () => {
    const three = DRONE_TARGETS.map((target) => ({ id: target.id, quality: 'center' as const }));
    expect(evaluateFlight({ photos: three, batteryRemaining: 30, passes: 1, drainByZone: {} })).toMatchObject({ passed: true, precision: true });
    expect(evaluateFlight({ photos: three, batteryRemaining: 29, passes: 1, drainByZone: {} }).precision).toBe(false);
    expect(evaluateFlight({ photos: [{ ...three[0]!, quality: 'edge' }, three[1]!, three[2]!], batteryRemaining: 80, passes: 1, drainByZone: {} }).precision).toBe(false);
    expect(evaluateFlight({ photos: three.slice(0, 2), batteryRemaining: 0, passes: 2, drainByZone: {} }).passed).toBe(false);
  });
});

describe('evidence board', () => {
  it('hit-tests one hidden detail per photo and misses elsewhere', () => {
    for (const detail of PHOTO_DETAILS) {
      const { x, y, width, height } = detail.rect;
      expect(hitDetail(detail.photo, x + width / 2, y + height / 2)).toBe(detail.id);
    }
    expect(hitDetail('logging', .95, .95)).toBeNull();
    expect(hitDetail('construction', .1, .1)).toBeNull();
  });

  it('falls back to all three photos when the flight left none', () => {
    expect(photoCards([]).map((card) => card.id)).toEqual(DRONE_TARGETS.map((target) => target.id));
    expect(photoCards([{ id: 'stream', quality: 'edge' }]).map((card) => card.id)).toEqual(['stream']);
  });

  it('accepts only detail-to-fact pairs that share a photo, never the irrelevant card', () => {
    for (const [detail, fact] of VALID_LINKS) expect(isValidLink(detail, fact)).toBe(true);
    expect(isValidLink('stump', 'footprint')).toBe(false);
    expect(isValidLink('dam', IRRELEVANT_CARD)).toBe(false);
    expect(FACT_CARDS.some((card) => card.id === IRRELEVANT_CARD)).toBe(true);
  });
});

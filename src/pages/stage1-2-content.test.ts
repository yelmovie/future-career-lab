import { describe, expect, it } from 'vitest';
import {
  BASE_DRAIN_PER_SECOND,
  DRAIN_MULTIPLIER,
  DRONE_TARGETS,
  FACT_CARDS,
  IRRELEVANT_CARD,
  PHOTO_DETAILS,
  PRECISION_BATTERY,
  REC_RADIUS,
  VALID_LINKS,
  WIND_VECTORS,
  batteryDrain,
  evaluateFlight,
  hitDetail,
  isValidLink,
  linkKey,
  photoCards,
  recQuality,
  simulateFlight,
  sureBlocker,
  windRelation,
  windZonesFor,
} from './stage1-2-content';

const RIGHT = { x: 1, y: 0 };
const LEFT = { x: -1, y: 0 };
const DOWN = { x: 0, y: 1 };
const centreOf = (zone: { x: number; y: number; width: number; height: number }) => ({ x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 });

describe('drone wind and battery', () => {
  it('seeds three zones, two of them left wind, deterministically', () => {
    const zones = windZonesFor(42);
    expect(zones).toHaveLength(3);
    expect(zones.filter((zone) => zone.wind.x === -1)).toHaveLength(2);
    expect(windZonesFor(42)).toEqual(zones);
    expect(windZonesFor(43).some((zone) => zone.wind.y !== 0)).toBe(true);
  });

  it('classifies the multiplier by travel direction, not by position alone', () => {
    const zones = windZonesFor(7);
    const left = zones.find((zone) => zone.wind === WIND_VECTORS.left)!;
    const point = centreOf(left);
    expect(windRelation(point, RIGHT, zones).relation).toBe('head');
    expect(windRelation(point, LEFT, zones).relation).toBe('tail');
    expect(windRelation(point, DOWN, zones).relation).toBe('side');
    expect(windRelation(point, { x: 0, y: 0 }, zones).relation).toBe('side');
    expect(windRelation({ x: .02, y: .98 }, RIGHT, zones)).toEqual({ zone: null, relation: 'calm' });
    expect(batteryDrain(point, RIGHT, zones, 1)).toBeCloseTo(BASE_DRAIN_PER_SECOND * DRAIN_MULTIPLIER.head);
    expect(batteryDrain(point, LEFT, zones, 1)).toBeCloseTo(BASE_DRAIN_PER_SECOND * DRAIN_MULTIPLIER.tail);
    expect(batteryDrain({ x: .02, y: .98 }, RIGHT, zones, 1)).toBeCloseTo(BASE_DRAIN_PER_SECOND);
    expect(DRAIN_MULTIPLIER.head).toBeGreaterThan(2);
    expect(DRAIN_MULTIPLIER.tail).toBeLessThan(1);
  });

  it('keeps the launch pad out of every wind zone and every target inside one', () => {
    const zones = windZonesFor(1);
    const inside = (p: { x: number; y: number }) => zones.some((zone) => p.x >= zone.x && p.x <= zone.x + zone.width && p.y >= zone.y && p.y <= zone.y + zone.height);
    expect(inside({ x: .08, y: .5 })).toBe(false);
    for (const target of DRONE_TARGETS) expect(inside(target)).toBe(true);
  });

  it('balance: the straight 1-2-3 route finishes all photos but misses the precision stamp; a wind-aware route earns it', () => {
    const naive = DRONE_TARGETS.map(({ x, y }) => ({ x, y }));
    const [logging, stream, construction] = naive as [typeof naive[0], typeof naive[0], typeof naive[0]];
    // 왼쪽 바람 구간은 오른쪽에서 들어가 왼쪽으로 통과, 나머지는 순서를 바꿔 뒷바람으로.
    const aware: Record<string, { x: number; y: number }[]> = {
      'left,left,down': [{ x: .4, y: .53 }, logging, construction, stream],
      'left,down,left': [stream, { x: .8, y: .68 }, construction, logging],
      'down,left,left': [{ x: .1, y: .18 }, logging, construction, stream],
      'left,left,up': [{ x: .4, y: .53 }, construction, stream, logging],
      'left,up,left': [stream, { x: .9, y: .53 }, construction, logging],
      'up,left,left': [logging, { x: .45, y: .23 }, construction, stream],
    };
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const zones = windZonesFor(seed);
      const key = zones.map((zone) => (zone.wind.x === -1 ? 'left' : zone.wind.y === -1 ? 'up' : 'down')).join(',');
      seen.add(key);
      const naiveEnd = simulateFlight(naive, zones);
      expect(naiveEnd, `naive ${key} should land with battery left`).toBeGreaterThan(5);
      expect(naiveEnd, `naive ${key} should not earn precision`).toBeLessThan(PRECISION_BATTERY);
      expect(simulateFlight(aware[key]!, zones), `aware ${key}`).toBeGreaterThanOrEqual(PRECISION_BATTERY);
    }
    expect(seen.size).toBe(6);
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
    expect(evaluateFlight({ photos: three, batteryRemaining: 30, drainByZone: {} })).toMatchObject({ passed: true, precision: true });
    expect(evaluateFlight({ photos: three, batteryRemaining: 29, drainByZone: {} }).precision).toBe(false);
    expect(evaluateFlight({ photos: [{ ...three[0]!, quality: 'edge' }, three[1]!, three[2]!], batteryRemaining: 80, drainByZone: {} }).precision).toBe(false);
    expect(evaluateFlight({ photos: three.slice(0, 2), batteryRemaining: 40, drainByZone: {} }).passed).toBe(false);
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

  it('lets a card into 확실 only once its detail is found and linked', () => {
    expect(sureBlocker('logging', [], [])).toMatch(/확대해서 세부를 찾았어/);
    expect(sureBlocker('logging', ['stump'], [])).toMatch(/이어야/);
    expect(sureBlocker('logging', ['stump'], [linkKey('stump', 'cctv')])).toBeNull();
    expect(sureBlocker('cctv', ['stump'], [])).toMatch(/의심/);
    expect(sureBlocker('cctv', ['stump'], [linkKey('stump', 'cctv')])).toBeNull();
    expect(sureBlocker(IRRELEVANT_CARD, PHOTO_DETAILS.map((d) => d.id), VALID_LINKS.map(([d, f]) => linkKey(d, f)))).not.toBeNull();
  });
});

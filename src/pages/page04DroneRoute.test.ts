import { describe, expect, it } from 'vitest';
import { DRONE_START, DRONE_TARGETS } from './stage1-2-content';
import { droneReplayPosition, droneRoute } from './page04DroneRoute';

describe('드론 지도와 다시 보기의 비행 경로', () => {
  it('이륙장부터 촬영점 세 곳을 지나 이륙장으로 돌아온다', () => {
    const route = droneRoute(DRONE_TARGETS);
    expect(route.map((leg) => leg.to)).toEqual([...DRONE_TARGETS, DRONE_START]);
    expect(route.map((leg) => leg.returning)).toEqual([false, false, false, true]);
    expect(droneReplayPosition(route, 0)).toEqual(DRONE_START);
    expect(droneReplayPosition(route, 1).x).toBeCloseTo(DRONE_START.x);
    expect(droneReplayPosition(route, 1).y).toBeCloseTo(DRONE_START.y);
  });

  it('복귀 중 다시 보기 위치가 마지막 촬영점과 이륙장 사이에 놓인다', () => {
    const route = droneRoute(DRONE_TARGETS);
    const last = route.at(-1)!;
    const total = route.reduce((sum, leg) => sum + leg.length, 0);
    const point = droneReplayPosition(route, 1 - last.length / total / 2);
    expect(point.x).toBeCloseTo((last.from.x + DRONE_START.x) / 2);
    expect(point.y).toBeCloseTo((last.from.y + DRONE_START.y) / 2);
  });

  it('자유 경로와 조기 복귀 지점도 주어진 순서대로 연결한다', () => {
    const flown = [{ x: .25, y: .7 }, { x: .4, y: .5 }];
    const route = droneRoute(flown);
    expect(route.map((leg) => leg.to)).toEqual([...flown, DRONE_START]);
    expect(route.at(-1)?.from).toEqual(flown[1]);
  });

  it('같은 점을 연속으로 놓아도 방향 없는 선이나 NaN을 만들지 않는다', () => {
    const route = droneRoute([DRONE_START, DRONE_TARGETS[0]!, DRONE_TARGETS[0]!]);
    expect(route).toHaveLength(2);
    expect(route.every((leg) => leg.length > 0)).toBe(true);
    expect(droneReplayPosition(route, .5)).toEqual({ x: DRONE_TARGETS[0]!.x, y: DRONE_TARGETS[0]!.y });
    expect(droneRoute([])).toEqual([]);
    expect(droneReplayPosition([], .5)).toEqual(DRONE_START);
  });
});

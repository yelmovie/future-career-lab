import { DRONE_START, distance, type DronePoint } from './stage1-2-content';

export interface DroneRouteLeg {
  from: DronePoint;
  to: DronePoint;
  returning: boolean;
  length: number;
}

/** 지도 안내와 다시 보기가 실제 비행처럼 마지막 점에서 이륙장까지 이어진다. */
export function droneRoute(waypoints: readonly DronePoint[]): DroneRouteLeg[] {
  if (!waypoints.length) return [];
  const path = [DRONE_START, ...waypoints, DRONE_START];
  return path.slice(1).map((to, index) => ({
    from: path[index]!, to, returning: index === waypoints.length,
    length: distance(path[index]!, to),
  })).filter((leg) => leg.length > 1e-6);
}

export function droneReplayPosition(route: readonly DroneRouteLeg[], progress: number): DronePoint {
  let remaining = Math.min(1, Math.max(0, progress)) * route.reduce((total, leg) => total + leg.length, 0);
  for (const leg of route) {
    if (remaining <= leg.length) {
      const ratio = remaining / leg.length;
      return { x: leg.from.x + (leg.to.x - leg.from.x) * ratio, y: leg.from.y + (leg.to.y - leg.from.y) * ratio };
    }
    remaining -= leg.length;
  }
  return { ...DRONE_START };
}

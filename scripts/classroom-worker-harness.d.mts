import type { Mock } from 'vitest';
interface WorkerSnapshot {
  state: string;
  done: number;
  total: number;
  bytes: number;
  totalBytes: number;
  version?: string;
  error?: string;
}
interface ClassroomHarness {
  base: string;
  stores: Map<string, Map<string, Response>>;
  contents: Map<string, string>;
  fetcher: Mock<(request: Request) => Promise<Response>>;
  skipWaiting: Mock<() => Promise<undefined>>;
  dispatch(type: string, extra?: Record<string, unknown>): Promise<Response | undefined>;
  message(type: string): Promise<WorkerSnapshot[]>;
}
export function createClassroomHarness(): ClassroomHarness;

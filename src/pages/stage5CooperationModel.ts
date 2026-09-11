export const COOP_MISSIONS = ['trees', 'water', 'quiet'] as const;
export type MissionId = typeof COOP_MISSIONS[number];
export type PlantSite = 'left' | 'right';
export interface CooperationState {
  version: 1;
  phase: 'welcome' | 'map' | 'work' | 'result' | 'ending';
  current: MissionId | null;
  completed: MissionId[];
  planted: PlantSite[];
  waterMarked: boolean;
  noiseLevel: number;
  noiseTouched: boolean;
  actions: number;
}
const isMission = (v: unknown): v is MissionId => COOP_MISSIONS.includes(v as MissionId);
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const number = (v: unknown, fallback: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : fallback;
export function restoreCooperation(value: unknown, legacy?: unknown, alreadyCompleted = false): CooperationState {
  const raw = object(value);
  const state: CooperationState = { version: 1, phase: 'welcome', current: null, completed: [], planted: [], waterMarked: false, noiseLevel: 80, noiseTouched: false, actions: 0 };
  if (alreadyCompleted) return { ...state, phase: 'ending', completed: [...COOP_MISSIONS] };
  if (raw.version !== 1) {
    const old = object(legacy);
    const count = old.phase === 'transfer' ? 3 : ['turn', 'result'].includes(String(old.phase)) ? number(old.index, 0, 2) + (old.phase === 'result' ? 1 : 0) : 0;
    return { ...state, phase: count || ['turn', 'result'].includes(String(old.phase)) ? 'map' : 'welcome', completed: COOP_MISSIONS.slice(0, count) };
  }
  state.completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter(isMission))] : [];
  state.planted = Array.isArray(raw.planted) ? [...new Set(raw.planted.filter((v): v is PlantSite => v === 'left' || v === 'right'))] : [];
  state.waterMarked = raw.waterMarked === true;
  state.noiseLevel = number(raw.noiseLevel, 80, 100);
  state.noiseTouched = raw.noiseTouched === true;
  state.actions = number(raw.actions, 0, 100000);
  state.current = isMission(raw.current) ? raw.current : null;
  state.phase = ['map', 'work', 'result', 'ending'].includes(String(raw.phase)) ? raw.phase as CooperationState['phase'] : 'welcome';
  if (state.phase === 'ending' && state.completed.length < 3) state.phase = 'map';
  if (state.phase === 'work' && (!state.current || state.completed.includes(state.current))) state.phase = 'map';
  if (state.phase === 'result' && (!state.current || !state.completed.includes(state.current))) state.phase = 'map';
  if (state.phase === 'welcome' && state.completed.length) state.phase = 'map';
  return state;
}
export const startCooperation = (s: CooperationState): CooperationState => s.phase === 'welcome' ? { ...s, phase: 'map' } : s;
export function selectCooperationMission(s: CooperationState, id: MissionId): CooperationState {
  return s.phase === 'map' && isMission(id) && !s.completed.includes(id) ? { ...s, phase: 'work', current: id } : s;
}
export function plantSapling(s: CooperationState, site: PlantSite): CooperationState {
  return s.phase === 'work' && s.current === 'trees' && ['left', 'right'].includes(site) && !s.planted.includes(site) ? { ...s, planted: [...s.planted, site], actions: s.actions + 1 } : s;
}
export const markBlockedWater = (s: CooperationState): CooperationState => s.phase === 'work' && s.current === 'water' && !s.waterMarked ? { ...s, waterMarked: true, actions: s.actions + 1 } : s;
export function adjustWorkNoise(s: CooperationState, level: number): CooperationState {
  if (s.phase !== 'work' || s.current !== 'quiet' || !Number.isFinite(level)) return s;
  return { ...s, noiseLevel: number(level, 80, 100), noiseTouched: true, actions: s.actions + (s.noiseTouched ? 0 : 1) };
}
export const canCompleteMission = (s: CooperationState): boolean => s.phase === 'work' && (s.current === 'trees' ? s.planted.length === 2 : s.current === 'water' ? s.waterMarked : s.current === 'quiet' && s.noiseTouched && s.noiseLevel <= 35);
export function completeCooperationMission(s: CooperationState): CooperationState {
  return canCompleteMission(s) && s.current && !s.completed.includes(s.current) ? { ...s, phase: 'result', completed: [...s.completed, s.current] } : s;
}
export const returnToCooperationMap = (s: CooperationState): CooperationState => ['work', 'result'].includes(s.phase) ? { ...s, phase: 'map', current: null } : s;
export const finishCooperation = (s: CooperationState): CooperationState => s.completed.length === 3 ? { ...s, phase: 'ending', current: null } : s;

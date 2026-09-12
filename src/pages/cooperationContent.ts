import data from '../data/cooperationMissions.json';
import type { JobId } from '../shared/types';
import type { MissionId } from './stage5CooperationModel';
export type Link = { job: JobId; title: string; text: string; plan: string };
export interface CooperationMission {
  title: string; place: string; pin: { x: number; y: number }; job: JobId; instruction: string; bubble: string;
  before: string; after: string; action: string; resultTitle: string; result: string; time: string; links: Link[];
}
export const TEAM = data.team as Record<JobId, { name: string; image: string; action: string }>;
export const ORDER = data.order as JobId[];
export const MISSIONS = data.missions as Record<MissionId, CooperationMission>;

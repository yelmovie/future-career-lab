export type PageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type StageNumber = 1 | 2 | 3 | 4 | 5;

export type TraitKey =
  | 'exploration'
  | 'analysis'
  | 'creation'
  | 'care'
  | 'execution'
  | 'collaboration';

export type TraitScores = Record<TraitKey, number>;

export interface GameLog {
  id: string;
  page: PageNumber;
  type: string;
  summary: string;
  tags: string[];
  traits: Partial<TraitScores>;
  contextRef: string;
  createdAt: string;
}

export interface StageProgress {
  completed: Record<StageNumber, boolean>;
  completedPages: PageNumber[];
}

export interface AudioSettings {
  bgmVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface GameSave {
  schemaVersion: number;
  contentVersion: string;
  sessionSeed: number;
  playerName: string;
  lastPage: PageNumber;
  stageProgress: StageProgress;
  badges: string[];
  jobCards: string[];
  traits: TraitScores;
  logs: GameLog[];
  pageData: Record<string, unknown>;
  dailyMissionId: string;
  certificateUnlocked: boolean;
  rewardGranted: string[];
  audio: AudioSettings;
  updatedAt: string;
}

export interface LogInput {
  page: PageNumber;
  type: string;
  summary: string;
  tags?: string[];
  traits?: Partial<TraitScores>;
  contextRef: string;
}

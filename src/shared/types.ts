export type PageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type StageNumber = 1 | 2 | 3 | 4 | 5;
export type JobId = 'drone' | 'care' | 'ecology' | 'broadcast';

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

export type PhotoId = 'logging' | 'stream' | 'construction';
export type CauseId = 'logging' | 'noise' | 'water';

/** 스테이지 산출물. 앞 스테이지가 만들고 뒤 스테이지가 재료로 쓴다. */
export interface Artifacts {
  photos: { id: PhotoId; quality: 'center' | 'edge' }[];
  hypothesis: CauseId | null;
  careLog: { bird: 'green' | 'red'; issue: string; treatment: string }[];
  habitatStars: 0 | 1 | 2 | 3;
  traces: string[];
  graphs: { variable: CauseId; verdict: 'main' | 'sub' | 'none' }[];
  clip: { trust: number; corrections: number } | null;
  allianceTurns: number | null;
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
  artifacts: Artifacts;
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

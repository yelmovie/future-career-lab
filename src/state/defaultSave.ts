import { CONTENT_VERSION, SAVE_SCHEMA_VERSION } from '../shared/constants';
import { hashString, seedForSession } from '../shared/rng';
import type { Artifacts, GameSave, TraitScores } from '../shared/types';

const EMPTY_TRAITS: TraitScores = {
  exploration: 0,
  analysis: 0,
  creation: 0,
  care: 0,
  execution: 0,
  collaboration: 0,
};

export function createDefaultArtifacts(): Artifacts {
  return {
    photos: [],
    hypothesis: null,
    careLog: [],
    habitatStars: 0,
    traces: [],
    graphs: [],
    clip: null,
    allianceTurns: null,
  };
}

export function createDefaultSave(): GameSave {
  const today = new Date().toISOString().slice(0, 10);
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    sessionSeed: seedForSession(),
    playerName: '',
    lastPage: 1,
    stageProgress: {
      completed: { 1: false, 2: false, 3: false, 4: false, 5: false },
      completedPages: [],
    },
    badges: [],
    jobCards: [],
    traits: { ...EMPTY_TRAITS },
    logs: [],
    pageData: {},
    dailyMissionId: `daily-${(hashString(today) % 3) + 1}`,
    certificateUnlocked: false,
    rewardGranted: [],
    audio: { bgmVolume: 0.28, sfxVolume: 0.7, muted: false },
    artifacts: createDefaultArtifacts(),
    prediction: null,
    abilityStatements: [],
    updatedAt: new Date().toISOString(),
  };
}

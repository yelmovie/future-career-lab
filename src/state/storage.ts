import { CONTENT_VERSION, SAVE_KEY, SAVE_SCHEMA_VERSION } from '../shared/constants';
import type { GameSave } from '../shared/types';
import { createDefaultArtifacts, createDefaultSave } from './defaultSave';
import { isCertificateUnlocked } from './progress';

export interface LoadResult {
  save: GameSave;
  issue: 'none' | 'corrupt' | 'migrated';
  hadSave: boolean;
}

function isGameSave(value: unknown): value is GameSave {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameSave>;
  return typeof candidate.schemaVersion === 'number' && Array.isArray(candidate.logs) && Boolean(candidate.stageProgress);
}

export function loadSave(): LoadResult {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { save: createDefaultSave(), issue: 'none', hadSave: false };
    const parsed: unknown = JSON.parse(raw);
    if (!isGameSave(parsed)) throw new Error('Invalid save shape');
    if (parsed.schemaVersion > SAVE_SCHEMA_VERSION) throw new Error('Unsupported future schema');
    const migrated = parsed.schemaVersion !== SAVE_SCHEMA_VERSION || parsed.contentVersion !== CONTENT_VERSION;
    const base = createDefaultSave();
    // v1(스키마 1)은 페이지 번호 체계가 달라 완료 기록을 그대로 옮기면 산출물 없는 완료가 생긴다. 진행은 비우고 이름·설정만 유지.
    const legacy = parsed.schemaVersion < 2;
    const completedPages = !legacy && Array.isArray(parsed.stageProgress.completedPages) ? parsed.stageProgress.completedPages : [];
    const stageProgress = {
      completed: legacy ? { ...base.stageProgress.completed } : { ...base.stageProgress.completed, ...parsed.stageProgress.completed },
      completedPages,
    };
    const save: GameSave = {
      ...base,
      ...parsed,
      ...(legacy ? { lastPage: 1, badges: [], jobCards: [], logs: [], pageData: {}, traits: base.traits, rewardGranted: [] } : {}),
      schemaVersion: SAVE_SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      stageProgress,
      certificateUnlocked: isCertificateUnlocked(stageProgress.completedPages),
      audio: { ...base.audio, ...parsed.audio },
      artifacts: { ...createDefaultArtifacts(), ...(parsed.artifacts ?? {}) },
      prediction: parsed.prediction ?? null,
      abilityStatements: Array.isArray(parsed.abilityStatements) ? parsed.abilityStatements : [],
    };
    return { save, issue: migrated ? 'migrated' : 'none', hadSave: true };
  } catch {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch { /* storage unavailable — nothing to clean up */ }
    return { save: createDefaultSave(), issue: 'corrupt', hadSave: false };
  }
}

/** Returns false when the browser refused the write (private mode, quota exceeded). */
export function persistSave(save: GameSave): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

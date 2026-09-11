import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { TRAIT_KEYS } from '../shared/constants';
import type { Artifacts, AudioSettings, GameSave, LogInput, PageNumber } from '../shared/types';
import { createDefaultSave } from './defaultSave';
import { clearRecoverySave, loadSave, persistSave, type LoadResult } from './storage';
import { deriveStageCompletion } from './progress';
import { isTeacherPassword, loadTeacherPreview, persistTeacherPreview } from './teacherAccess';

interface GameContextValue {
  save: GameSave;
  hadSave: boolean;
  loadIssue: LoadResult['issue'];
  saveFailed: boolean;
  teacherMode: boolean;
  startNew: () => void;
  unlockTeacherMode: (password: string) => boolean;
  lockTeacherMode: () => void;
  setPlayerName: (name: string) => void;
  setLastPage: (page: PageNumber) => void;
  completePage: (page: PageNumber) => void;
  logEvent: (input: LogInput) => void;
  setPageData: (key: string, value: unknown) => void;
  addBadge: (badge: string) => void;
  addJobCard: (card: string) => void;
  grantReward: (reward: string) => void;
  setAudio: (settings: Partial<AudioSettings>) => void;
  setArtifacts: (patch: Partial<Artifacts>) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadSave);
  const [save, setSave] = useState<GameSave>(initial.save);
  const [hadSave, setHadSave] = useState(initial.hadSave);
  const [saveFailed, setSaveFailed] = useState(false);
  const [teacherMode, setTeacherMode] = useState(loadTeacherPreview);

  useEffect(() => {
    setSaveFailed(!persistSave(save));
  }, [save]);

  const update = useCallback((recipe: (current: GameSave) => GameSave) => {
    setSave((current) => ({ ...recipe(current), updatedAt: new Date().toISOString() }));
    setHadSave(true);
  }, []);

  const startNew = useCallback(() => {
    clearRecoverySave();
    const fresh = createDefaultSave();
    setSave(fresh);
    setHadSave(true);
  }, []);

  const unlockTeacherMode = useCallback((password: string) => {
    const accepted = isTeacherPassword(password);
    if (accepted) {
      setTeacherMode(true);
      persistTeacherPreview(true);
    }
    return accepted;
  }, []);

  const lockTeacherMode = useCallback(() => {
    setTeacherMode(false);
    persistTeacherPreview(false);
  }, []);

  const setPlayerName = useCallback((playerName: string) => update((current) => ({ ...current, playerName })), [update]);
  const setLastPage = useCallback((lastPage: PageNumber) => update((current) => ({ ...current, lastPage })), [update]);

  const completePage = useCallback((page: PageNumber) => update((current) => {
    const completedPages = current.stageProgress.completedPages.includes(page)
      ? current.stageProgress.completedPages
      : [...current.stageProgress.completedPages, page];
    const completed = deriveStageCompletion(completedPages);
    const certificateUnlocked = Object.values(completed).every(Boolean);
    return {
      ...current,
      stageProgress: { completed, completedPages },
      certificateUnlocked,
    };
  }), [update]);

  const logEvent = useCallback((input: LogInput) => update((current) => {
    const duplicateKey = `${input.page}:${input.type}:${input.contextRef}`;
    if (current.logs.some((log) => `${log.page}:${log.type}:${log.contextRef}` === duplicateKey)) return current;
    const traits = { ...current.traits };
    for (const key of TRAIT_KEYS) traits[key] += input.traits?.[key] ?? 0;
    return {
      ...current,
      traits,
      logs: [
        ...current.logs,
        {
          ...input,
          id: `${duplicateKey}:${current.logs.length + 1}`,
          tags: input.tags ?? [],
          traits: input.traits ?? {},
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }), [update]);

  const setPageData = useCallback((key: string, value: unknown) => update((current) => ({
    ...current,
    pageData: { ...current.pageData, [key]: value },
  })), [update]);

  const addUnique = useCallback((field: 'badges' | 'jobCards' | 'rewardGranted', value: string) => update((current) => ({
    ...current,
    [field]: current[field].includes(value) ? current[field] : [...current[field], value],
  })), [update]);

  const setAudio = useCallback((audio: Partial<AudioSettings>) => update((current) => ({
    ...current,
    audio: { ...current.audio, ...audio },
  })), [update]);

  const setArtifacts = useCallback((patch: Partial<Artifacts>) => update((current) => ({
    ...current,
    artifacts: { ...current.artifacts, ...patch },
  })), [update]);

  const value = useMemo<GameContextValue>(() => ({
    save,
    hadSave,
    loadIssue: initial.issue,
    saveFailed,
    teacherMode,
    startNew,
    unlockTeacherMode,
    lockTeacherMode,
    setPlayerName,
    setLastPage,
    completePage,
    logEvent,
    setPageData,
    addBadge: (badge) => addUnique('badges', badge),
    addJobCard: (card) => addUnique('jobCards', card),
    grantReward: (reward) => addUnique('rewardGranted', reward),
    setAudio,
    setArtifacts,
  }), [addUnique, setArtifacts, completePage, hadSave, initial.issue, lockTeacherMode, logEvent, save, saveFailed, setAudio, setLastPage, setPageData, setPlayerName, startNew, teacherMode, unlockTeacherMode]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used inside GameProvider');
  return context;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTENT_VERSION, SAVE_KEY, SAVE_SCHEMA_VERSION } from '../src/shared/constants';
import { createDefaultSave } from '../src/state/defaultSave';
import { clearRecoverySave, loadSave, normalizeSave, persistSave, RECOVERY_SAVE_KEY } from '../src/state/storage';
import { acknowledgeIncidentRecovery, createBroadcast, resolveIncident, restoreBroadcast } from '../src/pages/page08BroadcastModel';
import { plantSapling, restoreCooperation, selectCooperationMission, startCooperation } from '../src/pages/stage5CooperationModel';

function savedProgress() {
  const save = createDefaultSave();
  save.playerName = '푸른솔';
  save.lastPage = 7;
  save.stageProgress = { completedPages: [3, 4], completed: { 1: true, 2: false, 3: false, 4: false, 5: false } };
  save.artifacts.photos = [{ id: 'logging', quality: 'center' }];
  save.artifacts.hypothesis = 'noise';
  save.logs = [{ id: 'observation-1', page: 3, type: 'photo', summary: '숲 사진을 비교했어', tags: ['관찰'], traits: { analysis: 2 }, contextRef: 'p3:logging', createdAt: save.updatedAt }];
  return save;
}

let values: Map<string, string>;
let local: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: 'storage-test' });
  values = new Map();
  local = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  vi.stubGlobal('localStorage', local);
  clearRecoverySave();
  local.removeItem.mockClear();
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('field-level save recovery', () => {
  it('round-trips a partly planted cooperation scene without losing prior learning records', () => {
    const state = plantSapling(selectCooperationMission(startCooperation(restoreCooperation(null)), 'trees'), 'left');
    const save = { ...savedProgress(), pageData: { p9Cooperation: state } };
    expect(persistSave(save)).toBe(true);
    const loaded = loadSave();
    expect(loaded.issue).toBe('none');
    expect(loaded.save.pageData.p9Cooperation).toEqual(state);
    expect(loaded.save.artifacts).toEqual(save.artifacts);
    expect(loaded.save.logs).toEqual(save.logs);
  });

  it('repairs cooperation state fields without forgetting completed places', () => {
    const state = { ...restoreCooperation(null), phase: 'work', current: 'unknown', completed: ['water', 'water', 'unknown'], planted: ['left', 'bad'], noiseLevel: 900, actions: null };
    const result = normalizeSave({ ...savedProgress(), pageData: { p9Cooperation: state } });
    expect(result.issue).toBe('corrupt');
    expect(result.save.pageData.p9Cooperation).toMatchObject({ phase: 'map', current: null, completed: ['water'], planted: ['left'], noiseLevel: 100, actions: 0 });
  });
  it('round-trips a valid save with actual learning records', () => {
    const save = savedProgress();
    save.pageData = { currentExperiment: { selected: 'water', evidence: ['실험 기록'], position: 0.4 } };
    expect(normalizeSave(save)).toEqual({ save, issue: 'none', hadSave: true });
  });

  it('retains good progress while repairing nested arrays, artifacts, and audio', () => {
    const save = savedProgress();
    const result = normalizeSave({ ...save,
      badges: ['ecology', 5, 'ecology'], jobCards: null, rewardGranted: ['photo-1', false],
      audio: { bgmVolume: 4, sfxVolume: null, muted: 'false' },
      traits: { ...save.traits, analysis: Number.NaN, care: -2, exploration: 2.9 },
      artifacts: { ...save.artifacts, photos: [...save.artifacts.photos, null, { id: 'other', quality: 'center' }], careLog: [{ bird: 'green', issue: '날개', treatment: '쉬기' }, false], graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 4 }], habitatStars: 8, clip: { trust: -10, corrections: 2.8 } },
      logs: [...save.logs, { id: 'bad', page: 99 }, null],
    });
    expect(result.issue).toBe('corrupt');
    expect(result.hadSave).toBe(true);
    expect(result.save.playerName).toBe(save.playerName);
    expect(result.save.stageProgress).toEqual(save.stageProgress);
    expect(result.save.logs).toEqual(save.logs);
    expect(result.save.badges).toEqual(['ecology']);
    expect(result.save.jobCards).toEqual([]);
    expect(result.save.rewardGranted).toEqual(['photo-1']);
    expect(result.save.audio).toEqual({ bgmVolume: 1, sfxVolume: 0.7, muted: false });
    expect(result.save.traits).toMatchObject({ analysis: 0, care: 0, exploration: 2 });
    expect(result.save.artifacts).toMatchObject({ photos: save.artifacts.photos, hypothesis: 'noise', habitatStars: 3, clip: { trust: 0, corrections: 2 }, careLog: [{ bird: 'green', issue: '날개', treatment: '쉬기' }], graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'none' }] });
  });

  it('recomputes stage flags and certificate from valid completed pages', () => {
    const save = savedProgress();
    const { save: result, issue } = normalizeSave({ ...save, certificateUnlocked: true, stageProgress: { completedPages: [3, 3, 4, 0, 12, '5'], completed: { 1: false, 5: true } } });
    expect(issue).toBe('corrupt');
    expect(result.stageProgress).toEqual(save.stageProgress);
    expect(result.certificateUnlocked).toBe(false);
  });

  it('preserves valid trait penalties in logs while removing malformed fields', () => {
    const save = savedProgress();
    const log = { ...save.logs[0]!, tags: [3, '수정'], traits: { analysis: -2, care: Infinity, imaginary: 50 }, createdAt: 'bad-date' };
    const result = normalizeSave({ ...save, logs: [log, log] });
    expect(result.save.logs).toHaveLength(1);
    expect(result.save.logs[0]).toMatchObject({ traits: { analysis: -2, care: 0 }, tags: ['수정'] });
    expect(Number.isFinite(Date.parse(result.save.logs[0]!.createdAt))).toBe(true);
    expect(result.issue).toBe('corrupt');
  });

  it('preserves unknown current page data but drops retired and unsafe keys', () => {
    const save = savedProgress();
    const pages = JSON.parse('{"newActivity":{"answers":["숲",2,true,null],"nested":{"selected":2}},"prediction":"old","abilities":["old"],"__proto__":{"polluted":true}}');
    const result = normalizeSave({ ...save, predictions: ['old'], abilityStatements: ['old'], pageData: pages });
    expect(result.save.pageData).toEqual({ newActivity: { answers: ['숲', 2, true, null], nested: { selected: 2 } } });
    expect(result.save).not.toHaveProperty('predictions');
    expect(result.save).not.toHaveProperty('abilityStatements');
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('normalizes known page boundaries while preserving valid extra page fields', () => {
    const save = savedProgress();
    const result = normalizeSave({ ...save, pageData: {
      p2Progress: { line: Infinity, met: ['drone', 'drone', 'care', 'unknown'] },
      p3Waypoints: [{ x: 1.8, y: -1 }, null],
      page07Ecology: { step: 9, point: 'Z', found: ['stump', 9], fewest: null, active: 'water', main: 'noise', trials: [{ variable: 'logging', from: 2, to: 10, before: 1, after: 10 }, { variable: 'water', from: 0, to: 5, before: NaN, after: 2 }], lastTrial: null, conclusionHistory: ['water', 'bad', 'logging'], customNote: '내 관찰' },
      p8Broadcast: { index: 100, trust: -20, corrections: null, ap: 9, correctionAt: [1, '2', 9], incidentPlan: {}, pendingIncident: 'bad', incidentLog: [null], log: [false], draft: { source: 'bad', captionId: {}, level: 150 }, reviewedCaptionIds: ['card-1', 9], pendingCorrection: 50, correctionLog: [{ from: 'old', to: 'checked' }, null] },
    } });
    expect(result.save.pageData.p2Progress).toEqual({ line: 0, met: ['drone', 'care'] });
    expect(result.save.pageData.p3Waypoints).toEqual([{ x: 1, y: 0 }]);
    expect(result.save.pageData.page07Ecology).toMatchObject({ step: 3, point: 'A', found: ['stump'], fewest: false, trials: [{ variable: 'logging', from: 2, to: 10, before: 1, after: 10 }], conclusionHistory: ['water', 'logging'], customNote: '내 관찰' });
    expect(result.save.pageData.p8Broadcast).toMatchObject({ index: 4, trust: 0, corrections: 0, ap: 3, correctionAt: [1], incidentPlan: [], incidentLog: [], log: [], draft: { source: null, captionId: null, level: 100 }, reviewedCaptionIds: ['card-1'], pendingCorrection: null, correctionLog: [{ from: 'old', to: 'checked' }] });
    expect(result.issue).toBe('corrupt');
  });

  it('persists and reloads the mic recovery screen without another action cost', () => {
    const fixed = resolveIncident({ ...createBroadcast(), index: 2, pendingIncident: 'mic' }, 'mic-swap');
    const save = { ...savedProgress(), pageData: { p8Broadcast: fixed } };
    expect(persistSave(save)).toBe(true);
    const loaded = loadSave();
    expect(loaded.issue).toBe('none');
    const restored = restoreBroadcast(loaded.save.pageData.p8Broadcast)!;
    expect(restored).toEqual(fixed);
    expect(resolveIncident(restored, 'mic-swap')).toBe(restored);
    expect(acknowledgeIncidentRecovery(restored)).toEqual({ ...fixed, pendingRecovery: null });
  });

  it('keeps old finished broadcasts finished when the recovery field is absent', () => {
    const legacy = JSON.parse(JSON.stringify({ ...createBroadcast(), index: 4, ap: 1, incidentLog: [{ incidentId: 'mic', actionId: 'mic-swap' }] }));
    delete legacy.pendingRecovery;
    const result = normalizeSave({ ...savedProgress(), pageData: { p8Broadcast: legacy } });
    expect(result.issue).toBe('none');
    expect(result.save.pageData.p8Broadcast).toEqual({ ...legacy, pendingRecovery: null });
  });

  it.each(['unknown', true, {}, []])('sanitizes invalid mic recovery value %j without losing progress', (pendingRecovery) => {
    const result = normalizeSave({ ...savedProgress(), pageData: { p8Broadcast: { ...createBroadcast(), index: 2, pendingRecovery } } });
    expect(result.issue).toBe('corrupt');
    expect(result.save.pageData.p8Broadcast).toMatchObject({ index: 2, pendingRecovery: null });
    expect(result.save.stageProgress.completedPages).toEqual([3, 4]);
  });

  it('prioritizes a pending mic problem over a contradictory recovery screen', () => {
    const result = normalizeSave({ ...savedProgress(), pageData: { p8Broadcast: { ...createBroadcast(), index: 2, pendingIncident: 'mic', pendingRecovery: 'mic' } } });
    expect(result.issue).toBe('corrupt');
    expect(result.save.pageData.p8Broadcast).toMatchObject({ index: 2, pendingIncident: 'mic', pendingRecovery: null });
  });

  it.each([0, -1, null, NaN, Infinity, 2.5])('does not treat a damaged schema %s as a v1 progress reset', (schemaVersion) => {
    const save = savedProgress();
    const result = normalizeSave({ ...save, schemaVersion });
    expect(result.issue).toBe('corrupt');
    expect(result.save.logs).toEqual(save.logs);
    expect(result.save.stageProgress.completedPages).toEqual([3, 4]);
  });

  it('recovers care and garden nested states without erasing valid placements or the new transfer phase', () => {
    const result = normalizeSave({ ...savedProgress(), pageData: {
      page05Care: { records: { green: null, red: ['bad'] }, treatments: { green: 'water', red: 'bad' }, wrongTreatments: -3, wrongRecords: null },
      page06Session: { placed: { shade: ['water', 'hideout', 'feeder', 'rope'], perch: ['rope', 'water', null] }, step: 2, tested: true, attempts: 2, revisions: -1 },
      page06Design: { placed: { shade: ['water'], perch: null }, result: { stars: 3 }, attempts: 1, revisions: 0 },
      p9Alliance: { phase: 'transfer', index: 2, turn: 3, attempts: 12, solo: 'ecology', extraEvidence: ['기록'] },
    } });
    expect(result.issue).toBe('corrupt');
    expect(result.save.pageData.page05Care).toMatchObject({ records: { green: {}, red: {} }, treatments: { green: 'water', red: null }, wrongTreatments: 0, wrongRecords: 0 });
    expect(result.save.pageData.page06Session).toMatchObject({ placed: { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] }, step: 2, tested: true, attempts: 2, revisions: 0 });
    expect(result.save.pageData.page06Design).toMatchObject({ placed: { shade: ['water'], perch: [] }, result: { stars: 1 } });
    expect(result.save.pageData.p9Alliance).toMatchObject({ phase: 'transfer', extraEvidence: ['기록'] });
  });

  it('keeps the existing v1 progress reset policy and retains name and audio', () => {
    const save = savedProgress();
    const result = normalizeSave({ ...save, schemaVersion: 1, contentVersion: 'old', badges: ['old'], pageData: { abilities: ['old'], currentPage: { value: 1 } } });
    expect(result.issue).toBe('migrated');
    expect(result.save).toMatchObject({ schemaVersion: SAVE_SCHEMA_VERSION, contentVersion: CONTENT_VERSION, playerName: save.playerName, audio: save.audio, lastPage: 1, logs: [], badges: [], pageData: {}, certificateUnlocked: false });
    expect(result.save.stageProgress.completedPages).toEqual([]);
    expect(result.save.artifacts.photos).toEqual([]);
  });

  it('migrates v2 without discarding valid learning records', () => {
    const save = savedProgress();
    const result = normalizeSave({ ...save, schemaVersion: 2, contentVersion: 'old' });
    expect(result.issue).toBe('migrated');
    expect(result.save.logs).toEqual(save.logs);
    expect(result.save.artifacts).toEqual(save.artifacts);
  });

  it.each([null, [], 7, 'saved'])('recovers invalid top-level input %s without throwing', (value) => {
    expect(normalizeSave(value)).toMatchObject({ issue: 'corrupt', hadSave: false, save: { lastPage: 1, logs: [] } });
  });
});

describe('preserving the original during recovery', () => {
  it('leaves invalid JSON in place and backs it up before saving recovery data', () => {
    const raw = '{broken original';
    values.set(SAVE_KEY, raw);
    const result = loadSave();
    expect(result).toMatchObject({ issue: 'corrupt', hadSave: false });
    expect(values.get(SAVE_KEY)).toBe(raw);
    expect(local.removeItem).not.toHaveBeenCalled();
    expect(persistSave(result.save)).toBe(true);
    expect(values.get(RECOVERY_SAVE_KEY)).toBe(raw);
    expect(local.setItem.mock.calls[0]![0]).toBe(RECOVERY_SAVE_KEY);
    expect(JSON.parse(values.get(SAVE_KEY)!)).toMatchObject({ schemaVersion: SAVE_SCHEMA_VERSION });
  });

  it('backs up partially damaged and unsupported future saves too', () => {
    for (const rawSave of [{ ...savedProgress(), audio: null }, { ...savedProgress(), schemaVersion: SAVE_SCHEMA_VERSION + 1 }]) {
      const raw = JSON.stringify(rawSave);
      values.set(SAVE_KEY, raw);
      const result = loadSave();
      expect(result.issue).toBe('corrupt');
      expect(persistSave(result.save)).toBe(true);
      expect(values.get(RECOVERY_SAVE_KEY)).toBe(raw);
    }
  });

  it('does not overwrite the original when the recovery backup cannot be saved', () => {
    const raw = '{do not erase';
    values.set(SAVE_KEY, raw);
    const result = loadSave();
    local.setItem.mockImplementation(() => { throw new Error('quota'); });
    expect(persistSave(result.save)).toBe(false);
    expect(values.get(SAVE_KEY)).toBe(raw);
    expect(local.setItem).toHaveBeenCalledTimes(1);
    expect(local.setItem.mock.calls[0]![0]).toBe(RECOVERY_SAVE_KEY);
  });

  it('does not overwrite an unreadable save if storage access is blocked', () => {
    values.set(SAVE_KEY, 'original');
    local.getItem.mockImplementation(() => { throw new Error('denied'); });
    const result = loadSave();
    expect(persistSave(result.save)).toBe(false);
    expect(local.setItem).not.toHaveBeenCalled();
    expect(values.get(SAVE_KEY)).toBe('original');
  });

  it('clears recovery data on an explicit new exploration', () => {
    values.set(SAVE_KEY, '{old');
    loadSave();
    values.set(RECOVERY_SAVE_KEY, '{older');
    clearRecoverySave();
    expect(values.has(RECOVERY_SAVE_KEY)).toBe(false);
    expect(persistSave(createDefaultSave())).toBe(true);
    expect(values.has(RECOVERY_SAVE_KEY)).toBe(false);
  });

  it('starts cleanly without an existing save', () => {
    expect(loadSave()).toMatchObject({ issue: 'none', hadSave: false });
    expect(persistSave(savedProgress())).toBe(true);
    expect(values.has(RECOVERY_SAVE_KEY)).toBe(false);
  });
});

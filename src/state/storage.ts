import { CONTENT_VERSION, SAVE_KEY, SAVE_SCHEMA_VERSION, TRAIT_KEYS } from '../shared/constants';
import type { Artifacts, CauseId, GameLog, GameSave, PageNumber, TraitScores } from '../shared/types';
import { createDefaultSave } from './defaultSave';
import { deriveStageCompletion, isCertificateUnlocked } from './progress';
import { readCareState } from '../pages/page05CareModel';
import { gardenStars, readGarden, readGardenSession } from '../pages/gardenModel';
import { restoreCooperation } from '../pages/stage5CooperationModel';

export interface LoadResult {
  save: GameSave;
  issue: 'none' | 'corrupt' | 'migrated';
  hadSave: boolean;
}

export const RECOVERY_SAVE_KEY = `${SAVE_KEY}.recovery`;
let originalToPreserve: string | null = null;
let storageReadBlocked = false;
const CAUSES = ['logging', 'noise', 'water'] as const;
const PHOTOS = ['logging', 'stream', 'construction'] as const;
const JOBS = ['drone', 'care', 'ecology', 'broadcast'] as const;
const RETIRED = new Set(['prediction', 'predictions', 'abilityStatements', 'abilities']);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isPage = (value: unknown): value is PageNumber => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 11;

/** 필드 하나가 깨졌다고 유효한 탐험 전체를 버리지 않는다. */
class SaveReader {
  repaired = false;
  object(value: unknown): Record<string, unknown> {
    if (isObject(value)) return value;
    this.repaired = true;
    return {};
  }
  array(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    this.repaired = true;
    return [];
  }
  filter(value: unknown, accept: (item: unknown) => boolean): unknown[] {
    return this.array(value).filter((item) => { if (accept(item)) return true; this.repaired = true; return false; });
  }
  number(value: unknown, fallback: number, min = 0, max = 1_000_000, integer = true): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) { this.repaired = true; return fallback; }
    const result = Math.max(min, Math.min(max, integer ? Math.floor(value) : value));
    if (result !== value) this.repaired = true;
    return result;
  }
  string(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value;
    this.repaired = true;
    return fallback;
  }
  bool(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') return value;
    this.repaired = true;
    return fallback;
  }
  oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    if (typeof value === 'string' && allowed.includes(value as T)) return value as T;
    this.repaired = true;
    return fallback;
  }
  nullable<T extends string>(value: unknown, allowed: readonly T[]): T | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && allowed.includes(value as T)) return value as T;
    this.repaired = true;
    return null;
  }
  strings(value: unknown): string[] {
    const result: string[] = [];
    for (const item of this.array(value)) {
      if (typeof item === 'string' && item.length > 0 && !result.includes(item)) result.push(item);
      else this.repaired = true;
    }
    return result;
  }
  date(value: unknown, fallback: string): string {
    if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return value;
    this.repaired = true;
    return fallback;
  }
  model(raw: Record<string, unknown>, normalized: object): Record<string, unknown> {
    if (Object.entries(normalized).some(([key, item]) => JSON.stringify(raw[key]) !== JSON.stringify(item))) this.repaired = true;
    return { ...raw, ...normalized };
  }
  /** 확장 페이지 상태는 보존하되 JSON 밖 값·위험 키·폐기 필드는 다시 살리지 않는다. */
  json(value: unknown, depth = 0): unknown {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (depth > 30) { this.repaired = true; return null; }
    if (Array.isArray(value)) return value.map((item) => this.json(item, depth + 1));
    if (isObject(value)) {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        if (RETIRED.has(key)) continue;
        if (UNSAFE_KEYS.has(key)) { this.repaired = true; continue; }
        result[key] = this.json(item, depth + 1);
      }
      return result;
    }
    this.repaired = true;
    return null;
  }
}

function readTraits(reader: SaveReader, value: unknown, partial = false): Partial<TraitScores> {
  const raw = reader.object(value);
  const result: Partial<TraitScores> = {};
  for (const key of TRAIT_KEYS) {
    if (partial && raw[key] === undefined) continue;
    result[key] = reader.number(raw[key], 0, partial ? -1_000 : 0);
  }
  return result;
}

function readPhotos(reader: SaveReader, value: unknown): Artifacts['photos'] {
  const result: Artifacts['photos'] = [];
  for (const item of reader.array(value)) {
    const photo = reader.object(item);
    const id = reader.nullable(photo.id, PHOTOS);
    if (!id || result.some((entry) => entry.id === id)) { reader.repaired = true; continue; }
    result.push({ id, quality: reader.oneOf(photo.quality, ['center', 'edge'], 'edge') });
  }
  return result;
}

function readArtifacts(reader: SaveReader, value: unknown): Artifacts {
  const raw = reader.object(value);
  const careLog: Artifacts['careLog'] = [];
  for (const item of reader.array(raw.careLog)) {
    const entry = reader.object(item);
    const bird = reader.nullable(entry.bird, ['green', 'red']);
    if (!bird || typeof entry.issue !== 'string' || typeof entry.treatment !== 'string') { reader.repaired = true; continue; }
    careLog.push({ bird, issue: entry.issue, treatment: entry.treatment });
  }
  const graphs: Artifacts['graphs'] = [];
  for (const item of reader.array(raw.graphs)) {
    const graph = reader.object(item);
    const variable = reader.nullable(graph.variable, CAUSES);
    if (!variable || graphs.some((entry) => entry.variable === variable)) { reader.repaired = true; continue; }
    graphs.push({ variable, verdict: reader.oneOf(graph.verdict, ['main', 'sub', 'none'], 'none') });
  }
  const clip = raw.clip === null || raw.clip === undefined ? null : reader.object(raw.clip);
  return {
    photos: readPhotos(reader, raw.photos), hypothesis: reader.nullable(raw.hypothesis, CAUSES), careLog,
    habitatStars: reader.number(raw.habitatStars, 0, 0, 3) as Artifacts['habitatStars'],
    traces: reader.strings(raw.traces), graphs,
    clip: clip ? { trust: reader.number(clip.trust, 0, 0, 100), corrections: reader.number(clip.corrections, 0) } : null,
    allianceTurns: raw.allianceTurns === null || raw.allianceTurns === undefined ? null : reader.number(raw.allianceTurns, 0),
  };
}

function readLogs(reader: SaveReader, value: unknown, date: string): GameLog[] {
  const result: GameLog[] = [];
  for (const item of reader.array(value)) {
    const log = reader.object(item);
    if (!isPage(log.page) || !['id', 'type', 'summary', 'contextRef'].every((key) => typeof log[key] === 'string' && (log[key] as string).length > 0)) {
      reader.repaired = true; continue;
    }
    if (result.some((entry) => entry.id === log.id)) { reader.repaired = true; continue; }
    result.push({ id: log.id as string, page: log.page, type: log.type as string, summary: log.summary as string,
      contextRef: log.contextRef as string, tags: reader.strings(log.tags), traits: readTraits(reader, log.traits, true), createdAt: reader.date(log.createdAt, date) });
  }
  return result;
}

function readPageData(reader: SaveReader, value: unknown): Record<string, unknown> {
  const pages = reader.json(reader.object(value)) as Record<string, unknown>;
  // 알 수 없는 페이지 상태는 보존한다. 소비 코드가 숫자/배열을 전제하는 경계만 정규화한다.
  if ('p3Waypoints' in pages) pages.p3Waypoints = reader.array(pages.p3Waypoints).slice(0, 4).flatMap((item) => {
    if (!isObject(item) || typeof item.x !== 'number' || typeof item.y !== 'number') { reader.repaired = true; return []; }
    return [{ x: reader.number(item.x, 0, 0, 1, false), y: reader.number(item.y, 0, 0, 1, false) }];
  });
  if ('p3Result' in pages && pages.p3Result !== null) {
    const raw = reader.object(pages.p3Result);
    const photos = readPhotos(reader, raw.photos);
    const batteryRemaining = reader.number(raw.batteryRemaining, 0, 0, 100, false);
    const drainByZone = Object.fromEntries(Object.entries(reader.object(raw.drainByZone)).filter(([key]) => /^wind-\d+$/.test(key)).map(([key, count]) => [key, reader.number(count, 0, 0, 1_000_000, false)]));
    pages.p3Result = { photos, batteryRemaining, drainByZone, passed: photos.length === 3, precision: photos.length === 3 && photos.every((photo) => photo.quality === 'center') && batteryRemaining >= 30 };
  }
  for (const key of ['p2Progress', 'page05Care', 'page06Draft', 'page06Session', 'page06Design', 'page07Ecology', 'p8Broadcast', 'p9Alliance']) {
    if (key in pages && !isObject(pages[key])) { pages[key] = {}; reader.repaired = true; }
  }
  if (isObject(pages.p2Progress)) {
    const raw = pages.p2Progress;
    const met = reader.strings(raw.met);
    pages.p2Progress = { ...raw, line: reader.number(raw.line, 0, 0, 2), met: met.filter((item) => {
      if (JOBS.includes(item as typeof JOBS[number])) return true;
      reader.repaired = true; return false;
    }) };
  }
  if (isObject(pages.page05Care)) pages.page05Care = reader.model(pages.page05Care, readCareState(pages.page05Care));
  if (isObject(pages.page06Draft)) pages.page06Draft = reader.model(pages.page06Draft, readGarden(pages.page06Draft));
  if (isObject(pages.page06Session)) pages.page06Session = reader.model(pages.page06Session, readGardenSession(pages.page06Session, pages.page06Draft));
  if (isObject(pages.page06Design)) {
    const raw = pages.page06Design;
    const placed = readGarden(raw.placed);
    pages.page06Design = reader.model(raw, { placed, result: gardenStars(placed), attempts: reader.number(raw.attempts, 0), revisions: reader.number(raw.revisions, 0) });
  }
  if (isObject(pages.page07Ecology)) {
    const raw = pages.page07Ecology;
    const trial = (item: unknown): Record<string, unknown> | null => {
      const entry = reader.object(item);
      const variable = reader.nullable(entry.variable, CAUSES);
      if (!variable || ![entry.from, entry.to, entry.before, entry.after].every((number) => typeof number === 'number' && Number.isFinite(number))) { reader.repaired = true; return null; }
      return { variable, from: reader.number(entry.from, 0, 0, 10), to: reader.number(entry.to, 0, 0, 10), before: reader.number(entry.before, 0), after: reader.number(entry.after, 0) };
    };
    pages.page07Ecology = { ...raw, step: reader.number(raw.step, 1, 1, 3), point: reader.oneOf(raw.point, ['A', 'B', 'C'], 'A'),
      found: reader.strings(raw.found), fewest: reader.bool(raw.fewest), trials: reader.array(raw.trials).map(trial).filter(Boolean),
      active: reader.nullable(raw.active, CAUSES), main: reader.nullable(raw.main, CAUSES), lastTrial: raw.lastTrial ? trial(raw.lastTrial) : null,
      ...(raw.conclusionHistory === undefined ? {} : { conclusionHistory: reader.array(raw.conclusionHistory).map((item) => reader.nullable(item, CAUSES)).filter((item): item is CauseId => item !== null) }) };
  }
  if (isObject(pages.p9Alliance)) {
    const raw = pages.p9Alliance;
    pages.p9Alliance = { ...raw, phase: reader.oneOf(raw.phase, ['solo', 'soloResult', 'turn', 'result', 'transfer'], 'solo'),
      index: reader.number(raw.index, 0, 0, 2), turn: reader.number(raw.turn, 0, 0, 3), attempts: reader.number(raw.attempts, 0), solo: reader.nullable(raw.solo, JOBS) };
  }
  if ('p9Cooperation' in pages) pages.p9Cooperation = reader.model(reader.object(pages.p9Cooperation), restoreCooperation(pages.p9Cooperation, pages.p9Alliance));
  if (isObject(pages.p8Broadcast)) {
    const raw = pages.p8Broadcast;
    const draft = reader.object(raw.draft);
    const pendingIncident = reader.nullable(raw.pendingIncident, ['mic']);
    const pendingRecovery = reader.nullable(raw.pendingRecovery, ['mic']);
    if (pendingIncident && pendingRecovery) reader.repaired = true;
    pages.p8Broadcast = { ...raw, index: reader.number(raw.index, 0, 0, 4), trust: reader.number(raw.trust, 100, 0, 100), corrections: reader.number(raw.corrections, 0), ap: reader.number(raw.ap, 3, 0, 3),
      correctionAt: reader.filter(raw.correctionAt, (item) => typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 4),
      incidentPlan: reader.strings(raw.incidentPlan).filter((item) => item === 'mic'), pendingIncident,
      pendingRecovery: pendingIncident ? null : pendingRecovery,
      incidentLog: reader.filter(raw.incidentLog, (item) => isObject(item) && item.incidentId === 'mic' && ['mic-swap', 'mic-ignore'].includes(String(item.actionId))),
      log: reader.filter(raw.log, (item) => isObject(item) && ['segmentId', 'title', 'captionId'].every((key) => typeof item[key] === 'string') && ['drone', 'studio', 'reporter'].includes(String(item.source)) && typeof item.sourced === 'boolean'),
      draft: { source: reader.nullable(draft.source, ['drone', 'studio', 'reporter']), captionId: typeof draft.captionId === 'string' ? draft.captionId : null, level: reader.number(draft.level, 20, 0, 100) },
      ...(raw.reviewedCaptionIds === undefined ? {} : { reviewedCaptionIds: reader.strings(raw.reviewedCaptionIds) }),
      pendingCorrection: typeof raw.pendingCorrection === 'string' ? raw.pendingCorrection : null,
      ...(raw.correctionLog === undefined ? {} : { correctionLog: reader.filter(raw.correctionLog, (item) => isObject(item) && typeof item.from === 'string' && typeof item.to === 'string') }) };
  }
  return pages;
}

/** JSON 해석과 저장소 접근을 분리하여 NaN·부분 손상도 독립적으로 검증한다. */
export function normalizeSave(value: unknown): LoadResult {
  const base = createDefaultSave();
  if (!isObject(value) || (typeof value.schemaVersion === 'number' && Number.isInteger(value.schemaVersion) && value.schemaVersion > SAVE_SCHEMA_VERSION)) return { save: base, issue: 'corrupt', hadSave: false };
  const reader = new SaveReader();
  const raw = value;
  const validSchema = typeof raw.schemaVersion === 'number' && Number.isInteger(raw.schemaVersion) && raw.schemaVersion >= 1 && raw.schemaVersion <= SAVE_SCHEMA_VERSION;
  const schema = validSchema ? raw.schemaVersion as number : SAVE_SCHEMA_VERSION;
  if (!validSchema) reader.repaired = true;
  const legacy = schema < 2;
  const progress = reader.object(raw.stageProgress);
  const completedPages = legacy ? [] : reader.array(progress.completedPages).filter((page): page is PageNumber => { if (isPage(page)) return true; reader.repaired = true; return false; }).filter((page, index, list) => { if (list.indexOf(page) === index) return true; reader.repaired = true; return false; });
  const audio = reader.object(raw.audio);
  const save: GameSave = {
    schemaVersion: SAVE_SCHEMA_VERSION, contentVersion: CONTENT_VERSION,
    sessionSeed: reader.number(raw.sessionSeed, base.sessionSeed, 0, 0xffffffff), playerName: reader.string(raw.playerName),
    lastPage: legacy ? 1 : isPage(raw.lastPage) ? raw.lastPage : 1,
    stageProgress: { completedPages, completed: deriveStageCompletion(completedPages) },
    badges: legacy ? [] : reader.strings(raw.badges), jobCards: legacy ? [] : reader.strings(raw.jobCards),
    traits: legacy ? base.traits : readTraits(reader, raw.traits) as TraitScores,
    logs: legacy ? [] : readLogs(reader, raw.logs, base.updatedAt), pageData: legacy ? {} : readPageData(reader, raw.pageData),
    dailyMissionId: reader.string(raw.dailyMissionId, base.dailyMissionId), certificateUnlocked: isCertificateUnlocked(completedPages),
    rewardGranted: legacy ? [] : reader.strings(raw.rewardGranted),
    audio: { bgmVolume: reader.number(audio.bgmVolume, base.audio.bgmVolume, 0, 1, false), sfxVolume: reader.number(audio.sfxVolume, base.audio.sfxVolume, 0, 1, false), muted: reader.bool(audio.muted, base.audio.muted) },
    artifacts: legacy ? base.artifacts : readArtifacts(reader, raw.artifacts), updatedAt: reader.date(raw.updatedAt, base.updatedAt),
  };
  if (!legacy && !isPage(raw.lastPage)) reader.repaired = true;
  if (!legacy && (!isObject(progress.completed) || Object.entries(save.stageProgress.completed).some(([stage, complete]) => (progress.completed as Record<string, unknown>)[stage] !== complete) || raw.certificateUnlocked !== save.certificateUnlocked)) reader.repaired = true;
  const migrated = schema !== SAVE_SCHEMA_VERSION || raw.contentVersion !== CONTENT_VERSION;
  return { save, issue: reader.repaired ? 'corrupt' : migrated ? 'migrated' : 'none', hadSave: true };
}

export function loadSave(): LoadResult {
  let raw: string | null = null;
  originalToPreserve = null;
  storageReadBlocked = false;
  try {
    raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { save: createDefaultSave(), issue: 'none', hadSave: false };
    const result = normalizeSave(JSON.parse(raw));
    if (result.issue === 'corrupt') originalToPreserve = raw;
    return result;
  } catch {
    if (raw) originalToPreserve = raw;
    else storageReadBlocked = true;
    return { save: createDefaultSave(), issue: 'corrupt', hadSave: false };
  }
}

/** 명시적으로 새 탐험을 시작할 때 이전 손상 원본도 함께 초기화한다. */
export function clearRecoverySave(): void {
  originalToPreserve = null;
  storageReadBlocked = false;
  try { localStorage.removeItem(RECOVERY_SAVE_KEY); } catch { /* 저장소가 차단되면 화면의 저장 실패 안내가 유지된다. */ }
}

/** 손상 원문을 보존하지 못하면 복구값으로 원본을 덮어쓰지 않는다. */
export function persistSave(save: GameSave): boolean {
  if (storageReadBlocked) return false;
  try {
    if (originalToPreserve !== null) {
      localStorage.setItem(RECOVERY_SAVE_KEY, originalToPreserve);
      originalToPreserve = null;
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

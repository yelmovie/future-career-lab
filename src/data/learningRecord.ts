import type { CauseId, GameSave } from '../shared/types';

export const CAUSE_LABEL: Record<CauseId, string> = { logging: '열매 나무', noise: '조용한 환경', water: '깨끗한 물' };
const PHOTO_LABEL = { logging: '베인 나무', stream: '개울', construction: '공사장' };
export interface LearningEntry { id: string; title: string; detail: string; recorded: boolean }
export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export const isCause = (value: unknown): value is CauseId => value === 'logging' || value === 'noise' || value === 'water';

/** 성취를 추측하거나 성향을 진단하지 않고, 저장된 활동만 문장으로 옮긴다. */
export function getLearningRecord(save: GameSave): LearningEntry[] {
  const a = save.artifacts;
  const ecology = asRecord(save.pageData.page07Ecology);
  const history = Array.isArray(ecology.conclusionHistory) ? ecology.conclusionHistory.filter(isCause) : [];
  const garden = asRecord(save.pageData.page06Design);
  const main = a.graphs.find((graph) => graph.verdict === 'main');
  const trials = (Array.isArray(ecology.trials) ? ecology.trials : []).map(asRecord).filter((trial) => isCause(trial.variable) && typeof trial.before === 'number' && typeof trial.after === 'number');
  const mainTrial = trials.find((trial) => trial.variable === main?.variable);
  const mainSupported = new Set(trials.map((trial) => trial.variable)).size === 3 && mainTrial && Number(mainTrial.after) - Number(mainTrial.before) === Math.max(...trials.map((trial) => Number(trial.after) - Number(trial.before)));
  const broadcast = asRecord(save.pageData.p8Broadcast);
  const corrections = Array.isArray(broadcast.correctionLog) ? broadcast.correctionLog.length : save.logs.filter((log) => log.type === 'broadcast-correction').length;
  const cooperationLog = save.logs.find((log) => log.type === 'alliance-clear');
  const helpLogs = save.logs.filter((log) => log.type === 'cooperation-help');
  const schoolLog = save.logs.find((log) => log.type === 'school-garden-help');
  return [
    { id: 'photos', title: '내가 찾은 현장', recorded: a.photos.length > 0,
      detail: a.photos.length ? a.photos.map((photo) => `${PHOTO_LABEL[photo.id]} 사진 (${photo.quality === 'center' ? '가운데 포착' : '가장자리 포착'})`).join(' · ') : '아직 저장된 사진이 없어.' },
    { id: 'care', title: '새를 돌본 방법', recorded: a.careLog.length > 0,
      detail: a.careLog.length ? a.careLog.map((care) => `${care.bird === 'green' ? '꾸꾸' : '앵자'}: ${care.issue} → ${care.treatment}`).join('\n') : '아직 저장된 돌봄 기록이 없어.' },
    { id: 'garden', title: '내가 설계한 정원', recorded: a.habitatStars > 0,
      detail: a.habitatStars ? `정원 시험 별 ${a.habitatStars}개. ${count(garden.revisions) > 0 ? `${count(garden.revisions)}번 배치를 고쳐 다시 시험했어.` : '저장된 배치로 정원 시험을 마쳤어.'}` : '아직 정원 시험 결과가 없어.' },
    { id: 'ecology', title: '생각과 실험 결과', recorded: a.graphs.length > 0,
      detail: a.graphs.length ? `처음 생각: ${a.hypothesis ? CAUSE_LABEL[a.hypothesis] : '이전 기록 없음'}. ${trials.length ? `비교한 조건 ${new Set(trials.map((trial) => trial.variable)).size}개. ` : ''}${main ? mainSupported ? `내가 확인한 가장 큰 변화: ${CAUSE_LABEL[main.variable]}.` : `이전 결론: ${CAUSE_LABEL[main.variable]}. 생태 실험에서 다시 확인할 기록이야.` : '아직 결론을 확정하지 않았어.'}${history.length > 1 ? ` 결론을 ${history.length - 1}번 다시 살펴봤어.` : ''}` : '아직 저장된 실험 결과가 없어.' },
    { id: 'broadcast', title: '내가 만든 방송', recorded: a.clip !== null,
      detail: a.clip ? `시청자 신뢰도 ${a.clip.trust}점. 확인 안 된 말을 내보낸 기록 ${a.clip.corrections}회, 확인한 소식으로 바로잡은 기록 ${corrections}회.` : '아직 저장된 방송 결과가 없어.' },
    { id: 'cooperation', title: '함께 숲을 도운 일', recorded: Boolean(cooperationLog) || helpLogs.length > 0,
      detail: cooperationLog?.summary ?? (helpLogs.length ? helpLogs.map((log) => log.summary).join('\n') : save.stageProgress.completedPages.includes(9) ? '이전 탐험의 완료 기록을 보관하고 있어.' : '팀과 함께 숲을 도우면 여기에 기록이 모여.') },
    ...(schoolLog ? [{ id: 'school-garden', title: '학교 화단에도 써 본 도움', recorded: true, detail: schoolLog.summary }] : []),
  ];
}

export function learningRecordText(save: GameSave): string {
  return ['미래 직업실 · 내 탐험 기록', '이 기기에 저장된 활동 기록이야. 직업 적성이나 능력을 판정하는 점수는 아니야.', '',
    ...getLearningRecord(save).flatMap((entry) => [entry.title, entry.detail, ''])].join('\n');
}

export interface TransferCase { id: 'water' | 'quiet'; title: string; scene: string; counts: Record<CauseId, number>; best: CauseId }
export function transferCase(seed: number): TransferCase {
  return Math.abs(Math.trunc(seed)) % 2 === 0
    ? { id: 'water', title: '햇살 공원', scene: '나무는 무성한데 물웅덩이가 말랐어. 처음에는 새가 2마리였어.', counts: { logging: 3, noise: 4, water: 9 }, best: 'water' }
    : { id: 'quiet', title: '별빛 공원', scene: '물과 먹이는 충분한데 큰 스피커가 켜져 있어. 처음에는 새가 2마리였어.', counts: { logging: 3, noise: 9, water: 4 }, best: 'noise' };
}
export type TransferReason = 'compare' | 'repeat' | 'guess';
export function transferVerdict(caseData: TransferCase, action: CauseId | null, reason: TransferReason | null): boolean {
  return action === caseData.best && reason === 'compare';
}

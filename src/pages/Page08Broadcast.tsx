import { useCallback, useMemo, useState, type DragEvent } from 'react';
import { GameShell, MissionGuide, Panel, TaskCue } from '../components/GameShell';
import { CheckIcon, GripIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { audioService } from '../services/audioService';
import { pageAsset, v2Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  AUDIO_BAND,
  CORRECTION_SEGMENT,
  INCIDENTS,
  SEGMENTS,
  SOURCE_LABEL,
  SOURCE_QUESTION,
  UNFIT_HINT,
  airBlock,
  airSegment,
  audioZone,
  buildCaptionCards,
  clipResult,
  createBroadcast,
  currentSegment,
  isFinished,
  photoIds,
  resolveIncident,
  restoreBroadcast,
  totalSegments,
  type AirBlock,
  type BroadcastState,
  type SourceId,
} from './page08BroadcastModel';
import './page08-broadcast.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const SAVE_KEY = 'p8Broadcast';
const SOURCES: SourceId[] = ['drone', 'studio', 'reporter'];
const STAGE = STAGE_META[3]!;
const WAVE_BARS = [.35, .7, 1, .55, .85, .45, .95, .6, .8, .4, 1, .65, .5, .9, .3];

const BLOCK_HINT: Record<AirBlock, string> = {
  source: '먼저 어떤 화면을 내보낼지 골라.',
  'wrong-source': `${SOURCE_QUESTION} 큐시트를 다시 읽어 봐.`,
  caption: '자막 카드를 송출 화면으로 끌어다 놓거나, 카드를 고르고 "자막 올리기"를 눌러.',
  unfit: `${UNFIT_HINT} 다른 근거 카드를 골라 봐.`,
  audio: '오디오 레벨을 초록 구간에 맞춰. 빨간 구간은 소리가 찢어져.',
  incident: '돌발 사고부터 처리해야 해.',
  finished: '방송이 끝났어.',
};

function dropId(event: DragEvent) {
  return event.dataTransfer.getData('text/broadcast-caption');
}

export default function Page08Broadcast({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const missionCompleted = save.stageProgress.completedPages.includes(8);
  const cards = useMemo(() => buildCaptionCards(save.artifacts), [save.artifacts]);
  const photos = useMemo(() => photoIds(save.artifacts.photos), [save.artifacts.photos]);
  const [state, setState] = useState<BroadcastState>(() => restoreBroadcast(save.pageData[SAVE_KEY]) ?? createBroadcast(save.sessionSeed));
  const [replayStarted, setReplayStarted] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const commit = useCallback((next: BroadcastState) => {
    setState(next);
    setPageData(SAVE_KEY, next);
  }, [setPageData]);

  const segment = currentSegment(state);
  const stateFinished = isFinished(state);
  const finished = stateFinished || (missionCompleted && !replayStarted);
  const block = airBlock(state, cards);
  const zone = audioZone(state.draft.level);
  const caption = cards.find((card) => card.id === state.draft.captionId) ?? null;
  const incident = INCIDENTS.find((item) => item.id === state.pendingIncident) ?? null;
  const result = stateFinished ? clipResult(state) : save.artifacts.clip ?? clipResult(state);
  const clean = finished && result.corrections === 0;
  const nextControl = block === 'source' || block === 'wrong-source' ? 'source' : block === 'caption' || block === 'unfit' ? 'caption' : block === 'audio' ? 'audio' : block === 'incident' ? 'incident' : 'air';
  const taskTarget = nextControl === 'source' ? '1 화면 소스' : nextControl === 'caption' ? '2 자막 카드' : nextControl === 'audio' ? '3 오디오' : nextControl === 'incident' ? '돌발 사고 선택지' : '송출 버튼';

  const setDraft = (patch: Partial<BroadcastState['draft']>) => commit({ ...state, draft: { ...state.draft, ...patch } });

  const pickSource = (source: SourceId) => { audioService.playSfx('tap'); setDraft({ source }); };
  const putCaption = (captionId: string) => {
    if (!cards.some((card) => card.id === captionId)) return;
    audioService.playSfx('drop');
    setDraft({ captionId });
    setSelectedCard(null);
  };

  const air = () => {
    if (block || !segment || !caption) return;
    const next = airSegment(state, cards);
    audioService.playSfx(caption.sourced ? 'success' : 'warning');
    if (!caption.sourced) {
      logEvent({ page: 8, type: 'broadcast-unsourced', summary: `"${caption.text}" 자막을 출처 없이 내보내 정정 방송을 하게 됐어.`, tags: ['출처 판단', segment.title], traits: { analysis: -1 }, contextRef: `p8:${segment.id}` });
    }
    if (isFinished(next)) finish(next);
    commit(next);
  };

  const finish = (final: BroadcastState) => {
    const clip = clipResult(final);
    setArtifacts({ clip });
    completePage(8);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    logEvent({
      page: 8,
      type: clip.corrections === 0 ? 'broadcast-clean' : 'broadcast-done',
      summary: `생방송 6개 세그먼트를 마쳤어. 시청자 신뢰 ${clip.trust}점, 정정 ${clip.corrections}회.`,
      tags: ['방송기술자', '출처 판단', clip.corrections === 0 ? '클린 방송' : '정정 방송'],
      traits: { execution: 2, analysis: clip.corrections === 0 ? 2 : 1, collaboration: 1 },
      contextRef: `p8:trust-${clip.trust}`,
    });
    audioService.playSfx('reward');
  };

  const handleIncident = (actionId: string) => {
    const next = resolveIncident(state, actionId);
    if (next === state) return;
    audioService.playSfx(next.trust < state.trust ? 'warning' : 'success');
    commit(next);
  };

  const replay = () => { audioService.playSfx('tap'); setSelectedCard(null); setReplayStarted(true); commit(createBroadcast(save.sessionSeed)); };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (!finished) putCaption(dropId(event));
  };

  return (
    <GameShell
      page={8}
      eyebrow="STAGE 4 · ON AIR"
      onNavigate={onNavigate}
      className="broadcast-page"
      footer={finished ? (
        <StageComplete
          title={clean ? '클린 방송 성공' : '생방송 완료'}
          message={`시청자 신뢰 ${result.trust}점 · 정정 ${result.corrections}회. ${clean ? '출처 없는 자막이 한 번도 안 나갔어. 방송 클립이 카드로 저장됐어.' : '정정 0회에 다시 도전하면 "클린 방송" 도장을 받을 수 있어.'}`}
          nextLabel="연합 작전으로"
          onNext={() => onNavigate(9)}
        />
      ) : undefined}
    >
      <div className="game-grid broadcast-grid">
        <aside className="stack">
          <MissionGuide
            image={pageAsset(3, 3)}
            imageAlt="방송 멘토"
            action="큐시트 6개를 순서대로 송출해"
            goals={['큐시트를 읽고 맞는 화면 고르기', '출처가 믿을 만한 자막만 올리기', '오디오를 초록 구간에 맞추기']}
            goalImages={[pageAsset(2, 7), pageAsset(4, 7), pageAsset(4, 4)]}
            reward={STAGE.reward}
            details={<><p>SNS 제보나 익명 댓글은 근거가 아니야. 조사·사진·기록에서 나온 말만 올려. 출처 없는 자막이 나가면 정정 방송을 해야 해.</p><p className="flow-goal"><strong>갱신 목표</strong>정정 0회 클린 방송</p></>}
          />
          <Panel title="큐시트" kicker="CUE SHEET" className="cue-panel">
            <ol className="cue-list" aria-label="큐시트">
              {[...SEGMENTS, ...(totalSegments(state) > SEGMENTS.length ? [CORRECTION_SEGMENT] : [])].map((item, index) => {
                const done = index < state.index;
                const current = index === state.index;
                const corrected = state.correctionAt.includes(index);
                const shown = corrected ? CORRECTION_SEGMENT : item;
                return (
                  <li key={item.id} className={`cue-item${current ? ' is-current' : ''}${done ? ' is-done' : ''}${corrected ? ' is-correction' : ''}`} aria-current={current ? 'step' : undefined}>
                    <b>{done ? <CheckIcon /> : index + 1}</b>
                    <div>
                      <strong>{shown.title}</strong>
                      {current && <small>{shown.need}</small>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </aside>

        <div className="stack broadcast-center">
          <div
            className={`scene-card broadcast-preview${dragOver ? ' is-drop' : ''}${finished ? ' is-off' : ''}`}
            onDragOver={(event) => { if (!finished) { event.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            aria-label="송출 화면 미리보기"
          >
            <span className={`on-air${finished ? ' is-off' : ''}`} role="status">{finished ? 'OFF AIR' : 'ON AIR'}</span>
            <span className="preview-slot">{segment ? `${state.index + 1}/${totalSegments(state)} ${segment.title}` : '방송 종료'}</span>
            {state.draft.source === 'drone' && (
              <div className="preview-photos" aria-label="드론 사진">
                {photos.map((id) => <img key={id} src={v2Asset(`photo-${id}`)} alt={`드론 사진 ${id}`} />)}
              </div>
            )}
            {state.draft.source === 'studio' && <img className="preview-single" src={pageAsset(4, 5)} alt="스튜디오 카메라 화면" />}
            {state.draft.source === 'reporter' && <img className="preview-single" src={v2Asset('reporter')} alt="현장 리포터" />}
            {!state.draft.source && !finished && <p className="preview-empty">아래에서 화면 소스를 골라. 자막 카드는 여기로 끌어다 놔.</p>}
            {finished && <p className="preview-empty">방송이 끝났어. 시청자 신뢰 {result.trust}점.</p>}
            {segment && state.draft.source && block === 'wrong-source' && (
              <p className="preview-mismatch" role="alert">{SOURCE_QUESTION} 큐시트: "{segment.need}"</p>
            )}
            <div className={`preview-caption${caption ? '' : ' is-empty'}${caption && !caption.sourced ? ' is-unsourced' : ''}`} aria-live="polite">
              {caption ? <><span>{caption.origin}</span>{caption.text}</> : '자막 자리'}
            </div>
          </div>

          {!finished && segment && (
            <Panel title={segment.id === 'correction' ? '정정 방송 준비' : `${segment.title} 준비`} kicker="CONTROL" className="control-panel">
              <div className="control-columns">
                <div className={`control-block${nextControl === 'source' ? ' is-next-control' : ''}`}>
                  <strong className="control-label"><b>1</b>화면 소스</strong>
                  <div className="source-tabs" role="group" aria-label="화면 소스 선택">
                    {SOURCES.map((source) => (
                      <button key={source} type="button" className={`source-tab${state.draft.source === source ? ' is-active' : ''}`} aria-pressed={state.draft.source === source} onClick={() => pickSource(source)}>
                        <img src={source === 'drone' ? v2Asset(`photo-${photos[0] ?? 'logging'}`) : source === 'studio' ? pageAsset(4, 5) : v2Asset('reporter')} alt="" />
                        <span>{SOURCE_LABEL[source]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`control-block${nextControl === 'caption' ? ' is-next-control' : ''}`}>
                  <strong className="control-label"><b>2</b>자막 카드 <small>끌어다 놓거나 고른 뒤 올리기</small></strong>
                  <div className="caption-cards" aria-label="자막 카드">
                    {cards.map((card) => {
                      const onAir = card.id === state.draft.captionId;
                      const selected = selectedCard === card.id;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          className={`caption-card${selected ? ' is-selected' : ''}${onAir ? ' is-on-air' : ''}`}
                          draggable
                          aria-pressed={selected}
                          onDragStart={(event) => { event.dataTransfer.setData('text/broadcast-caption', card.id); setSelectedCard(card.id); }}
                          onClick={() => { audioService.playSfx('tap'); setSelectedCard(selected ? null : card.id); }}
                        >
                          <GripIcon />
                          <span>{card.text}</span>
                          <small>출처: {card.origin}</small>
                        </button>
                      );
                    })}
                  </div>
                  <div className="caption-actions">
                    <button type="button" className="button button--ghost" disabled={!selectedCard} onClick={() => selectedCard && putCaption(selectedCard)}>자막 올리기</button>
                    {caption && <button type="button" className="button button--ghost" onClick={() => { audioService.playSfx('tap'); setDraft({ captionId: null }); }}>자막 내리기</button>}
                  </div>
                </div>

                <div className={`control-block audio-block${nextControl === 'audio' ? ' is-next-control' : ''}`}>
                  <strong className="control-label"><b>3</b>오디오 <small>초록 {AUDIO_BAND.low}~{AUDIO_BAND.high}</small></strong>
                  <div className={`audio-meter is-${zone}`} aria-hidden="true">
                    <span className="audio-band" />
                    {WAVE_BARS.map((height, index) => <i key={index} style={{ height: `${Math.round(height * state.draft.level)}%` }} />)}
                  </div>
                  <label className="audio-slider">
                    <span className="sr-only">오디오 레벨</span>
                    <input type="range" min={0} max={100} step={1} value={state.draft.level} aria-valuetext={`${state.draft.level}, ${zone === 'ok' ? '알맞음' : zone === 'clip' ? '소리 찢어짐' : '너무 작음'}`} onChange={(event) => setDraft({ level: Number(event.target.value) })} />
                    <output>{state.draft.level}</output>
                  </label>
                  <span className={`status-chip status-chip--${zone === 'ok' ? 'success' : zone === 'clip' ? 'danger' : 'warning'}`}>{zone === 'ok' ? '알맞은 소리' : zone === 'clip' ? '소리가 찢어져' : '소리가 너무 작아'}</span>
                </div>
              </div>

              <div className="air-row">
                <TaskCue action={block ? BLOCK_HINT[block] : '준비 끝! 지금 세그먼트를 송출해'} target={taskTarget} done={!block} />
                <button type="button" className={`button button--primary button--large air-button${!block ? ' is-next-action' : ''}`} disabled={Boolean(block)} onClick={air}>{state.index + 1}번 송출</button>
              </div>
            </Panel>
          )}

          {finished && (
            <Panel title="방송 기록" kicker="LOG">
              <ol className="air-log">
                {state.log.map((entry, index) => {
                  const card = cards.find((item) => item.id === entry.captionId);
                  return <li key={`${entry.segmentId}-${index}`} className={entry.sourced ? 'is-ok' : 'is-bad'}><strong>{entry.title}</strong><span>{SOURCE_LABEL[entry.source]} · {card?.text ?? ''} {entry.sourced ? '' : '(출처 없음)'}</span></li>;
                })}
              </ol>
              <button type="button" className="button button--ghost" onClick={replay}>{clean ? '다시 방송하기' : '정정 0회에 도전하기'}</button>
            </Panel>
          )}
        </div>

        <aside className="stack">
          <Panel title="시청자 신뢰" kicker="TRUST">
            <ProgressBar value={state.trust} label="신뢰 게이지" />
            <p className="trust-copy" data-testid="trust-text">신뢰 {state.trust}점 · 정정 {state.corrections}회</p>
            <div className="metric-row">
              <span className="status-chip status-chip--info">남은 AP {state.ap}</span>
              <span className={`status-chip ${clean ? 'status-chip--success' : 'status-chip--warning'}`}><SparkIcon /> 갱신 목표: 클린 방송(정정 0회)</span>
            </div>
          </Panel>
          <Panel title="멘토 한마디" kicker="MENTOR" className="mentor-panel">
            <img src={pageAsset(3, 3)} alt="" className="mentor-art" />
            <p>{segment?.id === 'correction' ? '틀린 건 바로잡으면 돼. 이번엔 출처가 믿을 만한지 확인하자.' : state.corrections > 0 ? 'SNS 제보나 익명 댓글은 근거가 아니야. 조사·사진·기록에서 나온 말만 올려.' : '빠른 것보다 정확한 게 먼저야. 출처가 어디서 왔는지 봐.'}</p>
          </Panel>
        </aside>
      </div>

      {incident && (
        <Modal title={`돌발 사고: ${incident.title}`}>
          <p className="incident-signal">{incident.signal}</p>
          <p className="incident-ap">남은 AP <b>{state.ap}</b> · 힘을 어디에 쓸지 골라. 사고는 두 번 나.</p>
          <div className="incident-actions">
            {incident.actions.map((action) => (
              <button key={action.id} type="button" className="button button--ghost incident-action" disabled={action.cost > state.ap} onClick={() => handleIncident(action.id)}>
                <span>{action.label}</span>
                <small>AP {action.cost}{action.trustDelta ? ` · 신뢰 ${action.trustDelta}` : ' · 신뢰 유지'}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </GameShell>
  );
}

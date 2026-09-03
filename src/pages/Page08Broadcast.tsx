import Phaser from 'phaser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { Modal } from '../components/Modal';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, ClockIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { CANVAS_FONT } from '../shared/constants';
import type { PageNumber, TraitKey } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  advanceWorkEvents,
  createWorkEvents,
  isWorkEventActionable,
  isWorkOutcomeComplete,
  resolveWorkEvent,
  workOutcome,
  type WorkActionDefinition,
  type WorkEventRuntime,
} from './page07LiveWorkModel';
import './page07-08.css';

interface PageProps { onNavigate: (page: PageNumber) => void }
type RunPhase = 'briefing' | 'running' | 'result';
type WorkResult = ReturnType<typeof workOutcome>;

const STATUS_LABEL: Record<WorkEventRuntime['status'], string> = {
  queued: '대기',
  active: '지금 하기',
  expired: '시간 놓침',
  recovery: '다시 하기',
  resolved: '완료',
};

const STATUS_COLOR: Record<WorkEventRuntime['status'], number> = {
  queued: 0x577087,
  active: 0xf1b84a,
  expired: 0xd85245,
  recovery: 0xc47ce2,
  resolved: 0x45c879,
};

interface LiveSceneSnapshot {
  events: readonly WorkEventRuntime[];
  remainingRatio: number;
  ap: number;
}

let liveSceneSequence = 0;

class LiveWorkScene extends Phaser.Scene {
  private snapshot: LiveSceneSnapshot = { events: [], remainingRatio: 1, ap: 12 };
  private ready = false;

  constructor() { super(`page07-live-${++liveSceneSequence}`); }

  preload() {
    for (const slot of [4, 5, 6, 7, 8, 9, 10]) this.load.image(`work-${slot}`, pageAsset(7, slot));
  }

  create() {
    this.ready = true;
    this.scale.on('resize', this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.redraw, this));
    this.redraw();
  }

  setSnapshot(snapshot: LiveSceneSnapshot) {
    this.snapshot = snapshot;
    if (this.ready) this.redraw();
  }

  private redraw() {
    if (!this.ready) return;
    this.children.removeAll(true);
    const { width, height } = this.scale.gameSize;
    if (width < 40 || height < 40) return;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x061426, 0.88).fillRoundedRect(10, 10, width - 20, height - 20, 24);
    graphics.lineStyle(2, 0xe6b85c, 0.55).strokeRoundedRect(10, 10, width - 20, height - 20, 24);

    const centerX = width / 2;
    const centerY = height / 2;
    const taskWheel = this.add.image(centerX, centerY, 'work-10').setDisplaySize(Math.min(132, width * 0.22), Math.min(132, height * 0.3));
    taskWheel.setAlpha(0.9);
    graphics.lineStyle(5, 0x173b58, 0.95).strokeCircle(centerX, centerY, Math.min(84, width * 0.15));
    graphics.lineStyle(6, this.snapshot.remainingRatio < 0.2 ? 0xe35d50 : 0x40c9bd, 1);
    graphics.beginPath();
    graphics.arc(centerX, centerY, Math.min(84, width * 0.15), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.snapshot.remainingRatio, false);
    graphics.strokePath();
    this.add.text(centerX, centerY + Math.min(95, width * 0.17), `남은 힘 ${this.snapshot.ap}`, {
      color: '#f7e9c9', fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.label, fontStyle: 'bold',
      backgroundColor: '#0a2038', padding: { x: 9, y: 5 },
    }).setOrigin(0.5);

    const positions = [
      [0.18, 0.25], [0.5, 0.18], [0.82, 0.25],
      [0.18, 0.75], [0.5, 0.82], [0.82, 0.75],
    ] as const;

    this.snapshot.events.forEach((event, index) => {
      const position = positions[index];
      if (!position) return;
      const x = width * position[0];
      const y = height * position[1];
      graphics.lineStyle(2, STATUS_COLOR[event.status], event.status === 'queued' ? 0.25 : 0.68);
      graphics.lineBetween(centerX, centerY, x, y);
      graphics.fillStyle(0xf8efdd, event.status === 'queued' ? 0.5 : 0.97).fillRoundedRect(x - 72, y - 54, 144, 108, 16);
      graphics.lineStyle(event.status === 'active' ? 4 : 2, STATUS_COLOR[event.status], 1).strokeRoundedRect(x - 72, y - 54, 144, 108, 16);
      this.add.image(x - 46, y - 8, `work-${event.iconSlot}`).setDisplaySize(48, 48).setAlpha(event.status === 'queued' ? 0.5 : 1);
      this.add.text(x - 16, y - 34, event.title, {
        color: '#092139', fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold',
        wordWrap: { width: 82 }, align: 'center',
      }).setOrigin(0, 0);
      this.add.text(x, y + 38, STATUS_LABEL[event.status], {
        color: event.status === 'queued' ? '#39556c' : '#092139', fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold',
      }).setOrigin(0.5);
    });
  }
}

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function traitsForApproach(approach: string): Partial<Record<TraitKey, number>> {
  if (approach.includes('관찰') || approach.includes('근거')) return { analysis: 1, care: 1 };
  if (approach.includes('협업') || approach.includes('공유') || approach.includes('인계')) return { collaboration: 1, execution: 1 };
  if (approach.includes('계획') || approach.includes('준비')) return { execution: 1, creation: 1 };
  return { care: 1, execution: 1 };
}

export default function Page08Broadcast({ onNavigate }: PageProps) {
  const { completePage, logEvent, setPageData, addBadge, addJobCard, grantReward } = useGame();
  const [phase, setPhase] = useState<RunPhase>('briefing');
  const [durationMs, setDurationMs] = useState(90_000);
  const [remainingMs, setRemainingMs] = useState(90_000);
  const [events, setEvents] = useState<WorkEventRuntime[]>(createWorkEvents);
  const [ap, setAp] = useState(12);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<WorkResult | null>(null);
  const [runId, setRunId] = useState(0);
  const [hidden, setHidden] = useState(document.hidden);
  const [pausedByUser, setPausedByUser] = useState(false);
  const finalizedRuns = useRef(new Set<number>());
  const scene = useMemo(() => new LiveWorkScene(), [runId]);

  const elapsedRatio = Math.min(1, Math.max(0, 1 - remainingMs / durationMs));
  const paused = hidden || pausedByUser;
  const actionable = events.filter(isWorkEventActionable);
  const selected = events.find((event) => event.id === selectedId && isWorkEventActionable(event)) ?? actionable[0];

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (phase !== 'running' || paused) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(500, now - previous);
      previous = now;
      setRemainingMs((current) => Math.max(0, current - delta));
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase, paused]);

  useEffect(() => {
    if (phase !== 'running') return;
    setEvents((current) => {
      const next = advanceWorkEvents(current, elapsedRatio);
      return next.every((event, index) => event === current[index]) ? current : next;
    });
  }, [elapsedRatio, phase]);

  useEffect(() => {
    scene.setSnapshot({ events, remainingRatio: remainingMs / durationMs, ap });
  }, [ap, durationMs, events, remainingMs, scene]);

  const startRun = (milliseconds: number) => {
    audioService.playSfx('tap');
    setDurationMs(milliseconds);
    setRemainingMs(milliseconds);
    setEvents(createWorkEvents());
    setAp(12);
    setSelectedId(null);
    setResult(null);
    setPausedByUser(false);
    setPhase('running');
  };

  const chooseAction = (event: WorkEventRuntime, action: WorkActionDefinition) => {
    if (phase !== 'running' || action.cost > ap || !isWorkEventActionable(event)) return;
    setAp((current) => current - action.cost);
    setEvents((current) => resolveWorkEvent(current, event.id, action));
    setSelectedId(null);
    audioService.playSfx(event.status === 'recovery' ? 'tap' : 'drop');
    logEvent({
      page: 8,
      type: event.status === 'recovery' ? 'work-recovery' : 'work-priority',
      summary: `${event.title}: ${action.evidence}`,
      tags: [event.title, action.approach, `행동력 ${action.cost}`],
      traits: traitsForApproach(action.approach),
      contextRef: `${event.id}:${action.id}`,
    });
  };

  const finishRun = useCallback((snapshot: WorkEventRuntime[]) => {
    if (finalizedRuns.current.has(runId)) return;
    finalizedRuns.current.add(runId);
    const outcome = workOutcome(snapshot);
    const completedTasks = outcome.handled.length + outcome.recovered.length;
    const success = isWorkOutcomeComplete(outcome);
    setResult(outcome);
    setPhase('result');
    if (success) {
      completePage(8);
      addJobCard('생태 현장 운영 조정가');
      grantReward('stage4-live-work-record');
      if (outcome.handled.length >= 3) addBadge('중요한 일을 고른 현장가');
    }
    setPageData('page07', {
      handled: outcome.handled.map((event) => ({ id: event.id, action: event.resolvedWith?.id })),
      recovered: outcome.recovered.map((event) => event.id),
      pending: outcome.pending.map((event) => event.id),
      evidenceScore: outcome.evidenceScore,
      apLeft: ap,
      duration: durationMs,
      success,
    });
    if (completedTasks > 0) {
      logEvent({
        page: 8,
        type: 'work-result',
        summary: `한꺼번에 들어온 일 중 ${outcome.handled.length}개를 바로 하고 ${outcome.recovered.length}개를 다시 이어 했어.`,
        tags: ['우선순위', '시간 관리', '다시 하기'],
        traits: { execution: 1, collaboration: 1 },
        contextRef: `run-${runId}`,
      });
    }
    audioService.playSfx(success ? 'reward' : 'warning');
  }, [addBadge, addJobCard, ap, completePage, durationMs, grantReward, logEvent, runId, setPageData]);

  useEffect(() => {
    if (phase !== 'running') return;
    const allResolved = events.every((event) => event.status === 'resolved');
    if (remainingMs <= 0 || (allResolved && elapsedRatio >= 0.6)) finishRun(events);
  }, [elapsedRatio, events, finishRun, phase, remainingMs]);

  const retry = () => {
    setRunId((current) => current + 1);
    setPhase('briefing');
    setResult(null);
  };

  const resultMessage = result
    ? `바로 한 일 ${result.handled.length}개, 다시 이어 한 일 ${result.recovered.length}개, 남은 일 ${result.pending.length}개야.`
    : '';
  const resultPassed = Boolean(result && isWorkOutcomeComplete(result));

  return (
    <GameShell
      page={8}
      eyebrow="STAGE 4 · PRIORITY LAB"
      onNavigate={onNavigate}
      className="page07"
      footer={phase === 'result' && resultPassed
        ? <StageComplete title="중요한 일 세 가지를 해냈어" message={resultMessage} nextLabel="도시 문제 풀기로" onNext={() => onNavigate(9)} />
        : undefined}
    >
      <div className="game-grid game-grid--wide-center p07-layout">
        <Panel kicker="MISSION" title="이번에 할 일">
          <MissionGuide
            image={pageAsset(7, 10)}
            imageAlt="관찰과 청소와 안내와 기록을 보여 주는 그림"
            action="중요한 일 3개를 먼저 해요"
            goals={['세 가지 끝내기', '놓친 일도 다시 하기']}
          />
          <div className="p07-ap" aria-label={`남은 힘 ${ap} / 12`}>
            <span>남은 힘</span><strong>{ap}<small>/12</small></strong>
            <ProgressBar value={ap} max={12} label="남은 힘" compact />
          </div>
          {phase === 'running' && (
            <button className="button button--ghost button--block" onClick={() => setPausedByUser(true)}><ClockIcon />잠시 멈춤</button>
          )}
        </Panel>

        <section className="scene-card p07-scene" aria-labelledby="p07-scene-title">
          <h2 id="p07-scene-title" className="sr-only">여러 일이 들어오는 흐름 지도</h2>
          <div className={`p07-central-timer${remainingMs < durationMs * 0.2 ? ' is-urgent' : ''}`} role="timer" aria-live={remainingMs < durationMs * 0.2 ? 'polite' : 'off'}>
            <span>남은 시간</span><strong>{formatTime(remainingMs)}</strong>
            {paused && <small>시간 멈춤</small>}
          </div>
          <PhaserStage scene={scene} ariaLabel={`업무 흐름 지도. 현재 처리할 수 있는 사건 ${actionable.length}개, 기록 완료 ${events.filter((event) => event.status === 'resolved').length}개`} />
          <div className="p07-event-strip" aria-label="업무 선택">
            {events.map((event) => (
              <button
                key={event.id}
                className={`p07-event-chip is-${event.status}${selected?.id === event.id ? ' is-selected' : ''}`}
                disabled={!isWorkEventActionable(event)}
                onClick={() => setSelectedId(event.id)}
                aria-pressed={selected?.id === event.id}
              >
                <span>{STATUS_LABEL[event.status]}</span>{event.title}
              </button>
            ))}
          </div>
        </section>

        <Panel kicker="ACTION CARDS" title={selected ? selected.title : '새 일을 기다리는 중'} className="p07-action-panel">
          {selected ? (
            <>
              <div className={`status-chip status-chip--${selected.status === 'active' ? 'warning' : 'info'}`}>{STATUS_LABEL[selected.status]}</div>
              <p className="p07-signal">{selected.signal}</p>
              <div className="p07-reason"><strong>왜 살펴야 할까?</strong><span>{selected.priorityReason}</span></div>
              <div className="p07-actions">
                {(selected.status === 'recovery' ? [selected.recovery] : selected.actions).map((action) => (
                  <button key={action.id} className="p07-action-card" onClick={() => chooseAction(selected, action)} disabled={action.cost > ap}>
                    <span className="p07-action-cost">필요한 힘 {action.cost}</span>
                    <strong>{action.label}</strong>
                    <small>{action.cost > ap ? '힘이 부족해' : action.approach}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="p07-waiting" role="status">
              <img src={pageAsset(7, 5)} alt="업무 기록판 샘플 이미지" />
              <p>{phase === 'running' ? '새 일이 열리면 여기에 방법이 나타나.' : '시작하면 여섯 가지 일이 차례로 들어와.'}</p>
            </div>
          )}
        </Panel>
      </div>

      {phase === 'briefing' && (
        <Modal
          title="일의 순서를 정해 보자"
          actions={<>
            <button className="button button--ghost" onClick={() => startRun(30_000)}>30초로 해 보기</button>
            <button className="button button--primary" onClick={() => startRun(90_000)}>90초로 시작</button>
          </>}
        >
          <div className="tap-flow" aria-label="게임 방법"><b>1</b><span>할 일 고르기</span><i>→</i><b>2</b><span>방법 고르기</span></div>
          <p className="modal-note">중요한 일 세 가지를 끝내면 돼. 놓친 일도 다시 할 수 있어.</p>
        </Modal>
      )}

      {pausedByUser && phase === 'running' && (
        <Modal title="업무 시간이 멈췄어" actions={<button className="button button--primary" onClick={() => { setPausedByUser(false); audioService.unlock(); }}>계속하기</button>}>
          <p>지금까지의 선택은 그대로 보관돼. 준비되면 계속하기를 눌러 줘.</p>
        </Modal>
      )}

      {phase === 'result' && result && (
        <Modal
          title={resultPassed ? '중요한 일을 골라 해냈어' : '한 번 더 하면 해낼 수 있어'}
          actions={<>
            <button className={resultPassed ? 'button button--ghost' : 'button button--primary'} onClick={retry}>다시 해 보기</button>
            {resultPassed && <button className="button button--primary" onClick={() => onNavigate(9)}>다음 단계로</button>}
          </>}
        >
          <p>{resultMessage} {resultPassed ? '완료 조건인 세 가지를 채웠어.' : '완료하려면 바로 하거나 다시 이어 한 일이 모두 세 가지 이상이어야 해.'}</p>
          <ul className="p07-result-list">
            {events.filter((event) => event.resolvedWith).map((event) => (
              <li key={event.id}><span><CheckIcon /></span><div><strong>{event.title} · {event.resolvedWith?.approach}</strong><p>{event.resolvedWith?.evidence}</p></div></li>
            ))}
            {result.pending.map((event) => <li key={event.id} className="is-pending"><span /><div><strong>{event.title} · 다음 근무자 확인</strong><p>{event.priorityReason}</p></div></li>)}
          </ul>
        </Modal>
      )}
    </GameShell>
  );
}

import Phaser from 'phaser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { Modal } from '../components/Modal';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, ClockIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import type { PageNumber, TraitKey } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  advanceWorkEvents,
  createWorkEvents,
  isWorkEventActionable,
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
  active: '진행 필요',
  expired: '시간 지남',
  recovery: '복구 가능',
  resolved: '기록 완료',
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
    this.add.text(centerX, centerY + Math.min(95, width * 0.17), `남은 행동력 ${this.snapshot.ap}`, {
      color: '#f7e9c9', fontFamily: 'Pretendard, sans-serif', fontSize: '14px', fontStyle: 'bold',
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
      graphics.fillStyle(0xf8efdd, event.status === 'queued' ? 0.5 : 0.97).fillRoundedRect(x - 58, y - 45, 116, 90, 16);
      graphics.lineStyle(event.status === 'active' ? 4 : 2, STATUS_COLOR[event.status], 1).strokeRoundedRect(x - 58, y - 45, 116, 90, 16);
      this.add.image(x - 32, y - 5, `work-${event.iconSlot}`).setDisplaySize(48, 48).setAlpha(event.status === 'queued' ? 0.5 : 1);
      this.add.text(x - 3, y - 25, event.title, {
        color: '#092139', fontFamily: 'Pretendard, sans-serif', fontSize: '12px', fontStyle: 'bold',
        wordWrap: { width: 58 }, align: 'center',
      }).setOrigin(0, 0);
      this.add.text(x, y + 30, STATUS_LABEL[event.status], {
        color: event.status === 'queued' ? '#39556c' : '#092139', fontFamily: 'Pretendard, sans-serif', fontSize: '11px', fontStyle: 'bold',
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

export default function Page07LiveWork({ onNavigate }: PageProps) {
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
      page: 7,
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
    setResult(outcome);
    setPhase('result');
    completePage(7);
    addJobCard('생태 현장 운영 코디네이터');
    grantReward('stage4-live-work-record');
    if (outcome.handled.length >= 3) addBadge('근거로 조율한 현장가');
    setPageData('page07', {
      handled: outcome.handled.map((event) => ({ id: event.id, action: event.resolvedWith?.id })),
      recovered: outcome.recovered.map((event) => event.id),
      pending: outcome.pending.map((event) => event.id),
      evidenceScore: outcome.evidenceScore,
      apLeft: ap,
      duration: durationMs,
    });
    logEvent({
      page: 7,
      type: 'work-result',
      summary: `동시에 들어온 업무 중 ${outcome.handled.length}개를 바로 처리하고 ${outcome.recovered.length}개를 복구 기록으로 이어 갔어.`,
      tags: ['우선순위', '시간 관리', '복구 가능'],
      traits: { execution: 2, collaboration: 1, care: 1 },
      contextRef: `run-${runId}`,
    });
    audioService.playSfx('success');
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
    ? `바로 처리 ${result.handled.length}개, 복구 연결 ${result.recovered.length}개, 다음 근무자에게 남긴 항목 ${result.pending.length}개야.`
    : '';

  return (
    <GameShell
      page={7}
      eyebrow="STAGE 4 · PRIORITY LAB"
      onNavigate={onNavigate}
      className="page07"
      footer={phase === 'result' && result
        ? <StageComplete title="실시간 업무 기록을 완성했어" message={resultMessage} nextLabel="연합 위기 대응으로" onNext={() => onNavigate(8)} />
        : undefined}
    >
      <div className="game-grid game-grid--wide-center p07-layout">
        <Panel kicker="MISSION" title="겹치는 일을 근거로 조율해">
          <div className="mission-card">
            <strong>한 번에 하나씩, 중요한 근거부터</strong>
            <p>업무 여섯 개의 가장 자세한 대응에는 행동력 15가 필요하지만 가진 행동력은 12야. 늦어진 일은 복구 기록으로 이어 갈 수 있어.</p>
          </div>
          <div className="p07-ap" aria-label={`남은 행동력 ${ap} / 12`}>
            <span>남은 행동력</span><strong>{ap}<small>/12</small></strong>
            <ProgressBar value={ap} max={12} label="행동력" compact />
          </div>
          <ul className="p07-legend" aria-label="업무 상태 안내">
            <li><span className="p07-dot is-active" />진행 필요</li>
            <li><span className="p07-dot is-recovery" />복구 가능</li>
            <li><span className="p07-dot is-done" />기록 완료</li>
          </ul>
          {phase === 'running' && (
            <button className="button button--ghost button--block" onClick={() => setPausedByUser(true)}><ClockIcon />잠시 멈춤</button>
          )}
        </Panel>

        <section className="scene-card p07-scene" aria-labelledby="p07-scene-title">
          <h2 id="p07-scene-title" className="sr-only">실시간 업무 흐름 지도</h2>
          <div className={`p07-central-timer${remainingMs < durationMs * 0.2 ? ' is-urgent' : ''}`} role="timer" aria-live={remainingMs < durationMs * 0.2 ? 'polite' : 'off'}>
            <span>공통 업무 시간</span><strong>{formatTime(remainingMs)}</strong>
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

        <Panel kicker="ACTION CARDS" title={selected ? selected.title : '새 업무를 기다리는 중'} className="p07-action-panel">
          {selected ? (
            <>
              <div className={`status-chip status-chip--${selected.status === 'active' ? 'warning' : 'info'}`}>{STATUS_LABEL[selected.status]}</div>
              <p className="p07-signal">{selected.signal}</p>
              <div className="p07-reason"><strong>왜 살펴야 할까?</strong><span>{selected.priorityReason}</span></div>
              <div className="p07-actions">
                {(selected.status === 'recovery' ? [selected.recovery] : selected.actions).map((action) => (
                  <button key={action.id} className="p07-action-card" onClick={() => chooseAction(selected, action)} disabled={action.cost > ap}>
                    <span className="p07-action-cost">행동력 {action.cost}</span>
                    <strong>{action.label}</strong>
                    <small>{action.approach} · {action.cost > ap ? '행동력이 부족해' : '선택 가능'}</small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="p07-waiting" role="status">
              <img src={pageAsset(7, 5)} alt="업무 기록판 샘플 이미지" />
              <p>{phase === 'running' ? '새 사건이 열리면 이곳에 대응 카드가 나타나.' : '시작하면 여섯 업무가 서로 겹쳐서 들어와.'}</p>
            </div>
          )}
        </Panel>
      </div>

      {phase === 'briefing' && (
        <Modal
          title="실시간 업무 브리핑"
          actions={<>
            <button className="button button--ghost" onClick={() => startRun(30_000)}>빠른 체험 30초</button>
            <button className="button button--primary" onClick={() => startRun(90_000)}>표준 체험 90초</button>
          </>}
        >
          <p>업무는 <strong>대기 → 진행 필요 → 시간 지남 → 복구 가능 → 기록 완료</strong> 순서로 바뀔 수 있어. 모두를 완벽하게 해결하는 것보다, 왜 먼저 했는지 근거를 남기는 게 목표야.</p>
          <p className="modal-note">빠른 체험은 같은 사건과 규칙을 30초에 압축한 접근성·점검용 모드야.</p>
        </Modal>
      )}

      {pausedByUser && phase === 'running' && (
        <Modal title="업무 시간이 멈췄어" actions={<button className="button button--primary" onClick={() => { setPausedByUser(false); audioService.unlock(); }}>계속하기</button>}>
          <p>지금까지의 선택은 그대로 보관돼. 준비되면 계속하기를 눌러 줘.</p>
        </Modal>
      )}

      {phase === 'result' && result && (
        <Modal
          title="근거로 돌아보는 업무 결과"
          actions={<>
            <button className="button button--ghost" onClick={retry}>다시 조율하기</button>
            <button className="button button--primary" onClick={() => onNavigate(8)}>다음 단계로</button>
          </>}
        >
          <p>{resultMessage} 늦어진 업무도 사라지는 대신 복구 기록과 인계로 이어졌어.</p>
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

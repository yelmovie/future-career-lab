import Phaser from 'phaser';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { GameShell, MissionGuide, Panel, TaskCue } from '../components/GameShell';
import { Modal } from '../components/Modal';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { ArrowIcon, CheckIcon, GripIcon, SparkIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { fallbackTo, homeAsset, pageAsset, v2Asset, v3Asset } from '../shared/assets';
import { CANVAS_FONT, JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  CRISES,
  JOB_ORDER,
  MAX_TURNS,
  advanceTurn,
  cardQualities,
  createAllianceState,
  ecologyTrials,
  isAvailable,
  isEnded,
  isStabilized,
  lostNodes,
  pairVerdict,
  toggleAssign,
  turnsUsed,
  type AllianceState,
  type CrisisId,
} from './page08CrisisModel';
import './page07-08.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const BADGE_IMAGE: Record<JobId, string> = {
  drone: pageAsset(8, 5),
  care: pageAsset(8, 4),
  ecology: v2Asset('badge-ecology'),
  broadcast: v2Asset('badge-broadcast'),
};

const STAGE = STAGE_META[4]!;
const SAVE_KEY = 'p9State';
const BEST_KEY = 'p9BestTurns';

function gaugeColor(value: number): number {
  if (value <= 0) return 0x48c778;
  if (value >= 70) return 0xdc5146;
  return 0xefa942;
}

let sceneSequence = 0;

class AllianceCityScene extends Phaser.Scene {
  private snapshot?: AllianceState;
  private ready = false;

  constructor() { super(`page09-city-${++sceneSequence}`); }

  preload() {
    this.load.image('city-map', pageAsset(8, 3));
    this.load.image('beacon', pageAsset(8, 9));
  }

  create() {
    this.ready = true;
    this.scale.on('resize', this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.redraw, this));
    this.redraw();
  }

  setSnapshot(snapshot: AllianceState) {
    this.snapshot = snapshot;
    if (this.ready) this.redraw();
  }

  private redraw() {
    if (!this.ready || !this.snapshot) return;
    this.children.removeAll(true);
    const { width, height } = this.scale.gameSize;
    if (width < 40 || height < 40) return;
    const allClear = this.snapshot.done;
    const graphics = this.add.graphics();
    graphics.fillStyle(allClear ? 0xe2f8ec : 0xdbe8f7, 0.94).fillRoundedRect(10, 10, width - 20, height - 20, 25);
    graphics.lineStyle(3, 0x9fb8dc, 0.9).strokeRoundedRect(10, 10, width - 20, height - 20, 25);
    const mapSize = Math.min(width * 0.7, height * 0.8);
    this.add.image(width / 2, height / 2, 'city-map').setDisplaySize(mapSize, mapSize).setAlpha(0.25);

    // 숲 노드: 위기가 남아 있으면 주황, 모두 안정되면 초록
    const forestColor = allClear ? 0x48c778 : 0xb8742a;
    graphics.fillStyle(forestColor, 0.35).fillCircle(width / 2, height / 2, mapSize * 0.16);
    graphics.lineStyle(4, forestColor, 1).strokeCircle(width / 2, height / 2, mapSize * 0.16);
    this.add.text(width / 2, height / 2, allClear ? '숲 회복' : '숲', {
      color: '#f7e9c9', fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.head, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 숲 노드 3개: 위기가 번질 때마다 하나씩 잃는다 (회색 + 손실)
    const lost = lostNodes(this.snapshot);
    [-90, 30, 150].forEach((degree, index) => {
      const radian = degree * Math.PI / 180;
      const nx = width / 2 + Math.cos(radian) * mapSize * 0.27;
      const ny = height / 2 + Math.sin(radian) * mapSize * 0.27;
      const isLost = index < lost;
      const nodeColor = isLost ? 0x6f6f6f : forestColor;
      graphics.fillStyle(nodeColor, isLost ? 0.5 : 0.35).fillCircle(nx, ny, 22);
      graphics.lineStyle(3, nodeColor, 1).strokeCircle(nx, ny, 22);
      this.add.text(nx, ny, isLost ? '손실' : '숲', {
        color: isLost ? '#e8e8e8' : '#f7e9c9', fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold',
      }).setOrigin(0.5);
    });

    CRISES.forEach((crisis) => {
      const px = width * crisis.x / 100;
      const py = height * crisis.y / 100;
      const value = this.snapshot?.gauges[crisis.id] ?? 0;
      const color = gaugeColor(value);
      graphics.lineStyle(3, color, 0.5).lineBetween(px, py, width / 2, height / 2);
      if (value > 0) {
        // 확산 반경: 게이지가 클수록 넓게 번진다
        graphics.fillStyle(color, 0.16).fillCircle(px, py, 40 + value * 0.7);
      }
      graphics.fillStyle(0x071a2c, 0.96).fillCircle(px, py, 40);
      graphics.lineStyle(value >= 70 ? 7 : 4, color, 1).strokeCircle(px, py, 40);
      if (value > 0) this.add.image(px, py - 6, 'beacon').setDisplaySize(36, 36);
      this.add.text(px, py + (value > 0 ? 18 : 0), value <= 0 ? '안정' : `${value}%`, {
        color: '#f7e9c9', fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold',
      }).setOrigin(0.5);
    });
  }
}

function restoreState(raw: unknown): AllianceState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<AllianceState>;
  if (typeof candidate.turn !== 'number' || !candidate.gauges || !candidate.cooldown || candidate.done || candidate.failed) return null;
  return { ...createAllianceState(), ...candidate, spread: Array.isArray(candidate.spread) ? candidate.spread : [], assigned: { fire: [], flock: [], citizens: [] }, feedback: [] };
}

export default function Page08Crisis({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, grantReward, setArtifacts, teacherMode } = useGame();
  const alreadyCompleted = save.stageProgress.completedPages.includes(9);
  const cards = useMemo(() => cardQualities(save.artifacts, ecologyTrials(save.pageData)), [save.artifacts, save.pageData]);
  const bestTurns = typeof save.pageData[BEST_KEY] === 'number' ? save.pageData[BEST_KEY] as number : null;
  const [state, setState] = useState<AllianceState>(() => restoreState(save.pageData[SAVE_KEY]) ?? createAllianceState());
  const [briefing, setBriefing] = useState(() => !alreadyCompleted && !restoreState(save.pageData[SAVE_KEY]));
  const [selectedJob, setSelectedJob] = useState<JobId | null>(null);
  const [runId, setRunId] = useState(0);
  const [finished, setFinished] = useState(alreadyCompleted);
  const scene = useMemo(() => new AllianceCityScene(), [runId]);

  useEffect(() => { scene.setSnapshot(state); }, [scene, state]);

  const assign = (job: JobId, crisis: CrisisId) => {
    const next = toggleAssign(state, job, crisis);
    if (next !== state) { setState(next); audioService.playSfx('drop'); }
    setSelectedJob(null);
  };

  const dropJob = (event: DragEvent<HTMLElement>, crisis: CrisisId) => {
    event.preventDefault();
    const job = event.dataTransfer.getData('text/future-job') as JobId;
    if (JOB_ORDER.includes(job)) assign(job, crisis);
  };

  const endTurn = () => {
    const next = advanceTurn(state, cards);
    setState(next);
    setSelectedJob(null);
    const anyWrong = CRISES.some((crisis) => pairVerdict(crisis, state.assigned[crisis.id]) === 'wrong');
    audioService.playSfx(anyWrong ? 'warning' : 'success');
    if (next.done) finish(next);
    else if (next.failed) {
      setPageData(SAVE_KEY, null);
      const first = CRISES.find((crisis) => crisis.id === next.spread[0]);
      logEvent({
        page: 9,
        type: 'alliance-replan',
        summary: `${MAX_TURNS}턴 안에 위기를 다 잡지 못했어. ${first ? `${first.title}이(가) 먼저 번졌어.` : ''} 다시 계획하기로 했어.`,
        tags: ['연합 대응', '재도전'],
        traits: { analysis: 1 },
        contextRef: `run-${runId}`,
      });
    } else setPageData(SAVE_KEY, next);
  };

  const finish = (final: AllianceState) => {
    const turns = turnsUsed(final);
    setFinished(true);
    setPageData(SAVE_KEY, null);
    if (bestTurns === null || turns < bestTurns) setPageData(BEST_KEY, turns);
    setArtifacts({ allianceTurns: turns });
    completePage(9);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    grantReward('stage5-alliance');
    logEvent({
      page: 9,
      type: 'alliance-clear',
      summary: `위기 3개를 ${turns}턴 만에 안정시켰어. 각 위기에 필요한 두 직업의 힘을 짝지었어.`,
      tags: ['직업 협업', '연합 대응', '협업', `${turns}턴`],
      traits: { collaboration: 2, analysis: 1, execution: 1 },
      contextRef: `run-${runId}`,
    });
    audioService.playSfx('reward');
  };

  const retry = () => {
    setRunId((current) => current + 1);
    setState(createAllianceState());
    setFinished(false);
    setSelectedJob(null);
    setPageData(SAVE_KEY, null);
    audioService.playSfx('tap');
  };

  const stabilizedCount = CRISES.filter((crisis) => isStabilized(state, crisis.id)).length;
  const ended = isEnded(state);
  const firstSpread = CRISES.find((crisis) => crisis.id === state.spread[0]);
  const assignedCount = JOB_ORDER.filter((job) => Object.values(state.assigned).some((list) => list.includes(job))).length;
  const completedTurns = save.artifacts.allianceTurns ?? turnsUsed(state);
  const turnReady = assignedCount >= 2;
  const allianceTask = selectedJob
    ? { action: `${JOB_LABELS[selectedJob]} 배지를 붙일 위기를 골라`, target: '가운데 위기 카드' }
    : !turnReady
      ? { action: `위기 힌트를 읽고 배지를 ${2 - assignedCount}개 더 붙여`, target: '아래 배지 → 가운데 위기' }
      : { action: '배치한 두 힘을 확인하고 결과를 진행해', target: '턴 진행', done: true };

  return (
    <GameShell
      page={9}
      eyebrow="STAGE 5 · ALLIANCE"
      onNavigate={onNavigate}
      className="page08"
      footer={finished
        ? <StageComplete title="네 직업의 힘이 맞물렸어" message={`${completedTurns}턴 만에 위기 3개를 안정시켰어. 혼자였다면 하나도 못 막았어. 넷이 이어 붙어서 셋을 다 지켰어.`} nextLabel="탐험 돌아보기" onNext={() => onNavigate(10)} />
        : state.failed
          ? <div className="guided-footer"><TaskCue action="이번 기록을 보고 다시 짝지어 봐" target="다시 계획해 보기" /><button className="button button--primary button--large is-next-action" onClick={retry}>다시 계획해 보기</button></div>
          : undefined}
    >
      {finished ? (
        <section className="p08-ending" aria-labelledby="p08-ending-title">
          <img className="p08-ending__scene" src={v3Asset('scene-reunion')} onError={fallbackTo(homeAsset('parrot-pair'))} alt="불이 꺼지고 초록으로 돌아온 푸른솔 숲에 새들이 돌아오는 장면" />
          <div className="p08-ending__copy">
            <img className="p08-ending__emblem" src={pageAsset(8, 10)} alt="연합 엠블럼" />
            <div>
              <h2 id="p08-ending-title">푸른솔 숲에 새소리가 돌아왔어</h2>
              <p>불이 꺼지고 숲 노드가 초록으로 바뀌었어. 모모와 루비는 새 정원에서 건강하게 지내고, 시민들은 숲 지킴이가 됐어. 혼자였다면 하나도 못 막았어. 넷이 이어 붙어서 셋을 다 지켰어.</p>
              <p className="p08-ending__turns">이번 기록 {completedTurns}턴 · 최고 기록 {Math.min(bestTurns ?? completedTurns, completedTurns)}턴</p>
            </div>
            <button className="button button--ghost" onClick={retry}>더 적은 턴으로 다시 하기</button>
          </div>
        </section>
      ) : (
        <div className="p08-layout">
          <Panel kicker="ALLIANCE BRIEFING" title="이번 미션" className="p08-brief-panel">
            <MissionGuide
              image={pageAsset(8, 10)}
              imageAlt="네 직업의 힘을 모으는 연합 엠블럼"
              action="위기마다 필요한 두 힘을 짝지어"
              goals={['위기 카드의 힌트 읽기', '배지 두 개 붙이고 턴 진행', '위기 3개 모두 안정시키기']}
              goalImages={[pageAsset(8, 3), pageAsset(8, 8), pageAsset(8, 10)]}
              reward={STAGE.reward}
              details={<p className="modal-note">턴마다 아무도 없는 위기는 더 번져. 100%에 닿으면 옆 위기까지 번지고 숲 노드를 하나 잃어. 쓴 배지는 한 턴 쉬어야 하니 {MAX_TURNS}턴 안에 순서를 잘 정해 봐.</p>}
            />
            <div className="p08-turn" role="status">
              <strong>{state.turn}턴</strong>
              <small>{MAX_TURNS}턴 안에 · 최고 기록 {bestTurns === null ? '아직 없음' : `${bestTurns}턴`}</small>
            </div>
            <div className="p08-metrics">
              <div><span>안정된 위기</span><strong>{stabilizedCount}<small>/3</small></strong></div>
              <div><span>이번 턴 배치</span><strong>{assignedCount}<small>/4</small></strong></div>
              <div><span>잃은 숲 노드</span><strong>{lostNodes(state)}<small>/3</small></strong></div>
            </div>
            {state.feedback.length > 0 && (
              <ul className="p08-feedback" aria-label="지난 턴 결과">
                {state.feedback.map((line) => <li key={line} className={line.includes('필요하다고') || line.includes('번졌어') ? 'is-warning' : ''}>{line}</li>)}
              </ul>
            )}
            {state.failed ? (
              <div className="p08-replan" role="status">
                <strong>{MAX_TURNS}턴이 지났어. 다시 계획해 보자.</strong>
                <p>{firstSpread ? `먼저 번진 건 ${firstSpread.title}이었어. 그 카드엔 무엇이 필요하다고 써 있었을까?` : '위기가 남았어. 짝이 맞는 두 힘을 먼저 붙여 봐.'}</p>
              </div>
            ) : null}
          </Panel>

          <section className="scene-card p08-scene" aria-labelledby="p08-map-title">
            <h2 id="p08-map-title" className="sr-only">도시 홀로그램</h2>
            <PhaserStage scene={scene} ariaLabel={`도시 홀로그램. 안정된 위기 ${stabilizedCount}곳, 남은 위기 ${3 - stabilizedCount}곳`} />
            <div className="p08-crisis-layer" aria-label="위기 카드">
              {CRISES.map((crisis) => {
                const value = state.gauges[crisis.id];
                const stabilized = value <= 0;
                const jobs = state.assigned[crisis.id];
                const spread = state.spread.includes(crisis.id);
                return (
                  <article
                    key={crisis.id}
                    className={`p08-crisis-card${stabilized ? ' is-stable' : value >= 70 ? ' is-critical' : ''}${spread && !stabilized ? ' is-spread' : ''}${selectedJob ? ' is-target' : ''}`}
                    onDragOver={(event) => { if (!stabilized) event.preventDefault(); }}
                    onDrop={(event) => dropJob(event, crisis.id)}
                  >
                    <button
                      className="p08-crisis-head"
                      disabled={stabilized || !selectedJob}
                      onClick={() => { if (selectedJob) assign(selectedJob, crisis.id); }}
                      aria-label={`${crisis.title}, 위기 ${Math.max(0, value)}%.${selectedJob ? ` ${JOB_LABELS[selectedJob]} 배치` : ''}`}
                    >
                      <strong>{crisis.title}</strong>
                      <span className="p08-crisis-gauge">{stabilized ? '안정' : `위기 ${value}%`}</span>
                      {spread && !stabilized && <span className="p08-crisis-spread">번짐 · 숲 노드 손실</span>}
                    </button>
                    <ProgressBar value={Math.max(0, value)} label={`${crisis.title} 위기 게이지`} compact />
                    <p className="p08-crisis-symptom">{crisis.symptom}</p>
                    <ul className="p08-crisis-hints" aria-label="필요한 힘">
                      {crisis.hints.map((hint) => <li key={hint}><SparkIcon />{hint}</li>)}
                    </ul>
                    <div className="p08-crisis-slots">
                      {[0, 1].map((slot) => {
                        const job = jobs[slot];
                        return job
                          ? <button key={slot} className="p08-slot is-filled" onClick={() => assign(job, crisis.id)} aria-label={`${JOB_LABELS[job]} 떼기`}><img src={BADGE_IMAGE[job]} alt="" /><span>{JOB_LABELS[job]}</span></button>
                          : <span key={slot} className="p08-slot">{stabilized ? <CheckIcon /> : '배지 자리'}</span>;
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <Panel kicker="AMMO CARDS" title="내가 만든 카드" className="p08-cards-panel">
            <p className="p08-cards-note">앞에서 만든 결과가 배지의 힘이 돼. 카드가 좋을수록 위기가 더 크게 줄어.</p>
            <ul className="p08-card-list">
              {cards.map((card) => (
                <li key={card.job}>
                  <img src={BADGE_IMAGE[card.job]} alt="" />
                  <div><strong>{card.label}</strong><span className="p08-quality-chip">{card.chip}</span></div>
                  <b>힘 {card.power}</b>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {!finished && !state.failed && (
        <section className="p08-job-deck" aria-labelledby="p08-job-title">
          <h2 id="p08-job-title" className="sr-only">배지를 골라 위기에 붙이기</h2>
          <TaskCue {...allianceTask} />
          <div className="p08-job-grid">
            {JOB_ORDER.map((job) => {
              const available = isAvailable(state, job);
              const placedAt = CRISES.find((crisis) => state.assigned[crisis.id].includes(job));
              const status = !available ? '쉬는 중 (1턴)' : placedAt ? `${placedAt.title}에 배치` : '쓸 수 있어';
              return (
                <button
                  key={job}
                  className={`p08-job-card${!available ? ' is-cooldown' : ''}${placedAt ? ' is-placed' : ''}${selectedJob === job ? ' is-selected' : ''}`}
                  draggable={available}
                  disabled={!available || briefing}
                  onDragStart={(event) => { event.dataTransfer.setData('text/future-job', job); setSelectedJob(job); }}
                  onClick={() => setSelectedJob((current) => current === job ? null : job)}
                  aria-pressed={selectedJob === job}
                  aria-label={`${JOB_LABELS[job]} 배지. ${status}`}
                >
                  <span className="p08-job-grip" aria-hidden="true"><GripIcon /></span>
                  <img src={BADGE_IMAGE[job]} alt="" />
                  <span className="p08-job-copy"><strong>{JOB_LABELS[job]}</strong></span>
                  <span className="p08-job-state">{status}</span>
                </button>
              );
            })}
          </div>
          <button className={`button button--primary${turnReady ? ' is-next-action' : ''}`} onClick={endTurn} disabled={briefing || ended || !turnReady}>{turnReady ? '배치 확인 · 턴 진행' : `배지 ${2 - assignedCount}개 더 붙이기`}</button>
        </section>
      )}

      {briefing && !teacherMode && (
        <Modal title="네 직업의 힘을 짝지어 보자" actions={<button className="button button--primary" onClick={() => { setBriefing(false); audioService.unlock(); audioService.playSfx('tap'); }}>작전 시작</button>}>
          <p>방송 다음 날, 푸른솔 숲에 위기 세 개가 한꺼번에 왔어. 카드에는 직업 이름이 없고 "무엇이 필요한지"만 써 있어. 힌트에 맞는 배지 두 개를 붙여야 위기가 줄어.</p>
          <div className="tap-flow" aria-label="게임 방법"><b>1</b><span>위기 카드 힌트 읽기</span><i><ArrowIcon /></i><b>2</b><span>배지 두 개 붙이고 턴 진행</span></div>
          <p className="modal-note">턴마다 아무도 없는 위기는 더 번져. 100%에 닿으면 옆 위기까지 번지고 숲 노드를 하나 잃어. 쓴 배지는 한 턴 쉬어야 하니 {MAX_TURNS}턴 안에 순서를 잘 정해 봐.</p>
        </Modal>
      )}
    </GameShell>
  );
}

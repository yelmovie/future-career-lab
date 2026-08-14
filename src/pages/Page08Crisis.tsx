import Phaser from 'phaser';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { Modal } from '../components/Modal';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, ClockIcon, GripIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  JOBS,
  REGIONS,
  SYNERGIES,
  advanceCrisisRuntime,
  assignCrisisJob,
  createCrisisRuntime,
  crisisOutcome,
  incidentSetForSeed,
  type CrisisRuntime,
  type JobId,
  type RegionId,
  type RegionState,
} from './page08CrisisModel';
import './page07-08.css';

interface PageProps { onNavigate: (page: PageNumber) => void }
type RunPhase = 'briefing' | 'running' | 'result';
type CrisisResult = ReturnType<typeof crisisOutcome>;

const REGION_LABEL: Record<RegionState, string> = {
  stable: '안정',
  warning: '주의',
  critical: '긴급',
  responding: '대응 중',
  restored: '회복',
};

const REGION_COLOR: Record<RegionState, number> = {
  stable: 0x5291aa,
  warning: 0xefa942,
  critical: 0xdc5146,
  responding: 0x44b9ce,
  restored: 0x48c778,
};

const JOB_STATUS_LABEL = {
  ready: '배치 가능',
  assigned: '이동 중',
  resolving: '대응 중',
  cooldown: '정리 중',
} as const;

interface CrisisSceneSnapshot {
  runtime: CrisisRuntime;
}

let crisisSceneSequence = 0;

class CrisisCityScene extends Phaser.Scene {
  private snapshot?: CrisisSceneSnapshot;
  private ready = false;

  constructor() { super(`page08-city-${++crisisSceneSequence}`); }

  preload() {
    this.load.image('city-map', pageAsset(8, 3));
    this.load.image('alliance', pageAsset(8, 10));
  }

  create() {
    this.ready = true;
    this.scale.on('resize', this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.redraw, this));
    this.redraw();
  }

  setSnapshot(snapshot: CrisisSceneSnapshot) {
    this.snapshot = snapshot;
    if (this.ready) this.redraw();
  }

  private redraw() {
    if (!this.ready || !this.snapshot) return;
    this.children.removeAll(true);
    const { width, height } = this.scale.gameSize;
    if (width < 40 || height < 40) return;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x041524, 0.9).fillRoundedRect(10, 10, width - 20, height - 20, 25);
    graphics.lineStyle(2, 0xe7b861, 0.6).strokeRoundedRect(10, 10, width - 20, height - 20, 25);

    const mapSize = Math.min(width * 0.63, height * 0.7);
    graphics.fillStyle(0xf6ead1, 0.1).fillCircle(width / 2, height / 2, mapSize * 0.48);
    this.add.image(width / 2, height / 2, 'city-map').setDisplaySize(mapSize, mapSize).setAlpha(0.2);
    this.add.image(width / 2, height / 2, 'alliance').setDisplaySize(Math.min(92, mapSize * 0.24), Math.min(92, mapSize * 0.24)).setAlpha(0.92);

    const points = REGIONS.map((region) => ({ ...region, px: width * region.x / 100, py: height * region.y / 100 }));
    graphics.lineStyle(4, 0x2f958f, 0.5);
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const next = points[(index + 1) % points.length];
      if (point && next) graphics.lineBetween(point.px, point.py, next.px, next.py);
    }

    points.forEach((point) => {
      const runtime = this.snapshot?.runtime.regions[point.id];
      if (!runtime) return;
      graphics.fillStyle(0x071a2c, 0.96).fillCircle(point.px, point.py, 43);
      graphics.lineStyle(runtime.state === 'critical' ? 7 : 4, REGION_COLOR[runtime.state], 1).strokeCircle(point.px, point.py, 43);
      if (runtime.state === 'responding') {
        graphics.lineStyle(3, 0x7ce7df, 0.75).strokeCircle(point.px, point.py, 51);
      }
      this.add.text(point.px, point.py - 5, runtime.contributors.length ? String(runtime.contributors.length) : '0', {
        color: '#f7e9c9', fontFamily: 'Pretendard, sans-serif', fontSize: '22px', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add.text(point.px, point.py + 19, '연결', {
        color: '#9ac8c4', fontFamily: 'Pretendard, sans-serif', fontSize: '10px', fontStyle: 'bold',
      }).setOrigin(0.5);
    });
  }
}

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function Page08Crisis({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, grantReward } = useGame();
  const incidentSet = useMemo(() => incidentSetForSeed(save.sessionSeed), [save.sessionSeed]);
  const [runtime, setRuntime] = useState(() => createCrisisRuntime(incidentSet));
  const [phase, setPhase] = useState<RunPhase>('briefing');
  const [durationMs, setDurationMs] = useState(80_000);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [selectedJob, setSelectedJob] = useState<JobId | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('clinic');
  const [result, setResult] = useState<CrisisResult | null>(null);
  const [runId, setRunId] = useState(0);
  const [hidden, setHidden] = useState(document.hidden);
  const [pausedByUser, setPausedByUser] = useState(false);
  const finalizedRuns = useRef(new Set<number>());
  const scene = useMemo(() => new CrisisCityScene(), [runId]);
  const speedFactor = durationMs / 80_000;
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const paused = hidden || pausedByUser;
  const outcomeNow = crisisOutcome(runtime);
  const activeRegion = runtime.regions[selectedRegion];

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
      setElapsedMs((current) => Math.min(durationMs, current + delta));
    }, 180);
    return () => window.clearInterval(timer);
  }, [durationMs, paused, phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    setRuntime((current) => advanceCrisisRuntime(current, elapsedMs, speedFactor));
  }, [elapsedMs, phase, speedFactor]);

  useEffect(() => {
    scene.setSnapshot({ runtime });
  }, [runtime, scene]);

  const startRun = (milliseconds: number) => {
    audioService.playSfx('tap');
    setDurationMs(milliseconds);
    setElapsedMs(0);
    setRuntime(createCrisisRuntime(incidentSet));
    setSelectedJob(null);
    setSelectedRegion('clinic');
    setPausedByUser(false);
    setResult(null);
    setPhase('running');
  };

  const assign = (jobId: JobId, regionId: RegionId) => {
    if (phase !== 'running') return;
    const before = runtime;
    const after = assignCrisisJob(before, jobId, regionId, elapsedMs, speedFactor);
    if (after === before) return;
    setRuntime(after);
    setSelectedJob(null);
    setSelectedRegion(regionId);
    audioService.playSfx('drop');
  };

  const chooseRegion = (regionId: RegionId) => {
    setSelectedRegion(regionId);
    if (selectedJob) assign(selectedJob, regionId);
  };

  const dropJob = (event: DragEvent<HTMLButtonElement>, regionId: RegionId) => {
    event.preventDefault();
    const jobId = event.dataTransfer.getData('text/future-job') as JobId;
    if (JOBS.some((job) => job.id === jobId)) assign(jobId, regionId);
  };

  const finishRun = useCallback((snapshot: CrisisRuntime) => {
    if (finalizedRuns.current.has(runId)) return;
    finalizedRuns.current.add(runId);
    const outcome = crisisOutcome(snapshot);
    setResult(outcome);
    setPhase('result');
    completePage(8);
    addJobCard('미래도시 연합 대응가');
    if (outcome.success) {
      addBadge('직업 연합 전략가');
      grantReward('stage5-alliance-strategist');
    }
    setPageData('page08', {
      incidentSet: incidentSet.id,
      restored: outcome.restored.map((region) => ({ id: region.id, contributors: region.contributors, solution: region.resolvedBy })),
      unresolved: outcome.unresolved.map((region) => region.id),
      stability: snapshot.stability,
      synergies: snapshot.synergiesTriggered,
      success: outcome.success,
      duration: durationMs,
    });
    outcome.restored.forEach((region) => logEvent({
      page: 8,
      type: 'crisis-region-restored',
      summary: `${region.label}: ${region.contributors.map((jobId) => snapshot.jobs[jobId].label).join(' + ')}의 관점을 이어 ${region.incident.title}에 대응했어.`,
      tags: [region.label, '직업 협업', ...region.contributors],
      traits: { collaboration: 1, analysis: 1, execution: 1 },
      contextRef: `${incidentSet.id}:${region.id}`,
    }));
    logEvent({
      page: 8,
      type: outcome.success ? 'crisis-success' : 'crisis-partial',
      summary: `${outcome.restored.length}개 지역을 회복하고 도시 안정도 ${Math.round(snapshot.stability)}를 만들었어.`,
      tags: ['연합 대응', `시너지 ${outcome.synergyCount}`, outcome.success ? '목표 도달' : '부분 회복'],
      traits: { collaboration: 2, analysis: 1, creation: 1 },
      contextRef: `${incidentSet.id}:${outcome.success ? 'success' : 'partial'}`,
    });
    audioService.playSfx(outcome.success ? 'reward' : 'success');
  }, [addBadge, addJobCard, completePage, durationMs, grantReward, incidentSet.id, logEvent, runId, setPageData]);

  useEffect(() => {
    if (phase === 'running' && (elapsedMs >= durationMs || outcomeNow.restored.length === REGIONS.length)) finishRun(runtime);
  }, [durationMs, elapsedMs, finishRun, outcomeNow.restored.length, phase, runtime]);

  const retry = () => {
    setRunId((current) => current + 1);
    setPhase('briefing');
    setResult(null);
    setRuntime(createCrisisRuntime(incidentSet));
  };

  const resultMessage = result
    ? `${result.restored.length}개 지역을 회복했고, 도시 안정도는 ${Math.round(runtime.stability)}야. ${result.success ? '서로 다른 직업의 강점을 충분히 연결했어.' : '부분 회복도 중요한 기록이야. 다른 연결로 다시 시도할 수 있어.'}`
    : '';

  return (
    <GameShell
      page={8}
      eyebrow="STAGE 5 · ALLIANCE CITY"
      onNavigate={onNavigate}
      className="page08"
      footer={phase === 'result' && result
        ? <StageComplete title={result.success ? '도시 연합 대응을 완성했어' : '부분 회복을 기록했어'} message={resultMessage} nextLabel="나의 직업 DNA 보기" onNext={() => onNavigate(9)} />
        : undefined}
    >
      <div className="p08-layout">
        <Panel kicker="CITY BRIEFING" title={incidentSet.title} className="p08-brief-panel">
          <div className="mission-card"><strong>지역 네 곳 이상을 회복해</strong><p>직업 카드를 지역에 배치하고 안정도 55 이상을 만들어 보자. 같은 문제에도 여러 연결 방법이 있어.</p></div>
          <div className="p08-stability">
            <div className="row row--between"><span>도시 안정도</span><strong>{Math.round(runtime.stability)}</strong></div>
            <ProgressBar value={runtime.stability} label="도시 안정도" compact />
          </div>
          <div className="p08-metrics">
            <div><span>회복 지역</span><strong>{outcomeNow.restored.length}<small>/5</small></strong></div>
            <div><span>연결 시너지</span><strong>{outcomeNow.synergyCount}</strong></div>
          </div>
          {runtime.feedback[0] && <div className="toast" role="status">{runtime.feedback[0]}</div>}
          {phase === 'running' && <button className="button button--ghost button--block" onClick={() => setPausedByUser(true)}><ClockIcon />전략 잠시 멈춤</button>}
          {phase === 'running' && outcomeNow.restored.length >= 4 && (
            <button className="button button--teal button--block" onClick={() => finishRun(runtime)}>현재 대응 마무리</button>
          )}
        </Panel>

        <section className="scene-card p08-scene" aria-labelledby="p08-map-title">
          <h2 id="p08-map-title" className="sr-only">연합 위기 대응 도시 지도</h2>
          <div className={`p08-central-timer${remainingMs < durationMs * 0.2 ? ' is-urgent' : ''}`} role="timer">
            <span>연합 대응 시간</span><strong>{formatTime(remainingMs)}</strong>{paused && <small>시간 멈춤</small>}
          </div>
          <PhaserStage scene={scene} ariaLabel={`다섯 지역 도시 지도. 회복 ${outcomeNow.restored.length}곳, 대응 중 ${REGIONS.filter((region) => runtime.regions[region.id].state === 'responding').length}곳`} />
          <div className="p08-region-layer" aria-label="직업을 배치할 지역">
            {REGIONS.map((region) => {
              const regionRuntime = runtime.regions[region.id];
              return (
                <button
                  key={region.id}
                  className={`p08-region-target is-${regionRuntime.state}${selectedRegion === region.id ? ' is-selected' : ''}`}
                  style={{ '--region-x': `${region.x}%`, '--region-y': `${region.y}%` } as CSSProperties}
                  onClick={() => chooseRegion(region.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropJob(event, region.id)}
                  aria-label={`${region.label}, ${REGION_LABEL[regionRuntime.state]}. ${selectedJob ? `${runtime.jobs[selectedJob].label} 배치` : '상세 보기'}`}
                >
                  <span>{region.label}</span><strong>{REGION_LABEL[regionRuntime.state]}</strong>
                </button>
              );
            })}
          </div>
        </section>

        <Panel kicker="REGION EVIDENCE" title={activeRegion.label} className="p08-evidence-panel">
          <span className={`status-chip status-chip--${activeRegion.state === 'restored' ? 'success' : activeRegion.state === 'critical' ? 'danger' : 'warning'}`}>{REGION_LABEL[activeRegion.state]}</span>
          <h3>{activeRegion.incident.title}</h3>
          <p className="p08-symptom">{activeRegion.incident.symptom}</p>
          <div className="p08-clue"><strong>연결 단서</strong><p>{activeRegion.incident.clue}</p></div>
          <div className="p08-contributors">
            <strong>지금까지 이어진 관점</strong>
            {activeRegion.contributors.length
              ? <ul>{activeRegion.contributors.map((jobId) => <li key={jobId}>{runtime.jobs[jobId].label}</li>)}</ul>
              : <p>아직 배치된 직업이 없어.</p>}
          </div>
          <div className="p08-synergy-guide">
            <strong>발견할 수 있는 연결</strong>
            {SYNERGIES.map((synergy) => <span key={synergy.id}>{synergy.label}</span>)}
          </div>
        </Panel>
      </div>

      <section className="p08-job-deck" aria-labelledby="p08-job-title">
        <div className="p08-job-heading"><div><span>JOB ALLIANCE</span><h2 id="p08-job-title">직업 카드를 선택하거나 지역으로 끌어 놓아</h2></div>{selectedJob && <p role="status">{runtime.jobs[selectedJob].label} 선택됨 · 지도에서 지역을 골라 줘</p>}</div>
        <div className="p08-job-grid">
          {JOBS.map((job) => {
            const state = runtime.jobs[job.id];
            const cooldownLeft = state.status === 'cooldown' ? Math.max(0, (state.readyAt ?? elapsedMs) - elapsedMs) : 0;
            return (
              <button
                key={job.id}
                className={`p08-job-card is-${state.status}${selectedJob === job.id ? ' is-selected' : ''}`}
                draggable={state.status === 'ready' && phase === 'running'}
                disabled={state.status !== 'ready' || phase !== 'running'}
                onDragStart={(event) => { event.dataTransfer.setData('text/future-job', job.id); setSelectedJob(job.id); }}
                onClick={() => setSelectedJob((current) => current === job.id ? null : job.id)}
                aria-pressed={selectedJob === job.id}
              >
                <span className="p08-job-grip" aria-hidden="true"><GripIcon /></span>
                <img src={pageAsset(8, job.slot)} alt="" />
                <span className="p08-job-copy"><strong>{job.label}</strong><small>{job.skill}</small></span>
                <span className="p08-job-state">{state.status === 'cooldown' ? `${JOB_STATUS_LABEL[state.status]} ${Math.ceil(cooldownLeft / 1000)}초` : JOB_STATUS_LABEL[state.status]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {phase === 'briefing' && (
        <Modal title="연합 위기 대응 브리핑" actions={<><button className="button button--ghost" onClick={() => startRun(32_000)}>빠른 체험 32초</button><button className="button button--primary" onClick={() => startRun(80_000)}>표준 체험 80초</button></>}>
          <p>{incidentSet.briefing}</p>
          <p><strong>마우스:</strong> 직업 카드를 지역으로 끌어 놓아. <strong>키보드:</strong> 직업 카드에서 Enter를 누른 뒤, 지역 버튼에서 Enter를 누르면 돼.</p>
          <p className="modal-note">카드는 배치 가능 → 이동 중 → 대응 중 → 정리 중 → 배치 가능 순서로 돌아와. 같은 지역도 서로 다른 직업 조합으로 회복할 수 있어.</p>
        </Modal>
      )}

      {pausedByUser && phase === 'running' && (
        <Modal title="연합 대응 시간이 멈췄어" actions={<button className="button button--primary" onClick={() => { setPausedByUser(false); audioService.unlock(); }}>계속하기</button>}>
          <p>지역 상태와 카드 대기 시간도 함께 멈춰 있어. 준비되면 이어서 해 보자.</p>
        </Modal>
      )}

      {phase === 'result' && result && (
        <Modal title={result.success ? '직업의 강점을 연결했어' : '부분 회복에서 찾은 다음 전략'} actions={<><button className="button button--ghost" onClick={retry}>다른 연결로 다시 하기</button><button className="button button--primary" onClick={() => onNavigate(9)}>직업 DNA 보기</button></>}>
          <p>{resultMessage}</p>
          <ul className="p08-result-list">
            {result.restored.map((region) => (
              <li key={region.id}><span><CheckIcon /></span><div><strong>{region.label} · {region.incident.title}</strong><p>{region.resolvedBy?.map((jobId) => runtime.jobs[jobId].label).join(' + ')}의 관점을 연결했어.</p></div></li>
            ))}
            {result.unresolved.map((region) => <li key={region.id} className="is-pending"><span /><div><strong>{region.label} · 더 살펴볼 수 있어</strong><p>{region.incident.clue}</p></div></li>)}
          </ul>
          <p className="p08-disclaimer">이 결과는 한 번의 전략 기록이야. 어떤 직업이 더 높거나 낮다는 뜻이 아니고, 다시 연결하면 다른 결과를 만들 수 있어.</p>
        </Modal>
      )}
    </GameShell>
  );
}

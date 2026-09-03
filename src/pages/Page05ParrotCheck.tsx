import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, SearchIcon, SoundIcon, SparkIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { BIRDS, getBird, TREATMENTS, type BirdId, type CareZoneId, type SoundVerdict, type TreatmentId } from './page05Data';
import {
  applyTreatment,
  birdGauge,
  birdStatus,
  buildCareLog,
  chooseStatement as pickStatement,
  evaluateCare,
  groundedCount,
  isStable,
  readCareState,
  RECORDS_PER_BIRD,
  shuffledStatements,
  soundCorrect,
  type CareState,
} from './page05CareModel';
import './page05.css';

interface PageProps {
  onNavigate: (page: PageNumber) => void;
}

interface CameraState { yaw: number; pitch: number; zoom: number; panX: number; panY: number }
interface Feedback { tone: 'success' | 'warning'; text: string }
interface DragGhost { treatment: TreatmentId; x: number; y: number }

const HOME_CAMERA: CameraState = { yaw: -6, pitch: 3, zoom: 1, panX: 0, panY: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const STAGE = STAGE_META[1]!;

export default function Page05ParrotCheck({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, setArtifacts } = useGame();
  const [state, setState] = useState<CareState>(() => readCareState(save.pageData.page05Care));
  const [birdId, setBirdId] = useState<BirdId>('green');
  const [zoneId, setZoneId] = useState<CareZoneId>('eyes');
  const [camera, setCamera] = useState<CameraState>(HOME_CAMERA);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [playing, setPlaying] = useState<BirdId | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentId | null>(null);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(5));
  const dragState = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const cardDrag = useRef<{ treatment: TreatmentId; startX: number; startY: number; moved: boolean } | null>(null);
  const playTimer = useRef(0);

  const bird = getBird(birdId);
  const zone = bird.zones.find((item) => item.id === zoneId) ?? bird.zones[0]!;
  const statements = useMemo(() => shuffledStatements(birdId, zoneId, save.sessionSeed), [birdId, zoneId, save.sessionSeed]);
  const mission = useMemo(() => evaluateCare(state), [state]);
  const stable = isStable(state, birdId);

  const commit = (next: CareState) => {
    setState(next);
    setPageData('page05Care', next);
  };

  const focusZone = (nextZone: CareZoneId) => {
    const target = bird.zones.find((item) => item.id === nextZone) ?? bird.zones[0]!;
    setZoneId(nextZone);
    setCamera({ ...HOME_CAMERA, zoom: 1.3, panX: clamp((50 - target.hotspot.x) * 0.45, -18, 18), panY: clamp((50 - target.hotspot.y) * 0.35, -14, 14) });
    audioService.playSfx('tap');
  };

  const switchBird = (next: BirdId) => {
    setBirdId(next);
    setCamera(HOME_CAMERA);
    setFeedback(null);
    audioService.playSfx('swipe');
  };

  const chooseStatement = (statementId: string) => {
    const result = pickStatement(state, birdId, zoneId, statementId);
    if (!result.feedback) return;
    commit(result.state);
    setFeedback({ tone: result.grounded ? 'success' : 'warning', text: result.feedback });
    audioService.playSfx(result.grounded ? 'clue' : 'warning');
  };

  const playCall = (target: BirdId) => {
    audioService.playCue(getBird(target).cue);
    setPlaying(target);
    window.clearTimeout(playTimer.current);
    playTimer.current = window.setTimeout(() => setPlaying(null), 2200);
  };

  const classifySound = (verdict: SoundVerdict) => {
    commit({ ...state, sound: { ...state.sound, [birdId]: verdict } });
    const correct = verdict === bird.soundAnswer;
    setFeedback({ tone: correct ? 'success' : 'warning', text: bird.soundFeedback[verdict] });
    audioService.playSfx(correct ? 'clue' : 'warning');
  };

  const dropTreatment = (target: BirdId, treatment: TreatmentId) => {
    const result = applyTreatment(state, target, treatment);
    commit(result.state);
    setSelectedTreatment(null);
    const good = result.matched || result.assist;
    setFeedback({ tone: good ? 'success' : 'warning', text: result.feedback });
    audioService.playSfx(good ? 'success' : 'warning');
    if (target !== birdId) switchBird(target);
  };

  // 처치 카드: 드래그(포인터) 또는 탭해서 고른 뒤 새 카드 탭.
  const onCardDown = (event: PointerEvent<HTMLButtonElement>, treatment: TreatmentId) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    cardDrag.current = { treatment, startX: event.clientX, startY: event.clientY, moved: false };
  };
  const onCardMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = cardDrag.current;
    if (!drag) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
    drag.moved = true;
    setGhost({ treatment: drag.treatment, x: event.clientX, y: event.clientY });
  };
  const onCardUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = cardDrag.current;
    cardDrag.current = null;
    setGhost(null);
    if (!drag) return;
    if (!drag.moved) {
      setSelectedTreatment((current) => (current === drag.treatment ? null : drag.treatment));
      audioService.playSfx('tap');
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-bird]')?.dataset.bird;
    if (target === 'green' || target === 'red') dropTreatment(target, drag.treatment);
  };

  const onBirdTap = (target: BirdId) => {
    if (selectedTreatment) dropTreatment(target, selectedTreatment);
    else switchBird(target);
  };

  const updateCamera = (change: Partial<CameraState>) => setCamera((current) => ({
    yaw: clamp(change.yaw ?? current.yaw, -35, 35),
    pitch: clamp(change.pitch ?? current.pitch, -18, 18),
    zoom: clamp(change.zoom ?? current.zoom, 0.85, 1.6),
    panX: clamp(change.panX ?? current.panX, -18, 18),
    panY: clamp(change.panY ?? current.panY, -14, 14),
  }));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setCamera((current) => ({ ...current, yaw: clamp(current.yaw + dx / 7, -35, 35), pitch: clamp(current.pitch - dy / 9, -18, 18) }));
  };
  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
  };
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateCamera({ zoom: camera.zoom + (event.deltaY < 0 ? 0.1 : -0.1) });
  };
  const handleStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') updateCamera({ yaw: camera.yaw - 4 });
    else if (event.key === 'ArrowRight') updateCamera({ yaw: camera.yaw + 4 });
    else if (event.key === 'ArrowUp') updateCamera({ pitch: camera.pitch + 4 });
    else if (event.key === 'ArrowDown') updateCamera({ pitch: camera.pitch - 4 });
    else if (event.key === '+' || event.key === '=') updateCamera({ zoom: camera.zoom + 0.1 });
    else if (event.key === '-') updateCamera({ zoom: camera.zoom - 0.1 });
    else return;
    event.preventDefault();
  };

  const finishMission = () => {
    if (!mission.ready) return;
    const careLog = buildCareLog(state);
    careLog.forEach((entry) => logEvent({
      page: 5,
      type: 'care-treatment',
      summary: `${getBird(entry.bird).name}: ${entry.issue} → ${entry.treatment}`,
      tags: ['동물·생명', '개체별 돌봄', entry.issue],
      traits: { care: 2, analysis: 1 },
      contextRef: `treatment-${entry.bird}`,
    }));
    logEvent({
      page: 5,
      type: mission.perfect ? 'care-perfect' : 'care-recorded',
      summary: mission.perfect ? '헛 처치 없이 두 마리를 안정시켰어.' : `근거 기록 ${mission.grounded}개로 두 마리를 안정시켰어. (틀린 처치 ${state.wrongTreatments}번)`,
      tags: ['근거 관찰', '소리 분류'],
      traits: { analysis: 2, care: 1 },
      contextRef: 'care-log',
    });
    setArtifacts({ careLog });
    completePage(5);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const footer = completed ? (
    <StageComplete
      title="두 마리 모두 안정됐어"
      message={mission.perfect ? '헛 처치 없이 한 번에 맞췄어. 돌봄 기록을 회복 공간 만들기로 보냈어.' : '돌봄 기록을 회복 공간 만들기로 보냈어.'}
      nextLabel="회복 공간 만들기"
      onNext={() => onNavigate(6)}
    />
  ) : (
    <div className="p5-footer-progress" aria-live="polite">
      <span className={mission.grounded >= RECORDS_PER_BIRD * 2 ? 'is-done' : ''}>근거 기록 {Math.min(mission.grounded, RECORDS_PER_BIRD * 2)}/{RECORDS_PER_BIRD * 2}</span>
      <span className={mission.soundsClassified >= 2 ? 'is-done' : ''}>소리 분류 {mission.soundsClassified}/2</span>
      <span className={mission.stableBirds >= 2 ? 'is-done' : ''}>안정 {mission.stableBirds}/2</span>
      <span className={state.wrongRecords === 0 ? 'is-done' : ''}>헛 기록 {state.wrongRecords}번</span>
      <span className={state.wrongTreatments === 0 ? 'is-done' : ''}>헛 처치 {state.wrongTreatments}번</span>
      <button className="button button--primary button--large" type="button" disabled={!mission.ready} onClick={finishMission}>
        돌봄 기록 확정
        <CheckIcon />
      </button>
    </div>
  );

  return (
    <GameShell page={5} eyebrow="STAGE 2 · CARE LAB" onNavigate={onNavigate} footer={footer} className="p5-shell">
      <div className="p5-layout">
        <Panel title="이번 미션" kicker="MISSION" className="p5-mission-panel">
          <MissionGuide
            image={pageAsset(5, 9)}
            imageAlt="돌봄 기록용 태블릿"
            action="두 마리를 따로 살피고 맞는 처치를 골라요"
            goals={[`숫자를 눌러 보이는 것만 기록 (한 마리에 ${RECORDS_PER_BIRD}개 이상)`, '울음소리 듣고 정상·이상 고르기', '처치 카드를 앵무새에게 끌어 놓기']}
          />
          <div className="p5-reward">
            <span>끝내면 얻는 것</span>
            <strong>{STAGE.reward}</strong>
            <small>갱신 목표: 헛 처치 0번으로 두 마리 모두 안정</small>
          </div>

          <div className="p5-bird-list" aria-label="구조된 앵무새 두 마리">
            {BIRDS.map((item) => {
              const gauge = birdGauge(state, item.id);
              const calm = isStable(state, item.id);
              const treatment = state.treatments[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  data-bird={item.id}
                  className={`p5-bird ${birdId === item.id ? 'is-selected' : ''} ${calm ? 'is-stable' : ''} ${selectedTreatment ? 'is-drop-target' : ''}`}
                  onClick={() => onBirdTap(item.id)}
                  aria-pressed={birdId === item.id}
                  aria-label={`${item.name}, 상태 ${gauge}, ${birdStatus(state, item.id)}${selectedTreatment ? ', 눌러서 고른 처치 놓기' : ''}`}
                >
                  <img src={calm ? item.recoveredImage : item.sickImage} alt="" draggable={false} />
                  <span className="p5-bird__copy">
                    <strong>{item.name}</strong>
                    <small>{birdStatus(state, item.id)} · 기록 {groundedCount(state, item.id)}/5</small>
                    <span className="p5-gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={gauge} aria-label={`${item.name} 상태 게이지`}>
                      <i style={{ width: `${gauge}%` } as CSSProperties} />
                    </span>
                    <small>{treatment ? `처치: ${TREATMENTS.find((t) => t.id === treatment)?.name}` : '처치 없음'}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p5-treatments" aria-label="처치 카드. 끌어서 앵무새에게 놓거나, 눌러 고른 뒤 앵무새를 눌러">
            <strong>처치 카드</strong>
            {TREATMENTS.map((treatment) => (
              <button
                key={treatment.id}
                type="button"
                className={`p5-treatment ${selectedTreatment === treatment.id ? 'is-selected' : ''}`}
                onPointerDown={(event) => onCardDown(event, treatment.id)}
                onPointerMove={onCardMove}
                onPointerUp={onCardUp}
                onPointerCancel={() => { cardDrag.current = null; setGhost(null); }}
                aria-pressed={selectedTreatment === treatment.id}
              >
                <b>{treatment.name}</b>
                <small>{treatment.detail}</small>
              </button>
            ))}
            {selectedTreatment && <p className="p5-treatment-hint">위의 앵무새를 눌러 놓아 봐.</p>}
          </div>
        </Panel>

        <section className="p5-viewer" aria-labelledby="p5-viewer-title">
          <header className="p5-viewer__header">
            <h2 id="p5-viewer-title">{bird.name} 살펴보기</h2>
            <span>{stable ? '안정' : `${bird.issueLabel} · ${birdStatus(state, birdId)}`}</span>
          </header>
          <div
            className="p5-viewport"
            tabIndex={0}
            role="application"
            aria-label="앵무새 보기. 드래그하거나 방향키로 돌리고, 더하기와 빼기로 확대해."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={handleWheel}
            onKeyDown={handleStageKey}
          >
            <div className="p5-perspective-floor" aria-hidden="true" />
            <div
              className="p5-model-rig"
              style={{ transform: `translate3d(${camera.panX}%, ${camera.panY}%, 0) rotateX(${camera.pitch}deg) rotateY(${camera.yaw}deg) scale(${camera.zoom})` } as CSSProperties}
              aria-hidden="true"
            >
              <img className={`p5-bird-model ${stable ? 'is-recovered' : ''}`} key={`${bird.id}-${stable}`} src={stable ? bird.recoveredImage : bird.sickImage} alt="" draggable={false} />
            </div>
            <div className="p5-hotspots" aria-label="관찰 지점">
              {bird.zones.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`p5-hotspot ${zoneId === item.id ? 'is-selected' : ''} ${state.records[birdId][item.id] ? 'is-recorded' : ''}`}
                  style={{ '--hotspot-x': `${item.hotspot.x}%`, '--hotspot-y': `${item.hotspot.y}%` } as CSSProperties}
                  onClick={() => focusZone(item.id)}
                  aria-label={`${item.number}번 ${item.title} 살펴보기`}
                >
                  <span>{item.number}</span>
                </button>
              ))}
            </div>
            {stable && <div className="p5-recovered-badge"><SparkIcon />회복했어</div>}
          </div>
          <div className="p5-camera-controls" aria-label="화면 보기 조절">
            <button type="button" onClick={() => updateCamera({ yaw: camera.yaw - 8 })}>왼쪽 회전</button>
            <button type="button" onClick={() => updateCamera({ yaw: camera.yaw + 8 })}>오른쪽 회전</button>
            <button type="button" onClick={() => updateCamera({ zoom: camera.zoom + 0.12 })}>확대</button>
            <button type="button" onClick={() => updateCamera({ zoom: camera.zoom - 0.12 })}>축소</button>
            <button type="button" onClick={() => setCamera(HOME_CAMERA)}>보기 초기화</button>
          </div>
        </section>

        <Panel title="관찰 기록" kicker={`${bird.name} · ${zone.number}`} className="p5-journal-panel">
          <div className="p5-zone-summary">
            <SearchIcon />
            <div><strong>{zone.title} — 보이는 것</strong><p>{zone.visible}</p></div>
          </div>
          <div className="p5-statements" role="group" aria-label="무엇을 기록할까">
            {statements.map((statement) => {
              const chosen = state.records[birdId][zoneId] === statement.id;
              return (
                <button key={statement.id} type="button" className={`p5-statement ${chosen ? 'is-chosen' : ''}`} onClick={() => chooseStatement(statement.id)} aria-pressed={chosen}>
                  <span>{chosen ? <CheckIcon /> : null}</span>
                  {statement.text}
                </button>
              );
            })}
          </div>

          <div className="p5-sound">
            <div className="p5-sound__head">
              <strong>울음소리 듣기</strong>
              <button type="button" className={`p5-play ${playing === birdId ? 'is-playing' : ''}`} onClick={() => playCall(birdId)} aria-label={`${bird.name} 녹음 듣기`}>
                <SoundIcon />녹음 듣기
              </button>
            </div>
            <div className={`p5-wave p5-wave--${bird.soundAnswer} ${playing === birdId ? 'is-playing' : ''}`} aria-hidden="true">
              {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
            </div>
            <p>{bird.soundHint}</p>
            <div className="p5-verdicts">
              {(['normal', 'abnormal'] as const).map((verdict) => {
                const chosen = state.sound[birdId] === verdict;
                return (
                  <button key={verdict} type="button" className={chosen ? (soundCorrect(state, birdId) ? 'is-correct' : 'is-wrong') : ''} onClick={() => classifySound(verdict)} aria-pressed={chosen}>
                    {verdict === 'normal' ? '정상' : '이상'}
                  </button>
                );
              })}
            </div>
          </div>

          {feedback && <div className={`toast toast--${feedback.tone}`} role="status">{feedback.text}</div>}
        </Panel>
      </div>
      {ghost && (
        <div className="p5-ghost" style={{ left: ghost.x, top: ghost.y } as CSSProperties} aria-hidden="true">
          {TREATMENTS.find((item) => item.id === ghost.treatment)?.name}
        </div>
      )}
    </GameShell>
  );
}

import Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { audioService } from '../services/audioService';
import { pageAsset, sample3d } from '../shared/assets';
import { CANVAS_FONT } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  DRONE_NO_FLY_ZONES,
  DRONE_PRESETS,
  DRONE_TARGETS,
  DRONE_WIND_ZONES,
  scoreDroneFlight,
  type DronePoint,
  type DroneReview,
} from './stage1-2-content';
import './stage1-2.css';

interface DroneTelemetry {
  battery: number;
  elapsed: number;
  recording: boolean;
  wind: string;
  coveredTargets: string[];
  violations: number;
  replayRemaining: number | null;
}

const START_POINT: DronePoint = { x: .08, y: .5 };

function pointList(value: unknown): DronePoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DronePoint => {
    if (!item || typeof item !== 'object') return false;
    const point = item as Record<string, unknown>;
    return typeof point.x === 'number' && typeof point.y === 'number';
  }).slice(0, 4);
}

function savedReview(value: unknown): DroneReview | null {
  if (!value || typeof value !== 'object') return null;
  const review = value as Record<string, unknown>;
  const numericKeys = ['purpose', 'safety', 'framing', 'battery', 'total', 'violations', 'batteryRemaining'] as const;
  if (!numericKeys.every((key) => typeof review[key] === 'number')) return null;
  if (typeof review.passed !== 'boolean' || !Array.isArray(review.coveredTargets)) return null;
  return {
    purpose: review.purpose as number,
    safety: review.safety as number,
    framing: review.framing as number,
    battery: review.battery as number,
    total: review.total as number,
    violations: review.violations as number,
    batteryRemaining: review.batteryRemaining as number,
    passed: review.passed,
    coveredTargets: review.coveredTargets.filter((item): item is string => typeof item === 'string'),
  };
}

function inside(point: DronePoint, zone: { x: number; y: number; width: number; height: number }) {
  return point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height;
}

function distance(a: DronePoint, b: DronePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class DroneFlightScene extends Phaser.Scene {
  private waypoints: DronePoint[] = [];
  private dronePosition: DronePoint = { ...START_POINT };
  private droneImage: Phaser.GameObjects.Image | null = null;
  private mode: 'plan' | 'flight' | 'review' | 'replay' = 'plan';
  private segmentIndex = 0;
  private dwellRemaining = 0;
  private battery = 100;
  private elapsed = 0;
  private recording = false;
  private stableRecordSeconds = 0;
  private readonly targetRecordTime = new Map<string, number>();
  private readonly covered = new Set<string>();
  private readonly violatedZones = new Set<string>();
  private telemetryDelay = 0;
  private replayElapsed = 0;
  private ready = false;
  private readonly addWaypoint: (point: DronePoint) => void;
  private readonly telemetry: (value: DroneTelemetry) => void;
  private readonly flightComplete: (review: DroneReview) => void;

  constructor(callbacks: {
    addWaypoint: (point: DronePoint) => void;
    telemetry: (value: DroneTelemetry) => void;
    flightComplete: (review: DroneReview) => void;
  }) {
    super({ key: `DroneFlight-${Date.now()}-${Math.round(performance.now())}` });
    this.addWaypoint = callbacks.addWaypoint;
    this.telemetry = callbacks.telemetry;
    this.flightComplete = callbacks.flightComplete;
  }

  preload() {
    this.load.image('drone-map', pageAsset(4, 1));
    this.load.image('drone-craft', sample3d(9));
  }

  create() {
    this.ready = true;
    this.drawMap();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleMapPointer, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.drawMap, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleMapPointer, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.drawMap, this);
      this.ready = false;
    });
  }

  update(_time: number, delta: number) {
    if (this.mode === 'replay') {
      this.updateReplay(delta);
      return;
    }
    if (this.mode !== 'flight') return;
    const dt = Math.min(delta, 80) / 1000;
    this.elapsed += dt;
    const windZone = DRONE_WIND_ZONES.find((zone) => inside(this.dronePosition, zone));
    if (windZone) {
      this.dronePosition.x = Phaser.Math.Clamp(this.dronePosition.x + Math.sin(this.elapsed * 5.2) * .006 * dt, .02, .98);
    }
    this.battery = Math.max(0, this.battery - dt * (windZone ? 2.8 : 1.9));

    DRONE_NO_FLY_ZONES.forEach((zone) => {
      if (inside(this.dronePosition, zone)) this.violatedZones.add(zone.id);
    });

    if (this.recording) {
      DRONE_TARGETS.forEach((target) => {
        if (distance(this.dronePosition, target) <= .115) {
          const current = (this.targetRecordTime.get(target.id) ?? 0) + dt;
          this.targetRecordTime.set(target.id, current);
          this.stableRecordSeconds += dt;
          if (current >= .55) this.covered.add(target.id);
        }
      });
    }

    if (this.dwellRemaining > 0) {
      this.dwellRemaining -= delta;
      if (this.dwellRemaining <= 0) this.segmentIndex += 1;
    } else if (this.segmentIndex < this.waypoints.length) {
      const target = this.waypoints[this.segmentIndex]!;
      const remaining = distance(this.dronePosition, target);
      const step = .19 * dt;
      if (remaining <= step) {
        this.dronePosition = { ...target };
        this.dwellRemaining = 1650;
      } else {
        this.dronePosition.x += ((target.x - this.dronePosition.x) / remaining) * step;
        this.dronePosition.y += ((target.y - this.dronePosition.y) / remaining) * step;
      }
    } else {
      this.finishFlight();
      return;
    }

    this.positionDrone();
    this.telemetryDelay -= delta;
    if (this.telemetryDelay <= 0) {
      this.telemetryDelay = 140;
      this.emitTelemetry(windZone?.name ?? '잔잔함');
    }
    if (this.elapsed >= 45 || this.battery <= 0) this.finishFlight();
  }

  setPlan(waypoints: readonly DronePoint[]) {
    if (this.mode !== 'plan') return;
    this.waypoints = waypoints.map((point) => ({ ...point }));
    if (this.ready) this.drawMap();
  }

  launch() {
    if (this.waypoints.length < 2 || this.waypoints.length > 4) return;
    this.mode = 'flight';
    this.dronePosition = { ...START_POINT };
    this.segmentIndex = 0;
    this.dwellRemaining = 0;
    this.battery = 100;
    this.elapsed = 0;
    this.recording = false;
    this.stableRecordSeconds = 0;
    this.targetRecordTime.clear();
    this.covered.clear();
    this.violatedZones.clear();
    this.drawMap();
    this.emitTelemetry('잔잔함');
  }

  setRecording(active: boolean) {
    if (this.mode !== 'flight') return;
    this.recording = active;
    this.emitTelemetry('확인 중');
  }

  nudge(dx: number, dy: number) {
    if (this.mode !== 'flight') return;
    this.dronePosition.x = Phaser.Math.Clamp(this.dronePosition.x + dx, .025, .975);
    this.dronePosition.y = Phaser.Math.Clamp(this.dronePosition.y + dy, .04, .96);
    this.battery = Math.max(0, this.battery - .35);
    this.positionDrone();
  }

  resetFlight() {
    this.mode = 'plan';
    this.dronePosition = { ...START_POINT };
    this.recording = false;
    this.drawMap();
  }

  replay() {
    if (this.waypoints.length < 2) return;
    this.mode = 'replay';
    this.replayElapsed = 0;
    this.dronePosition = { ...START_POINT };
    this.recording = true;
    this.drawMap();
    this.emitTelemetry('리플레이');
  }

  private handleMapPointer(pointer: Phaser.Input.Pointer) {
    if (this.mode !== 'plan') return;
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    this.addWaypoint({
      x: Phaser.Math.Clamp(pointer.x / width, .04, .96),
      y: Phaser.Math.Clamp(pointer.y / height, .06, .94),
    });
  }

  private drawMap() {
    if (!this.ready) return;
    this.children.removeAll(true);
    const width = Math.max(320, this.scale.width);
    const height = Math.max(300, this.scale.height);
    this.add.image(width / 2, height / 2, 'drone-map').setDisplaySize(width, height).setAlpha(.63).setTint(0xaed1c2);
    this.add.rectangle(width / 2, height / 2, width, height, 0x04101d, .26);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x7fe6dd, .18);
    for (let x = 0; x <= width; x += width / 10) grid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += height / 7) grid.lineBetween(0, y, width, y);

    DRONE_WIND_ZONES.forEach((zone) => {
      const rectangle = this.add.rectangle((zone.x + zone.width / 2) * width, (zone.y + zone.height / 2) * height, zone.width * width, zone.height * height, 0x36b9bf, .12)
        .setStrokeStyle(2, 0x65ded8, .52);
      rectangle.setDepth(1);
      this.add.text((zone.x + .01) * width, (zone.y + .01) * height, `바람 · ${zone.name}`, {
        fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#8debe5',
        backgroundColor: '#06263acc', padding: { x: 5, y: 3 },
      }).setDepth(2);
    });
    DRONE_NO_FLY_ZONES.forEach((zone) => {
      this.add.rectangle((zone.x + zone.width / 2) * width, (zone.y + zone.height / 2) * height, zone.width * width, zone.height * height, 0xb6362b, .2)
        .setStrokeStyle(2, 0xf7796d, .75).setDepth(3);
      this.add.text((zone.x + .01) * width, (zone.y + .01) * height, `비행 금지 · ${zone.name}`, {
        fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#ffd7d2',
        backgroundColor: '#5b1815dd', padding: { x: 5, y: 3 },
      }).setDepth(4);
    });
    DRONE_TARGETS.forEach((target) => {
      const covered = this.covered.has(target.id);
      this.add.circle(target.x * width, target.y * height, 25, covered ? 0x3ab76b : 0xe4a63c, .28)
        .setStrokeStyle(3, covered ? 0x74e49a : 0xffd37b, .95).setDepth(5);
      this.add.text(target.x * width, target.y * height + 32, target.name, {
        fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#fff1ca',
        backgroundColor: '#061426d8', padding: { x: 6, y: 4 },
      }).setOrigin(.5, 0).setDepth(6);
    });

    if (this.waypoints.length > 0) {
      const line = this.add.graphics().setDepth(7);
      line.lineStyle(4, 0xffd37b, .88);
      line.beginPath().moveTo(START_POINT.x * width, START_POINT.y * height);
      this.waypoints.forEach((point) => line.lineTo(point.x * width, point.y * height));
      line.strokePath();
      this.waypoints.forEach((point, index) => {
        this.add.circle(point.x * width, point.y * height, 17, 0x0d9e9b, .94).setStrokeStyle(3, 0xb5fff6, 1).setDepth(8);
        this.add.text(point.x * width, point.y * height, String(index + 1), {
          fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#04101d',
        }).setOrigin(.5).setDepth(9);
      });
    }

    this.add.text(18, height - 18, this.mode === 'plan' ? '지도를 눌러 지나갈 점 추가' : this.mode === 'replay' ? '4초 다시 보기' : '비행 조종 중', {
      fontFamily: 'Pretendard, sans-serif', fontSize: CANVAS_FONT.label, fontStyle: 'bold', color: '#f7e9c9',
      backgroundColor: '#061426d8', padding: { x: 8, y: 6 },
    }).setOrigin(0, 1).setDepth(10);
    this.droneImage = this.add.image(this.dronePosition.x * width, this.dronePosition.y * height, 'drone-craft')
      .setDisplaySize(72, 54).setDepth(12);
    this.positionDrone();
  }

  private positionDrone() {
    if (!this.droneImage) return;
    this.droneImage.setPosition(this.dronePosition.x * this.scale.width, this.dronePosition.y * this.scale.height);
    this.droneImage.setTint(this.recording ? 0xffb9b1 : 0xffffff);
  }

  private emitTelemetry(wind: string, replayRemaining: number | null = null) {
    this.telemetry({
      battery: Math.round(this.battery), elapsed: this.elapsed, recording: this.recording,
      wind, coveredTargets: [...this.covered], violations: this.violatedZones.size, replayRemaining,
    });
  }

  private finishFlight() {
    if (this.mode !== 'flight') return;
    this.mode = 'review';
    this.recording = false;
    const review = scoreDroneFlight({
      coveredTargets: this.covered.size,
      violations: this.violatedZones.size,
      stableRecordSeconds: this.stableRecordSeconds,
      batteryRemaining: Math.round(this.battery),
    });
    review.coveredTargets = [...this.covered];
    this.emitTelemetry('비행 종료');
    this.flightComplete(review);
  }

  private updateReplay(delta: number) {
    this.replayElapsed += delta;
    const path = [START_POINT, ...this.waypoints];
    const distances = path.slice(1).map((point, index) => distance(path[index]!, point));
    const totalDistance = distances.reduce((sum, value) => sum + value, 0) || 1;
    let cursor = Phaser.Math.Clamp(this.replayElapsed / 4000, 0, 1) * totalDistance;
    let segment = 0;
    while (segment < distances.length - 1 && cursor > distances[segment]!) {
      cursor -= distances[segment]!;
      segment += 1;
    }
    const from = path[segment]!;
    const to = path[segment + 1] ?? from;
    const ratio = Phaser.Math.Clamp(cursor / (distances[segment] || 1), 0, 1);
    this.dronePosition = { x: Phaser.Math.Linear(from.x, to.x, ratio), y: Phaser.Math.Linear(from.y, to.y, ratio) };
    this.positionDrone();
    const remaining = Math.max(0, 4 - this.replayElapsed / 1000);
    this.emitTelemetry('리플레이', remaining);
    if (this.replayElapsed >= 4000) {
      this.mode = 'review';
      this.recording = false;
      this.emitTelemetry('리플레이 종료', 0);
    }
  }
}

const initialTelemetry: DroneTelemetry = {
  battery: 100, elapsed: 0, recording: false, wind: '잔잔함', coveredTargets: [], violations: 0, replayRemaining: null,
};

export default function Page04Drone({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addBadge } = useGame();
  const restoredReview = savedReview(save.pageData.p4LastReview);
  const [waypoints, setWaypoints] = useState<DronePoint[]>(() => pointList(save.pageData.p4Waypoints));
  const [phase, setPhase] = useState<'plan' | 'flight' | 'review'>(save.stageProgress.completedPages.includes(4) ? 'review' : 'plan');
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(initialTelemetry);
  const [review, setReview] = useState<DroneReview | null>(restoredReview);
  const [notice, setNotice] = useState('지도에서 지나갈 점 2~4개를 정해. 세 촬영 장소를 지나가면 좋아.');
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(4));
  const addWaypointRef = useRef<(point: DronePoint) => void>(() => undefined);
  const telemetryRef = useRef<(value: DroneTelemetry) => void>(() => undefined);
  const completeRef = useRef<(value: DroneReview) => void>(() => undefined);
  const scene = useMemo(() => new DroneFlightScene({
    addWaypoint: (point) => addWaypointRef.current(point),
    telemetry: (value) => telemetryRef.current(value),
    flightComplete: (value) => completeRef.current(value),
  }), []);

  const addWaypoint = (point: DronePoint) => {
    if (phase !== 'plan') return;
    if (waypoints.length >= 4) {
      setNotice('지나갈 점은 최대 4개야. 마지막 점을 지우고 다시 골라 봐.');
      audioService.playSfx('warning');
      return;
    }
    const next = [...waypoints, point];
    setWaypoints(next);
    setPageData('p4Waypoints', next);
    setNotice(`${next.length}번 점을 넣었어. 붉은 금지 구역과 바람 구역을 확인해.`);
    audioService.playSfx('drop');
  };
  addWaypointRef.current = addWaypoint;
  telemetryRef.current = setTelemetry;

  const onFlightComplete = (result: DroneReview) => {
    setReview(result);
    setPhase('review');
    setPageData('p4LastReview', result);
    if (result.passed) {
      setCompleted(true);
      completePage(3);
      addBadge('안전 비행 촬영가');
      logEvent({
        page: 3, type: 'drone-mission', contextRef: 'p4-passed-flight',
        summary: `${result.coveredTargets.length}개 촬영 목표를 안전 계획과 함께 완수했어.`,
        tags: ['드론', '촬영', '안전', '현장'], traits: { execution: 2, creation: 1, analysis: 1 },
      });
      setNotice('목적, 안전, 화면, 배터리를 고르게 챙긴 비행이었어.');
      audioService.playSfx('success');
    } else {
      setNotice('실패로 끝나지 않아. 리뷰를 보고 경로나 녹화 타이밍을 바꿔 다시 촬영해 봐.');
      audioService.playSfx('warning');
    }
  };
  completeRef.current = onFlightComplete;

  useEffect(() => { scene.setPlan(waypoints); }, [scene, waypoints]);

  const addPreset = (preset: typeof DRONE_PRESETS[number]) => {
    if (waypoints.some((point) => distance(point, preset) < .025)) {
      setNotice('이미 넣은 지점이야. 다른 지점을 골라 봐.');
      return;
    }
    addWaypoint({ x: preset.x, y: preset.y });
  };

  const launch = () => {
    if (waypoints.length < 2 || waypoints.length > 4) {
      setNotice('출발하려면 지나갈 점 2~4개가 필요해.');
      audioService.playSfx('warning');
      return;
    }
    setPhase('flight');
    setReview(null);
    setTelemetry(initialTelemetry);
    setNotice('비행 중이야. 촬영 장소 근처에서 촬영을 켜고 화살표로 위치를 맞춰.');
    scene.launch();
    audioService.playSfx('record');
  };

  const toggleRecording = () => {
    const next = !telemetry.recording;
    scene.setRecording(next);
    setTelemetry((current) => ({ ...current, recording: next }));
    setNotice(next ? '촬영을 켰어. 목표 원 안에서 잠시 안정적으로 머물러.' : '촬영을 멈췄어. 다음 장소를 준비해.');
    audioService.playSfx(next ? 'record' : 'tap');
  };

  const retry = () => {
    setPhase('plan');
    setReview(null);
    setTelemetry(initialTelemetry);
    setNotice('이전 경로를 남겨 뒀어. 지점을 지우거나 더 안전한 위치로 다시 계획해.');
    scene.resetFlight();
  };

  const targetName = (id: string) => DRONE_TARGETS.find((target) => target.id === id)?.name ?? id;
  const timeRemaining = Math.max(0, 45 - telemetry.elapsed);

  return (
    <GameShell
      page={3}
      eyebrow="STAGE 2 · 현장 체험"
      onNavigate={onNavigate}
      footer={completed ? (
        <StageComplete
          title="드론 촬영 미션을 완수했어"
          message="좋은 장면은 안전한 계획, 팀의 목적, 현장 판단이 함께 만들었어."
          nextLabel="증거판으로 가기"
          onNext={() => onNavigate(4)}
        />
      ) : undefined}
    >
      <div className={`game-grid game-grid--wide-center drone-layout${phase === 'plan' ? ' is-planning' : ''}`}>
        <Panel title="이번에 할 일" kicker="MISSION BRIEF">
          <MissionGuide
            image={pageAsset(4, 1)}
            imageAlt="조종기로 드론을 움직이는 어린이"
            action="드론으로 두 곳을 찍어요"
            goals={['지도에 점 2~4개', '70점 넘기기']}
          />
          <div className="drone-presets" aria-label="빠른 지나갈 점 추가">
            <strong>지도에 놓은 점 {waypoints.length} / 4</strong>
            {DRONE_PRESETS.map((preset) => (
              <button key={preset.id} className="button button--ghost" disabled={phase !== 'plan' || waypoints.length >= 4} onClick={() => addPreset(preset)}>
                {preset.name} 추가
              </button>
            ))}
          </div>
          <div className="row">
            <button className="button button--ghost" disabled={phase !== 'plan' || waypoints.length === 0} onClick={() => {
              const next = waypoints.slice(0, -1); setWaypoints(next); setPageData('p4Waypoints', next); audioService.playSfx('tap');
            }}>마지막 지점 지우기</button>
            <button className="button button--ghost" disabled={phase !== 'plan' || waypoints.length === 0} onClick={() => {
              setWaypoints([]); setPageData('p4Waypoints', []); audioService.playSfx('tap');
            }}>모두 지우기</button>
          </div>
          <div className="drone-map-key" aria-label="지도 색 안내"><span className="is-danger">붉은 곳 피하기</span><span className="is-wind">바람 조심하기</span></div>
        </Panel>

        <div className="drone-center stack">
          <div className="scene-card drone-scene">
            <PhaserStage scene={scene} ariaLabel="지나갈 점을 정하고 드론을 실제로 비행시키는 강변 촬영 지도" />
            {telemetry.replayRemaining !== null && telemetry.replayRemaining > 0 && (
              <div className="replay-badge" role="status">다시 보기 · {telemetry.replayRemaining.toFixed(1)}초</div>
            )}
          </div>
          <Panel className="drone-controls" title="비행 조종" kicker={phase === 'flight' ? 'LIVE CONTROL' : 'FLIGHT CONTROL'}>
            <div className="drone-control-row">
              <div className="direction-pad" aria-label="드론 미세 조종">
                <button disabled={phase !== 'flight'} aria-label="위로 이동" onClick={() => scene.nudge(0, -.035)}>위</button>
                <button disabled={phase !== 'flight'} aria-label="왼쪽으로 이동" onClick={() => scene.nudge(-.035, 0)}>왼쪽</button>
                <button disabled={phase !== 'flight'} aria-label="아래로 이동" onClick={() => scene.nudge(0, .035)}>아래</button>
                <button disabled={phase !== 'flight'} aria-label="오른쪽으로 이동" onClick={() => scene.nudge(.035, 0)}>오른쪽</button>
              </div>
              {phase === 'plan' && <button className="button button--primary button--large" onClick={launch}>경로 확인 후 출발</button>}
              {phase === 'flight' && (
                <button className={`record-button${telemetry.recording ? ' is-recording' : ''}`} aria-pressed={telemetry.recording} onClick={toggleRecording}>
                  <span />{telemetry.recording ? '촬영 끄기' : '촬영 켜기'}
                </button>
              )}
              {phase === 'review' && (
                <div className="row drone-review-actions">
                  <button className="button button--teal" onClick={() => { scene.replay(); audioService.playSfx('tap'); }}>4초 다시 보기</button>
                  {!review?.passed && <button className="button button--primary" onClick={retry}>경로 고쳐 다시 촬영</button>}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {phase !== 'plan' && <Panel title={phase === 'review' ? '촬영 결과' : '드론 상태'} kicker={phase === 'review' ? 'MISSION REVIEW' : 'TELEMETRY'}>
          {phase !== 'review' || !review ? (
            <div className="metric-grid">
              <div><span className="metric-label">남은 시간</span><div className={`timer${timeRemaining <= 10 ? ' is-urgent' : ''}`}>{timeRemaining.toFixed(1)}초</div></div>
              <ProgressBar value={telemetry.battery} label={`배터리 ${telemetry.battery}%`} />
              <div className="telemetry-pair"><span>바람</span><strong>{telemetry.wind}</strong></div>
              <div className="telemetry-pair"><span>붉은 곳에 닿음</span><strong>{telemetry.violations}회</strong></div>
              <div className="target-checks">
                <strong>촬영 목표</strong>
                {DRONE_TARGETS.map((target) => (
                  <div key={target.id} className={telemetry.coveredTargets.includes(target.id) ? 'is-done' : ''}>
                    <span>{telemetry.coveredTargets.includes(target.id) ? '완료' : '대기'}</span>{target.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="drone-review">
              <div className={`review-total ${review.passed ? 'is-pass' : 'is-partial'}`}>
                <span>{review.passed ? '미션 완수' : '아직 완료 전 · 다시 할 수 있어'}</span>
                <strong>{review.total}<small>/100</small></strong>
              </div>
              <div className="review-bars">
                <ProgressBar value={(review.purpose / 35) * 100} label={`찍은 장면 ${review.purpose} / 35`} compact />
                <ProgressBar value={(review.safety / 30) * 100} label={`안전 ${review.safety} / 30`} compact />
                <ProgressBar value={(review.framing / 20) * 100} label={`덜 흔들림 ${review.framing} / 20`} compact />
                <ProgressBar value={(review.battery / 15) * 100} label={`남은 힘 ${review.battery} / 15`} compact />
              </div>
              <div className="review-facts">
                <span>담은 장면</span>
                <strong>{review.coveredTargets.length ? review.coveredTargets.map(targetName).join(', ') : '아직 없음'}</strong>
                <span>남은 배터리</span><strong>{review.batteryRemaining}%</strong>
              </div>
            </div>
          )}
          <div className={`toast${phase === 'review' && !review?.passed ? ' toast--warning' : ''}`} role="status">{notice}</div>
        </Panel>}
      </div>
    </GameShell>
  );
}

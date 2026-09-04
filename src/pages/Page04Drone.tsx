import Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, MissionGuide, Panel, TaskCue } from '../components/GameShell';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { CANVAS_FONT, STAGE_META } from '../shared/constants';
import type { PageNumber, PhotoId } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  DRAIN_MULTIPLIER,
  DRONE_SPEED,
  DRONE_START,
  DRONE_TARGETS,
  MAX_WAYPOINTS,
  NUDGE_DRAIN,
  PRECISION_BATTERY,
  REC_DWELL_MS,
  REC_RADIUS,
  WIND_LABEL,
  batteryDrain,
  distance,
  evaluateFlight,
  photoAsset,
  recQuality,
  windRelation,
  windZonesFor,
  type DronePhoto,
  type DronePoint,
  type DroneResult,
  type WindRelation,
  type WindZone,
} from './stage1-2-content';
import './stage1-2.css';

interface DroneTelemetry {
  battery: number;
  wind: WindRelation;
  recTarget: PhotoId | null;
  recCenter: boolean;
  photos: DronePhoto[];
  returning: boolean;
  replayRemaining: number | null;
}

const initialTelemetry: DroneTelemetry = { battery: 100, wind: 'calm', recTarget: null, recCenter: false, photos: [], returning: false, replayRemaining: null };
const FONT = 'Pretendard, sans-serif';
const STILL: DronePoint = { x: 0, y: 0 };

function pointList(value: unknown): DronePoint[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DronePoint => !!item && typeof item === 'object' && typeof (item as DronePoint).x === 'number' && typeof (item as DronePoint).y === 'number').slice(0, MAX_WAYPOINTS);
}

function savedResult(value: unknown): DroneResult | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Partial<DroneResult>;
  if (!Array.isArray(result.photos) || typeof result.batteryRemaining !== 'number' || typeof result.passed !== 'boolean') return null;
  return { photos: result.photos, batteryRemaining: result.batteryRemaining, drainByZone: result.drainByZone ?? {}, passed: result.passed, precision: result.precision ?? false };
}

const targetName = (id: PhotoId) => DRONE_TARGETS.find((target) => target.id === id)?.name ?? id;
const missedTargets = (photos: readonly DronePhoto[]) => DRONE_TARGETS.filter((target) => !photos.some((photo) => photo.id === target.id)).map((target) => target.id);

class DroneFlightScene extends Phaser.Scene {
  private waypoints: DronePoint[] = [];
  private position: DronePoint = { ...DRONE_START };
  private heading: DronePoint = STILL;
  private droneImage: Phaser.GameObjects.Image | null = null;
  private readonly rings = new Map<PhotoId, Phaser.GameObjects.Arc>();
  private mode: 'plan' | 'flight' | 'return' | 'review' | 'replay' = 'plan';
  private segmentIndex = 0;
  private dwellRemaining = 0;
  private battery = 100;
  private readonly photos = new Map<PhotoId, 'center' | 'edge'>();
  private drainByZone: Record<string, number> = {};
  private recTarget: PhotoId | null = null;
  private recDistance = 1;
  private telemetryDelay = 0;
  private replayElapsed = 0;
  private highlightZone: string | null = null;
  private ready = false;

  constructor(
    private readonly zones: WindZone[],
    private readonly callbacks: {
      addWaypoint: (point: DronePoint) => void;
      moveWaypoint: (index: number, point: DronePoint) => void;
      telemetry: (value: DroneTelemetry) => void;
      flightComplete: (result: DroneResult) => void;
    },
  ) {
    super({ key: `DroneFlight-${Date.now()}-${Math.round(performance.now())}` });
  }

  preload() {
    this.load.image('drone-map', pageAsset(4, 6));
    this.load.image('drone-craft', pageAsset(4, 3));
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
    if (this.mode === 'replay') { this.updateReplay(delta); return; }
    if (this.mode !== 'flight' && this.mode !== 'return') return;
    const dt = Math.min(delta, 80) / 1000;

    if (this.battery > 0) {
      const drain = batteryDrain(this.position, this.heading, this.zones, dt);
      const { zone } = windRelation(this.position, this.heading, this.zones);
      if (zone) this.drainByZone[zone.id] = (this.drainByZone[zone.id] ?? 0) + drain;
      this.battery = Math.max(0, this.battery - drain);
      if (this.battery <= 0 && this.mode === 'flight') this.mode = 'return';
    }

    const goal = this.mode === 'return' ? DRONE_START : this.waypoints[this.segmentIndex];
    if (this.dwellRemaining > 0) {
      this.dwellRemaining -= delta;
      if (this.dwellRemaining <= 0) this.segmentIndex += 1;
    } else if (goal) {
      const remaining = distance(this.position, goal);
      const step = DRONE_SPEED * dt;
      if (remaining > 1e-6) this.heading = { x: (goal.x - this.position.x) / remaining, y: (goal.y - this.position.y) / remaining };
      if (remaining <= step) {
        this.position = { ...goal };
        if (this.mode === 'return') { this.finishFlight(); return; }
        this.dwellRemaining = REC_DWELL_MS;
      } else {
        this.position = { x: this.position.x + this.heading.x * step, y: this.position.y + this.heading.y * step };
      }
    } else {
      // 마지막 점까지 갔으면 끝. 놓친 목표는 다시 계획해서 날아야 한다(두 번째 바퀴 없음).
      this.mode = 'return';
    }

    this.updateRecWindow();
    this.positionDrone();
    this.telemetryDelay -= delta;
    if (this.telemetryDelay <= 0) { this.telemetryDelay = 120; this.emitTelemetry(); }
  }

  setPlan(waypoints: readonly DronePoint[]) {
    if (this.mode !== 'plan') return;
    this.waypoints = waypoints.map((point) => ({ ...point }));
    if (this.ready) this.drawMap();
  }

  launch() {
    if (this.waypoints.length < 2) return;
    this.mode = 'flight';
    this.position = { ...DRONE_START };
    this.heading = STILL;
    this.segmentIndex = 0;
    this.dwellRemaining = 0;
    this.battery = 100;
    this.photos.clear();
    this.drainByZone = {};
    this.recTarget = null;
    this.highlightZone = null;
    this.drawMap();
    this.emitTelemetry();
  }

  /** REC 탭. 창 안이면 사진 품질을 돌려주고, 밖이면 null. */
  tapRec(): DronePhoto | null {
    if (this.mode !== 'flight' || !this.recTarget) return null;
    const quality = recQuality(this.recDistance);
    if (!quality) return null;
    const photo = { id: this.recTarget, quality };
    this.photos.set(photo.id, quality);
    this.rings.get(photo.id)?.setFillStyle(0x3ab76b, .35).setStrokeStyle(3, 0x74e49a, 1);
    this.recTarget = null;
    this.emitTelemetry();
    return photo;
  }

  nudge(dx: number, dy: number) {
    if (this.mode !== 'flight') return;
    this.position = { x: Phaser.Math.Clamp(this.position.x + dx, .025, .975), y: Phaser.Math.Clamp(this.position.y + dy, .04, .96) };
    this.battery = Math.max(0, this.battery - NUDGE_DRAIN);
    this.positionDrone();
  }

  resetFlight() {
    this.mode = 'plan';
    this.position = { ...DRONE_START };
    this.heading = STILL;
    this.highlightZone = null;
    this.drawMap();
  }

  /** 실패 피드백: 배터리를 가장 많이 먹은 바람 구간을 강조한다. */
  highlight(zoneId: string | null) {
    this.highlightZone = zoneId;
    if (this.ready) this.drawMap();
  }

  replay() {
    if (this.waypoints.length < 2) return;
    this.mode = 'replay';
    this.replayElapsed = 0;
    this.position = { ...DRONE_START };
    this.drawMap();
  }

  private updateRecWindow() {
    let nearest: { id: PhotoId; dist: number } | null = null;
    for (const target of DRONE_TARGETS) {
      if (this.photos.has(target.id)) continue;
      const dist = distance(this.position, target);
      if (dist <= REC_RADIUS && (!nearest || dist < nearest.dist)) nearest = { id: target.id, dist };
    }
    this.recTarget = this.mode === 'flight' && nearest ? nearest.id : null;
    this.recDistance = nearest?.dist ?? 1;
    for (const [id, ring] of this.rings) {
      if (this.photos.has(id)) continue;
      const open = id === this.recTarget;
      ring.setFillStyle(open ? 0xff6b5c : 0xe4a63c, open ? .38 : .22).setStrokeStyle(open ? 5 : 3, open ? 0xffb3aa : 0xffd37b, .95);
    }
  }

  private handleMapPointer(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) {
    if (this.mode !== 'plan' || over.length > 0) return;
    this.callbacks.addWaypoint({
      x: Phaser.Math.Clamp(pointer.x / Math.max(1, this.scale.width), .04, .96),
      y: Phaser.Math.Clamp(pointer.y / Math.max(1, this.scale.height), .06, .94),
    });
  }

  private drawArrow(g: Phaser.GameObjects.Graphics, x: number, y: number, { x: dx, y: dy }: DronePoint, size: number) {
    g.lineBetween(x - dx * size, y - dy * size, x + dx * size, y + dy * size);
    const tipX = x + dx * size; const tipY = y + dy * size;
    g.fillTriangle(tipX + dx * size * .5, tipY + dy * size * .5, tipX - dy * size * .45, tipY + dx * size * .45, tipX + dy * size * .45, tipY - dx * size * .45);
  }

  private drawMap() {
    if (!this.ready) return;
    this.children.removeAll(true);
    this.rings.clear();
    const width = Math.max(320, this.scale.width);
    const height = Math.max(300, this.scale.height);
    this.add.image(width / 2, height / 2, 'drone-map').setDisplaySize(width, height).setAlpha(.92);
    this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, .10);

    this.zones.forEach((zone, index) => {
      const hot = this.highlightZone === zone.id;
      const color = hot ? 0xd65b4a : 0x36b9bf;
      this.add.rectangle((zone.x + zone.width / 2) * width, (zone.y + zone.height / 2) * height, zone.width * width, zone.height * height, color, hot ? .3 : .12)
        .setStrokeStyle(hot ? 5 : 2, color, hot ? 1 : .6).setDepth(1);
      const g = this.add.graphics().setDepth(2);
      g.lineStyle(hot ? 5 : 3, color, hot ? 1 : .8).fillStyle(color, hot ? 1 : .8);
      const cols = 3; const rows = 3;
      for (let c = 0; c < cols; c += 1) for (let r = 0; r < rows; r += 1) {
        this.drawArrow(g, (zone.x + zone.width * (c + .5) / cols) * width, (zone.y + zone.height * (r + .5) / rows) * height, zone.wind, hot ? 16 : 11);
      }
      this.add.text((zone.x + .01) * width, (zone.y + .01) * height, `${index + 1}구간 · ${hot ? '여기서 배터리가 많이 닳았어' : '화살표 거스르면 맞바람'}`, {
        fontFamily: FONT, fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#f7e9c9', backgroundColor: '#06263acc', padding: { x: 5, y: 3 },
      }).setDepth(3);
    });

    DRONE_TARGETS.forEach((target) => {
      const done = this.photos.has(target.id);
      const missed = !done && this.mode === 'review';
      const ring = this.add.circle(target.x * width, target.y * height, REC_RADIUS * Math.min(width, height), done ? 0x3ab76b : missed ? 0xd65b4a : 0xe4a63c, done ? .35 : missed ? .3 : .22)
        .setStrokeStyle(missed ? 5 : 3, done ? 0x74e49a : missed ? 0xff8176 : 0xffd37b, .95).setDepth(5);
      this.rings.set(target.id, ring);
      this.add.circle(target.x * width, target.y * height, 7, 0xfff1ca, .9).setDepth(6);
      this.add.text(target.x * width, target.y * height + 14, `${target.name}${done ? ' · 찍음' : missed ? ' · 놓침' : ''}`, {
        fontFamily: FONT, fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#fff1ca', backgroundColor: '#061426d8', padding: { x: 6, y: 4 },
      }).setOrigin(.5, 0).setDepth(6);
    });

    this.add.circle(DRONE_START.x * width, DRONE_START.y * height, 22, 0x0d9e9b, .35).setStrokeStyle(2, 0x9ee9e2, .9).setDepth(4);
    this.add.text(DRONE_START.x * width, DRONE_START.y * height + 26, '이륙장', { fontFamily: FONT, fontSize: CANVAS_FONT.cap, color: '#9ee9e2' }).setOrigin(.5, 0).setDepth(4);

    if (this.waypoints.length > 0) {
      const line = this.add.graphics().setDepth(7);
      line.lineStyle(4, 0xffd37b, .88).beginPath().moveTo(DRONE_START.x * width, DRONE_START.y * height);
      this.waypoints.forEach((point) => line.lineTo(point.x * width, point.y * height));
      line.strokePath();
      this.waypoints.forEach((point, index) => {
        const dot = this.add.circle(point.x * width, point.y * height, 32, 0x0d9e9b, .94).setStrokeStyle(4, 0xb5fff6, 1).setDepth(8);
        const label = this.add.text(point.x * width, point.y * height, String(index + 1), { fontFamily: FONT, fontSize: CANVAS_FONT.body, fontStyle: 'bold', color: '#04101d' }).setOrigin(.5).setDepth(9);
        if (this.mode === 'plan') {
          dot.setInteractive({ useHandCursor: true, draggable: true });
          dot.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => { dot.setPosition(dragX, dragY); label.setPosition(dragX, dragY); });
          dot.on(Phaser.Input.Events.GAMEOBJECT_DRAG_END, () => this.callbacks.moveWaypoint(index, {
            x: Phaser.Math.Clamp(dot.x / width, .04, .96), y: Phaser.Math.Clamp(dot.y / height, .06, .94),
          }));
        }
      });
    }

    const caption = this.mode === 'plan' ? '지도를 눌러 점 추가 · 점을 끌어 옮기기' : this.mode === 'replay' ? '4초 다시 보기' : this.mode === 'return' ? '이륙장으로 돌아가는 중' : '비행 중 · 점 순서대로 한 번만 지나가';
    this.add.text(18, height - 18, caption, { fontFamily: FONT, fontSize: CANVAS_FONT.label, fontStyle: 'bold', color: '#f7e9c9', backgroundColor: '#061426d8', padding: { x: 8, y: 6 } }).setOrigin(0, 1).setDepth(10);
    this.droneImage = this.add.image(0, 0, 'drone-craft').setDisplaySize(78, 78).setDepth(12);
    this.positionDrone();
  }

  private positionDrone() {
    this.droneImage?.setPosition(this.position.x * this.scale.width, this.position.y * this.scale.height);
  }

  private emitTelemetry(replayRemaining: number | null = null) {
    this.callbacks.telemetry({
      battery: Math.round(this.battery), wind: windRelation(this.position, this.heading, this.zones).relation, recTarget: this.recTarget,
      recCenter: recQuality(this.recDistance) === 'center', photos: [...this.photos].map(([id, quality]) => ({ id, quality })),
      returning: this.mode === 'return', replayRemaining,
    });
  }

  private finishFlight() {
    this.mode = 'review';
    this.recTarget = null;
    const result = evaluateFlight({
      photos: DRONE_TARGETS.filter((target) => this.photos.has(target.id)).map((target) => ({ id: target.id, quality: this.photos.get(target.id)! })),
      batteryRemaining: Math.round(this.battery), drainByZone: this.drainByZone,
    });
    this.drawMap();
    this.emitTelemetry();
    this.callbacks.flightComplete(result);
  }

  private updateReplay(delta: number) {
    this.replayElapsed += delta;
    const path = [DRONE_START, ...this.waypoints];
    const distances = path.slice(1).map((point, index) => distance(path[index]!, point));
    const total = distances.reduce((sum, value) => sum + value, 0) || 1;
    let cursor = Phaser.Math.Clamp(this.replayElapsed / 4000, 0, 1) * total;
    let segment = 0;
    while (segment < distances.length - 1 && cursor > distances[segment]!) { cursor -= distances[segment]!; segment += 1; }
    const from = path[segment]!; const to = path[segment + 1] ?? from;
    const ratio = Phaser.Math.Clamp(cursor / (distances[segment] || 1), 0, 1);
    this.position = { x: Phaser.Math.Linear(from.x, to.x, ratio), y: Phaser.Math.Linear(from.y, to.y, ratio) };
    this.positionDrone();
    this.emitTelemetry(Math.max(0, 4 - this.replayElapsed / 1000));
    if (this.replayElapsed >= 4000) { this.mode = 'review'; this.emitTelemetry(0); }
  }
}

export default function Page04Drone({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, setArtifacts } = useGame();
  const zones = useMemo(() => windZonesFor(save.sessionSeed), [save.sessionSeed]);
  const [waypoints, setWaypoints] = useState<DronePoint[]>(() => pointList(save.pageData.p3Waypoints));
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(3));
  const [phase, setPhase] = useState<'plan' | 'flight' | 'review'>(completed ? 'review' : 'plan');
  const [telemetry, setTelemetry] = useState<DroneTelemetry>(initialTelemetry);
  const [result, setResult] = useState<DroneResult | null>(() => savedResult(save.pageData.p3Result));
  const [precisionStamp, setPrecisionStamp] = useState(save.pageData.p3Precision === true);
  const [notice, setNotice] = useState('바람 화살표를 보고 지나갈 점 2~4개를 정해. 세 목표 원을 한 번에 다 지나가야 해. 놓치면 다시 계획!');
  const callbacks = useRef<{
    addWaypoint: (point: DronePoint) => void;
    moveWaypoint: (index: number, point: DronePoint) => void;
    flightComplete: (result: DroneResult) => void;
  }>({ addWaypoint: () => undefined, moveWaypoint: () => undefined, flightComplete: () => undefined });
  const scene = useMemo(() => new DroneFlightScene(zones, {
    addWaypoint: (point) => callbacks.current.addWaypoint(point),
    moveWaypoint: (index, point) => callbacks.current.moveWaypoint(index, point),
    telemetry: setTelemetry,
    flightComplete: (value) => callbacks.current.flightComplete(value),
  }), [zones]);

  const savePlan = (next: DronePoint[]) => { setWaypoints(next); setPageData('p3Waypoints', next); };
  const full = waypoints.length >= MAX_WAYPOINTS;
  callbacks.current.addWaypoint = (point) => {
    if (phase !== 'plan') return;
    if (full) { setNotice(`지나갈 점은 최대 ${MAX_WAYPOINTS}개야. 점을 끌어 옮기거나 마지막 점을 지워 봐.`); audioService.playSfx('warning'); return; }
    savePlan([...waypoints, point]);
    setNotice(`${waypoints.length + 1}번 점을 놓았어. 화살표를 거슬러 날면 배터리가 ${DRAIN_MULTIPLIER.head}배로 닳아. 화살표 따라 날면 덜 닳아.`);
    audioService.playSfx('drop');
  };
  callbacks.current.moveWaypoint = (index, point) => {
    if (phase !== 'plan') return;
    savePlan(waypoints.map((item, i) => (i === index ? point : item)));
    audioService.playSfx('tap');
  };
  callbacks.current.flightComplete = (value) => {
    setResult(value);
    setPhase('review');
    setPageData('p3Result', value);
    if (value.passed) {
      setCompleted(true);
      completePage(3);
      setArtifacts({ photos: value.photos });
      logEvent({
        page: 3, type: 'drone-mission', contextRef: 'p3-passed-flight',
        summary: `세 곳을 찍고 배터리 ${value.batteryRemaining}%를 남겼어.`,
        tags: ['드론', '촬영', '바람', '배터리'], traits: { execution: 2, exploration: 1, analysis: 1 },
      });
      if (value.precision && !precisionStamp) {
        setPrecisionStamp(true);
        setPageData('p3Precision', true);
        logEvent({ page: 3, type: 'drone-precision', contextRef: 'p3-precision', summary: '배터리 30% 이상 남기고 3컷 모두 정중앙 — 정밀 비행.', tags: ['드론', '정밀'], traits: { execution: 1 } });
      }
      setNotice(value.precision ? '정밀 비행 도장! 세 컷 다 정중앙에 배터리도 넉넉해.' : '세 곳을 다 찍었어. 다시 날면 정밀 비행 도장에 도전할 수 있어.');
      audioService.playSfx(value.precision ? 'reward' : 'success');
      return;
    }
    const missed = missedTargets(value.photos).map(targetName).join(', ');
    if (value.batteryRemaining <= 0) {
      const worst = Object.entries(value.drainByZone).sort((a, b) => b[1] - a[1])[0];
      const zone = zones.find((item) => item.id === worst?.[0]);
      scene.highlight(zone?.id ?? null);
      setNotice(`${missed}을 못 찍고 배터리가 먼저 떨어졌어. 어느 구간에서 배터리가 빨리 닳았지?${zone ? ` 붉게 표시한 구간에서 ${Math.round(worst![1])}%나 썼어. 화살표 방향을 다시 봐.` : ' 경로를 짧게 바꿔 봐.'}`);
    } else {
      setNotice(`${missed}을 놓쳤어. 어디서 REC를 놓쳤지? 붉은 원이 놓친 목표야. 점을 원 한가운데로 옮기고 REC 창이 열릴 때 눌러.`);
    }
    audioService.playSfx('warning');
  };

  useEffect(() => { scene.setPlan(waypoints); }, [scene, waypoints]);

  const addTargetPoint = (id: PhotoId) => {
    const target = DRONE_TARGETS.find((item) => item.id === id)!;
    callbacks.current.addWaypoint({ x: target.x, y: target.y });
  };

  const launch = () => {
    if (waypoints.length < 2) { setNotice('출발하려면 지나갈 점이 2개 이상 필요해.'); audioService.playSfx('warning'); return; }
    setPhase('flight');
    setResult(null);
    setTelemetry(initialTelemetry);
    setNotice('비행 중! 목표 원에 들어가 버튼이 빨갛게 빛나면 REC 를 눌러. 한 바퀴뿐이야.');
    scene.launch();
    audioService.playSfx('record');
  };

  const tapRec = () => {
    const photo = scene.tapRec();
    if (!photo) { setNotice('아직 목표 원 밖이야. 원 안에 들어가면 REC 버튼이 빛나.'); audioService.playSfx('tap'); return; }
    setNotice(photo.quality === 'center' ? `${targetName(photo.id)} 정중앙 컷!` : `${targetName(photo.id)} 가장자리 컷. 원 한가운데서 누르면 정중앙이야.`);
    audioService.playSfx(photo.quality === 'center' ? 'clue' : 'record');
  };

  const retry = () => {
    setPhase('plan');
    setTelemetry(initialTelemetry);
    setNotice('경로를 남겨 뒀어. 다시 계획해도 잃는 건 없어. 점을 끌어 바람을 따라가거나 목표 한가운데로 옮겨 봐.');
    scene.resetFlight();
  };

  const stage = STAGE_META[0]!;
  const showResult = phase === 'review' && result;
  const task = phase === 'plan'
    ? waypoints.length < 2
      ? { action: `목표 이름을 눌러 지나갈 점을 ${2 - waypoints.length}개 더 놓아`, target: '왼쪽 목표 버튼' }
      : { action: '점과 바람 방향을 확인하고 출발해', target: '경로 확인 후 출발', done: true }
    : phase === 'flight'
      ? { action: '드론이 목표 원 안에 들어오면 바로 촬영해', target: '빛나는 REC 버튼' }
      : result?.passed
        ? { action: '촬영 성공! 아래에서 증거판으로 이동해', target: '증거판으로 가기', done: true }
        : { action: '놓친 목표를 확인하고 경로를 고쳐', target: '경로 고쳐 다시 비행' };

  return (
    <GameShell
      page={3}
      eyebrow="STAGE 1 · 드론 현장가"
      onNavigate={onNavigate}
      footer={completed && phase === 'review' ? (
        <StageComplete title="현장 사진 3장을 얻었어" message="사진은 증거판의 재료가 돼. 확대해서 모모와 루비가 어디로 갔을지 단서를 찾아보자. 배지는 증거판까지 끝내면 받아." nextLabel="증거판으로 가기" onNext={() => onNavigate(4)} />
      ) : undefined}
    >
      <div className={`game-grid game-grid--wide-center drone-layout${phase === 'plan' ? ' is-planning' : ''}`}>
        <Panel title="이번 미션" kicker="MISSION BRIEF">
          <MissionGuide
            image={pageAsset(4, 2)}
            imageAlt="드론 멘토"
            action="모모와 루비가 떠난 숲 가장자리에서 달라진 곳 3곳(벌목지·막힌 물길·공사장)을 찍어"
            goals={['지도에 지나갈 점 2~4개 놓기', '목표 원 안에서 REC 누르기 (한 바퀴!)']}
            goalImages={[pageAsset(4, 6), pageAsset(4, 3)]}
            reward={stage.reward}
            details={
              <>
                <div className="drone-map-key" aria-label="바람 안내">
                  <span className="is-danger">화살표 거슬러 = 맞바람 · 배터리 {DRAIN_MULTIPLIER.head}배</span><span className="is-wind">화살표 가로질러 = 옆바람 · 조금 더</span><span className="is-tail">화살표 따라 = 뒷바람 · 덜 닳음</span>
                </div>
                <div className={`replay-goal${precisionStamp ? ' is-stamped' : ''}`} role="status">
                  <strong>{precisionStamp ? '정밀 비행 도장 획득' : '갱신 목표 · 정밀 비행 도장'}</strong>
                  <span>배터리 {PRECISION_BATTERY}% 이상 남기고 3컷 모두 정중앙</span>
                </div>
              </>
            }
          />
          {precisionStamp && <span className="replay-stamp">정밀 비행 도장 획득</span>}
          {phase === 'plan' && (
            <div className="drone-plan-tools">
              <div className="drone-target-buttons" aria-label="목표 점 추가">
                {DRONE_TARGETS.map((target) => (
                  <button key={target.id} className="button button--ghost" disabled={full} onClick={() => addTargetPoint(target.id)}>{target.name}</button>
                ))}
              </div>
              <div className="row">
                <button className="button button--ghost" disabled={waypoints.length === 0} onClick={() => { savePlan(waypoints.slice(0, -1)); audioService.playSfx('tap'); }}>마지막 점 지우기</button>
                <button className="button button--ghost" disabled={waypoints.length === 0} onClick={() => { savePlan([]); audioService.playSfx('tap'); }}>모두 지우기</button>
              </div>
            </div>
          )}
          {phase === 'plan' && <div className="toast" role="status">{notice}</div>}
        </Panel>

        <div className="drone-center">
          <div className="scene-card drone-scene">
            <PhaserStage scene={scene} ariaLabel="푸른솔 숲 위 비행 지도. 바람 구간 3곳과 촬영 목표 3곳이 있고, 점을 놓아 경로를 만든다." />
            {telemetry.replayRemaining !== null && telemetry.replayRemaining > 0 && <div className="replay-badge" role="status">다시 보기 · {telemetry.replayRemaining.toFixed(1)}초</div>}
          </div>
          <Panel className="drone-controls" title="비행 조종" kicker={phase === 'flight' ? 'LIVE' : 'CONTROL'}>
            <TaskCue {...task} />
            <div className={`drone-control-row is-${phase}`}>
              {phase === 'flight' && <div className="direction-pad" aria-label="드론 미세 조종">
                <button type="button" aria-label="드론을 위로 조금 이동" onClick={() => scene.nudge(0, -.035)}><span aria-hidden="true">↑</span><strong>위</strong></button>
                <button type="button" aria-label="드론을 왼쪽으로 조금 이동" onClick={() => scene.nudge(-.035, 0)}><span aria-hidden="true">←</span><strong>왼쪽</strong></button>
                <button type="button" aria-label="드론을 아래로 조금 이동" onClick={() => scene.nudge(0, .035)}><span aria-hidden="true">↓</span><strong>아래</strong></button>
                <button type="button" aria-label="드론을 오른쪽으로 조금 이동" onClick={() => scene.nudge(.035, 0)}><span aria-hidden="true">→</span><strong>오른쪽</strong></button>
              </div>}
              {phase === 'plan' && <button className={`button button--primary button--large${waypoints.length >= 2 ? ' is-next-action' : ''}`} onClick={launch}>경로 확인 후 출발</button>}
              {phase === 'flight' && (
                <button className={`record-button${telemetry.recTarget ? ' is-window is-next-action' : ''}${telemetry.recCenter ? ' is-center' : ''}`} onClick={tapRec} disabled={telemetry.returning}>
                  <span />{telemetry.recTarget ? `REC · ${targetName(telemetry.recTarget)}` : 'REC'}
                </button>
              )}
              {phase === 'review' && (
                <div className="row drone-review-actions">
                  <button className="button button--teal" onClick={() => { scene.replay(); audioService.playSfx('tap'); }}>4초 다시 보기</button>
                  <button className="button button--primary" onClick={retry}>{result?.passed ? '다시 날아 도장 도전' : '경로 고쳐 다시 비행'}</button>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {phase !== 'plan' && (
          <Panel title={showResult ? '촬영 결과' : '드론 상태'} kicker={showResult ? 'REVIEW' : 'TELEMETRY'}>
            {!showResult ? (
              <div className="metric-grid">
                <ProgressBar value={telemetry.battery} label={`배터리 ${telemetry.battery}%`} />
                <div className={`telemetry-pair is-${telemetry.wind}`}><span>바람</span><strong>{WIND_LABEL[telemetry.wind]}{telemetry.wind !== 'calm' ? ` · ${DRAIN_MULTIPLIER[telemetry.wind]}배` : ''}</strong></div>
                <div className="target-checks">
                  <strong>촬영 목표</strong>
                  {DRONE_TARGETS.map((target) => {
                    const photo = telemetry.photos.find((item) => item.id === target.id);
                    return <div key={target.id} className={photo ? 'is-done' : ''}><span>{photo ? (photo.quality === 'center' ? '정중앙' : '가장자리') : '대기'}</span>{target.name}</div>;
                  })}
                </div>
              </div>
            ) : (
              <div className="drone-review">
                <div className={`review-total ${result.passed ? 'is-pass' : 'is-partial'}`}>
                  <span>{result.passed ? (result.precision ? '정밀 비행!' : '미션 완수') : result.batteryRemaining <= 0 ? '배터리 0 · 다시 계획하자' : '목표를 놓쳤어 · 다시 계획하자'}</span>
                  <strong>{result.batteryRemaining}<small>% 남음</small></strong>
                </div>
                <div className="photo-cards" aria-label="획득한 사진">
                  {DRONE_TARGETS.map((target) => {
                    const photo = result.photos.find((item) => item.id === target.id);
                    return (
                      <figure key={target.id} className={`photo-card${photo ? '' : ' is-missing'}`}>
                        <img src={photoAsset(target.id)} alt={`${target.name} 항공 사진`} />
                        <figcaption><strong>{target.name}</strong><span>{photo ? (photo.quality === 'center' ? '정중앙' : '가장자리') : '못 찍음'}</span></figcaption>
                      </figure>
                    );
                  })}
                </div>
                <div className="review-facts">
                  <span>바람 구간에 쓴 배터리</span>
                  <strong>{zones.map((zone, index) => `${index + 1}구간 ${Math.round(result.drainByZone[zone.id] ?? 0)}%`).join(' · ')}</strong>
                </div>
              </div>
            )}
            <div className={`toast${showResult && !result.passed ? ' toast--warning' : ''}`} role="status">{notice}</div>
          </Panel>
        )}
      </div>
    </GameShell>
  );
}

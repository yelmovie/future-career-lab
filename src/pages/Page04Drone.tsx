import Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PhaserStage } from '../components/PhaserStage';
import { audioService } from '../services/audioService';
import { pageAsset, v5Asset } from '../shared/assets';
import { CANVAS_FONT } from '../shared/constants';
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
import './page04-drone.css';

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
    this.load.image('drone-map', v5Asset('drone-map-wide'));
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
    const map = this.add.image(width / 2, height / 2, 'drone-map').setAlpha(.96);
    const mapScale = Math.min(width / map.width, height / map.height);
    map.setScale(mapScale);
    this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, .10);

    this.zones.forEach((zone) => {
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
      if (hot) this.add.text((zone.x + .01) * width, (zone.y + .01) * height, '여기서 배터리가 많이 닳았어', {
        fontFamily: FONT, fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#fff', backgroundColor: '#d94f43ee', padding: { x: 8, y: 4 },
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
    this.add.text(DRONE_START.x * width, DRONE_START.y * height + 26, '이륙장', { fontFamily: FONT, fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: '#fff', backgroundColor: '#25384fd8', padding: { x: 6, y: 3 } }).setOrigin(.5, 0).setDepth(4);

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
    this.add.text(18, 18, caption, { fontFamily: FONT, fontSize: CANVAS_FONT.label, fontStyle: 'bold', color: '#25384f', backgroundColor: '#ffffffee', padding: { x: 10, y: 6 } }).setOrigin(0, 0).setDepth(10);
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
  const [bubble, setBubble] = useState('지도 위 원 1, 2, 3을 차례로 눌러 점을 놓아. 화살표를 거슬러 가면 배터리가 빨리 닳아!');
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
    if (full) { setBubble(`점은 ${MAX_WAYPOINTS}개까지야. 점을 끌어서 옮기거나, 위쪽 '점 하나 지우기'를 눌러.`); audioService.playSfx('warning'); return; }
    savePlan([...waypoints, point]);
    setBubble(waypoints.length + 1 >= 3 ? '세 원 다 놓았어! 오른쪽 아래 노란 출발! 버튼을 눌러.' : waypoints.length + 1 === 2 ? '좋아, 하나 더! 세 번째 원도 눌러 점을 놓아.' : '점 하나 놓았어. 다음 원도 눌러 봐.');
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
      setBubble(value.precision ? '정밀 비행 도장! 세 컷 다 정중앙이야. 오른쪽 아래 버튼으로 증거판에 가자.' : '세 곳 다 찍었어! 오른쪽 아래 버튼을 눌러 사진을 증거판으로 가져가자.');
      audioService.playSfx(value.precision ? 'reward' : 'success');
      return;
    }
    if (value.batteryRemaining <= 0) {
      const worst = Object.entries(value.drainByZone).sort((a, b) => b[1] - a[1])[0];
      const zone = zones.find((item) => item.id === worst?.[0]);
      scene.highlight(zone?.id ?? null);
      setBubble('배터리가 먼저 떨어졌어. 빨간 구간을 피하도록 점을 끌어 옮기고, 다시 출발!을 눌러.');
    } else {
      setBubble('빨간 원을 놓쳤어. 그 점을 끌어서 원 한가운데에 놓고, 다시 출발!을 눌러.');
    }
    audioService.playSfx('warning');
  };

  useEffect(() => { scene.setPlan(waypoints); }, [scene, waypoints]);

  const launch = () => {
    setPhase('flight');
    setResult(null);
    setTelemetry(initialTelemetry);
    setBubble('드론이 원 안에 들어오면 아래 빨간 REC 버튼을 눌러!');
    scene.launch();
    audioService.playSfx('record');
  };

  const tapRec = () => {
    const photo = scene.tapRec();
    if (!photo) { setBubble('아직 원 밖이야. 드론이 원 안에 들어왔을 때 REC를 눌러.'); audioService.playSfx('tap'); return; }
    setBubble(photo.quality === 'center' ? `${targetName(photo.id)} 정중앙 컷!` : `${targetName(photo.id)} 찍었어. 한가운데면 더 좋아.`);
    audioService.playSfx(photo.quality === 'center' ? 'clue' : 'record');
  };

  const retry = () => {
    setPhase('plan');
    setTelemetry(initialTelemetry);
    setBubble('점을 끌어서 화살표 방향으로 돌게 옮기고, 다 되면 출발!을 눌러.');
    scene.resetFlight();
  };

  const step = phase === 'plan' ? 1 : phase === 'flight' ? 2 : 3;
  const instruction = phase === 'plan' ? '지도의 원 1·2·3을 눌러 점을 놓아' : phase === 'flight' ? '원 안에 들어오면 REC를 눌러' : result?.passed ? '사진 3장을 얻었어!' : completed ? '사진은 이미 있어. 다시 날아도 돼' : '놓친 곳을 보고 다시 계획해';
  const next = phase === 'plan'
    ? { label: '출발!', disabled: waypoints.length < 2, hint: '점을 2개 이상 놓으면 출발할 수 있어', onClick: launch }
    : phase === 'flight'
      ? { label: '비행 중…', disabled: true, hint: '드론이 돌아오면 결과가 나와', onClick: () => undefined }
      : completed || result?.passed
        ? { label: '증거판으로', onClick: () => onNavigate(4) }
        : { label: '다시 계획', onClick: retry };
  const shotCount = phase === 'flight' ? telemetry.photos.length : (result?.photos.length ?? 0);

  return (
    <StepShell
      page={3}
      step={step}
      steps={3}
      instruction={instruction}
      mentor={pageAsset(4, 2)}
      mentorName="드론 멘토"
      bubble={bubble}
      status={phase === 'plan' ? `점 ${waypoints.length}/${MAX_WAYPOINTS}` : `배터리 ${phase === 'flight' ? telemetry.battery : (result?.batteryRemaining ?? 0)}% · 사진 ${shotCount}/3`}
      next={next}
      onNavigate={onNavigate}
      className="drone-page"
      help={
        <div className="drone-help">
          <p className="flow-goal"><strong>목표</strong> 벌목지·막힌 물길·공사장 세 원을 한 바퀴에 지나가며 REC 로 찍어.</p>
          <div className="drone-map-key" aria-label="바람 안내">
            <span className="is-danger">화살표 거슬러 = 맞바람 · 배터리 {DRAIN_MULTIPLIER.head}배</span><span className="is-wind">화살표 가로질러 = 옆바람 · 조금 더</span><span className="is-tail">화살표 따라 = 뒷바람 · 덜 닳음</span>
          </div>
          <p className="flow-goal"><strong>도장</strong> 배터리 {PRECISION_BATTERY}% 이상 남기고 3컷 모두 정중앙이면 정밀 비행 도장.</p>
        </div>
      }
    >
      <div className={`drone-v4 is-${phase}`}>
        <div className="v4-card drone-v4__map">
          <PhaserStage scene={scene} ariaLabel="푸른솔 숲 위 비행 지도. 바람 구간 3곳과 촬영 목표 3곳이 있고, 점을 놓아 경로를 만든다." />
          {telemetry.replayRemaining !== null && telemetry.replayRemaining > 0 && <div className="replay-badge" role="status">다시 보기 · {telemetry.replayRemaining.toFixed(1)}초</div>}
          {phase === 'plan' && waypoints.length > 0 && (
            <div className="drone-v4__tools">
              <button type="button" className="button button--ghost button--small" onClick={() => { savePlan(waypoints.slice(0, -1)); audioService.playSfx('tap'); }}>점 하나 지우기</button>
              <button type="button" className="button button--ghost button--small" onClick={() => { savePlan([]); audioService.playSfx('tap'); }}>모두 지우기</button>
            </div>
          )}
          {phase === 'flight' && (
            <>
              <div className="direction-pad drone-v4__pad" aria-label="드론 미세 조종">
                <button type="button" aria-label="드론을 위로 조금 이동" onClick={() => scene.nudge(0, -.035)}><span aria-hidden="true">↑</span><strong>위</strong></button>
                <button type="button" aria-label="드론을 왼쪽으로 조금 이동" onClick={() => scene.nudge(-.035, 0)}><span aria-hidden="true">←</span><strong>왼쪽</strong></button>
                <button type="button" aria-label="드론을 아래로 조금 이동" onClick={() => scene.nudge(0, .035)}><span aria-hidden="true">↓</span><strong>아래</strong></button>
                <button type="button" aria-label="드론을 오른쪽으로 조금 이동" onClick={() => scene.nudge(.035, 0)}><span aria-hidden="true">→</span><strong>오른쪽</strong></button>
              </div>
              <button className={`record-button drone-v4__rec${telemetry.recTarget ? ' is-window is-next-action' : ''}${telemetry.recCenter ? ' is-center' : ''}`} onClick={tapRec} disabled={telemetry.returning}>
                <span />{telemetry.recTarget ? `REC · ${targetName(telemetry.recTarget)}` : 'REC'}
              </button>
            </>
          )}
        </div>
        {phase === 'review' && result && (
          <div className="v4-card drone-v4__review">
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
            <div className="drone-v4__review-actions">
              {precisionStamp && <span className="replay-stamp">정밀 비행 도장</span>}
              <button className="button button--ghost button--small" onClick={() => { scene.replay(); audioService.playSfx('tap'); }}>4초 다시 보기</button>
              {result.passed && <button className="button button--ghost button--small" onClick={retry}>다시 날아 도장 도전</button>}{!result.passed && completed && <button className="button button--ghost button--small" onClick={retry}>다시 계획</button>}
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}

import Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { TapIcon } from '../components/Icons';
import { PhaserStage } from '../components/PhaserStage';
import { audioService } from '../services/audioService';
import { pageAsset, v5Asset } from '../shared/assets';
import { CANVAS_FONT } from '../shared/constants';
import type { PageNumber, PhotoId } from '../shared/types';
import { useGame } from '../state/GameContext';
import { droneReplayPosition, droneRoute } from './page04DroneRoute';
import {
  DRAIN_MULTIPLIER,
  DRONE_SPEED,
  DRONE_START,
  DRONE_TARGETS,
  MAX_WAYPOINTS,
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
  destination: string;
}

const initialTelemetry: DroneTelemetry = { battery: 100, wind: 'calm', recTarget: null, recCenter: false, photos: [], returning: false, replayRemaining: null, destination: '' };
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

/** 마지막 점은 다음 점으로 이어 가며 원을 지나지 않으니, 착륙 전에 더 오래 떠 있는다. */
const LAST_DWELL_MS = 2600;
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
  private flownStops: DronePoint[] = [];
  private returningFrom: DronePoint | null = null;
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

    // 마지막 점에서는 착륙 전에 제자리 비행 — 배터리는 안 닳고, REC 창이 다른 점만큼 넉넉히 열린다.
    const hoveringAtLast = this.mode === 'flight' && this.dwellRemaining > 0 && this.segmentIndex >= this.waypoints.length - 1;
    if (this.battery > 0 && !hoveringAtLast) {
      const drain = batteryDrain(this.position, this.heading, this.zones, dt);
      const { zone } = windRelation(this.position, this.heading, this.zones);
      if (zone) this.drainByZone[zone.id] = (this.drainByZone[zone.id] ?? 0) + drain;
      this.battery = Math.max(0, this.battery - drain);
      if (this.battery <= 0 && this.mode === 'flight') this.beginReturn();
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
        this.flownStops.push({ ...goal });
        this.dwellRemaining = this.segmentIndex >= this.waypoints.length - 1 ? LAST_DWELL_MS : REC_DWELL_MS;
      } else {
        this.position = { x: this.position.x + this.heading.x * step, y: this.position.y + this.heading.y * step };
      }
    } else {
      // 마지막 점까지 갔으면 끝. 놓친 목표는 다시 계획해서 날아야 한다(두 번째 바퀴 없음).
      this.beginReturn();
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
    this.flownStops = [];
    this.returningFrom = null;
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
    this.recTarget = null;
    this.drawMap(); // 배지 ✓ · 초록 이름표까지 바로 바뀌게 전체 다시 그림
    this.emitTelemetry();
    return photo;
  }

  resetFlight() {
    this.mode = 'plan';
    this.position = { ...DRONE_START };
    this.heading = STILL;
    this.highlightZone = null;
    this.returningFrom = null;
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

  private beginReturn() {
    this.mode = 'return';
    this.returningFrom = { ...this.position };
    // 배터리 부족으로 돌아갈 때도 마지막으로 실제 비행한 지점부터 복귀선을 그린다.
    const last = this.flownStops.at(-1) ?? DRONE_START;
    if (distance(last, this.position) > 1e-6) this.flownStops.push({ ...this.position });
    this.dwellRemaining = 0;
    this.recTarget = null;
    this.drawMap();
    this.emitTelemetry();
  }

  private route() {
    return droneRoute(this.returningFrom ? this.flownStops : this.waypoints);
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
      ring.setFillStyle(open ? 0xff6f61 : 0xffc53d, open ? .32 : .16).setStrokeStyle(open ? 5 : 3, 0xffffff, .95);
    }
  }

  /**
   * 논리 좌표(0~1)는 캔버스가 아니라 지도 그림(contain) 사각형 기준이다.
   * 캔버스 비율이 모드마다 달라도 목표 원·바람 구간이 그림 속 벌목지·물길·공사장 위에 그대로 붙는다.
   */
  private mapRect() {
    const width = Math.max(320, this.scale.width);
    const height = Math.max(300, this.scale.height);
    const source = this.textures.get('drone-map').getSourceImage() as { width: number; height: number };
    const scale = Math.min(width / source.width, height / source.height);
    const w = source.width * scale; const h = source.height * scale;
    return { left: (width - w) / 2, top: (height - h) / 2, w, h };
  }
  private toPx(point: DronePoint) { const m = this.mapRect(); return { x: m.left + point.x * m.w, y: m.top + point.y * m.h }; }
  private toFrac(x: number, y: number): DronePoint {
    const m = this.mapRect();
    return { x: Phaser.Math.Clamp((x - m.left) / m.w, .04, .96), y: Phaser.Math.Clamp((y - m.top) / m.h, .06, .94) };
  }

  private handleMapPointer(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) {
    if (this.mode !== 'plan' || over.length > 0) return;
    this.callbacks.addWaypoint(this.toFrac(pointer.x, pointer.y));
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
    const m = this.mapRect();
    map.setDisplaySize(m.w, m.h);
    this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, .10);
    const px = (point: DronePoint) => this.toPx(point);

    // 지도에는 실제 비행 방향만 표시한다. 풍향은 위쪽 안내 줄에서 촬영점 번호와 함께 읽는다.
    const PAL = { gold: 0xffc53d, green: 0x35c48a, coral: 0xff6f61, ink: '#25384f', route: 0x2166d1, home: 0x087b78 };
    const hotZone = this.zones.find((zone) => zone.id === this.highlightZone);
    if (hotZone) {
      const center = px({ x: hotZone.x + hotZone.width / 2, y: hotZone.y + hotZone.height / 2 });
      this.add.ellipse(center.x, center.y, hotZone.width * m.w, hotZone.height * m.h, PAL.coral, .2).setStrokeStyle(3, PAL.coral, .9).setDepth(1);
    }

    DRONE_TARGETS.forEach((target, index) => {
      const done = this.photos.has(target.id);
      const missed = !done && this.mode === 'review';
      const radius = REC_RADIUS * m.h;
      const { x: cx, y: cy } = px(target);
      const fill = done ? PAL.green : missed ? PAL.coral : PAL.gold;
      const ring = this.add.circle(cx, cy, radius, fill, done ? .34 : missed ? .26 : .16).setStrokeStyle(3, 0xffffff, .95).setDepth(5);
      this.rings.set(target.id, ring);
      // 원 위 번호 배지 — 지시문 "원 1·2·3" 과 같은 숫자. 찍으면 초록 ✓, 놓치면 산호.
      const badgeY = cy - radius - 4;
      this.add.circle(cx, badgeY, 22, done ? PAL.green : missed ? PAL.coral : PAL.gold, 1).setStrokeStyle(4, 0xffffff, 1).setDepth(9);
      this.add.text(cx, badgeY, done ? '✓' : String(index + 1), {
        fontFamily: FONT, fontSize: CANVAS_FONT.head, fontStyle: 'bold', color: done || missed ? '#ffffff' : '#3a2a00',
      }).setOrigin(.5, .54).setDepth(10);
      // 이름표는 원 아래, 점 마커에 가려지지 않게
      this.add.text(cx, cy + radius + 6, `${target.name}${done ? ' · 찍음' : missed ? ' · 놓침' : ''}`, {
        fontFamily: FONT, fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: done ? '#ffffff' : missed ? '#ffffff' : PAL.ink,
        backgroundColor: done ? '#219968ee' : missed ? '#d94f43ee' : '#ffffffee', padding: { x: 8, y: 4 },
      }).setOrigin(.5, 0).setDepth(9);
    });

    const start = px(DRONE_START);
    this.add.circle(start.x, start.y, 22, 0xffffff, .55).setStrokeStyle(3, PAL.route, .95).setDepth(4);
    this.add.text(start.x, start.y + 26, '이륙장', { fontFamily: FONT, fontSize: CANVAS_FONT.cap, fontStyle: 'bold', color: PAL.ink, backgroundColor: '#ffffffee', padding: { x: 8, y: 4 } }).setOrigin(.5, 0).setDepth(4);

    if (this.waypoints.length > 0) {
      const route = this.route();
      // 복귀선을 먼저 그려 촬영 경로와 겹치는 곳에서도 실선·점선이 구별된다.
      [...route].sort((a, b) => Number(b.returning) - Number(a.returning)).forEach((leg) => {
        const from = px(leg.from); const to = px(leg.to);
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const direction = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
        const color = leg.returning ? PAL.home : PAL.route;
        const line = this.add.graphics().setDepth(6);
        const trace = (stroke: number, tint: number) => {
          line.lineStyle(stroke, tint, .96);
          if (!leg.returning) { line.lineBetween(from.x, from.y, to.x, to.y); return; }
          for (let offset = 0; offset < length; offset += 22) {
            const end = Math.min(offset + 13, length);
            line.lineBetween(from.x + direction.x * offset, from.y + direction.y * offset, from.x + direction.x * end, from.y + direction.y * end);
          }
        };
        trace(9, 0xffffff); trace(4, color);
        if (length > 48) {
          const ratio = leg.returning ? .35 : .5;
          const x = from.x + (to.x - from.x) * ratio; const y = from.y + (to.y - from.y) * ratio;
          const arrow = this.add.graphics().setDepth(7);
          arrow.lineStyle(8, 0xffffff, 1).fillStyle(0xffffff, 1);
          this.drawArrow(arrow, x, y, direction, 14);
          arrow.lineStyle(4, color, 1).fillStyle(color, 1);
          this.drawArrow(arrow, x, y, direction, 10);
        }
      });
      (this.returningFrom ? this.flownStops : this.waypoints).forEach((point, index) => {
        // 점 마커: 숫자 없이 흰 원 + 파란 테. 번호는 목표 원 위 배지 하나로만 읽는다.
        const dp = px(point);
        const dot = this.add.circle(dp.x, dp.y, 18, 0xffffff, 1).setStrokeStyle(5, PAL.route, 1).setDepth(8);
        if (this.mode === 'plan') {
          dot.setInteractive({ useHandCursor: true, draggable: true, hitArea: new Phaser.Geom.Circle(18, 18, 26), hitAreaCallback: Phaser.Geom.Circle.Contains });
          dot.on(Phaser.Input.Events.GAMEOBJECT_DRAG, (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => { dot.setPosition(dragX, dragY); });
          dot.on(Phaser.Input.Events.GAMEOBJECT_DRAG_END, () => this.callbacks.moveWaypoint(index, this.toFrac(dot.x, dot.y)));
        }
      });
    }

    const caption = this.mode === 'plan' ? '이륙장 → 1 → 2 → 3 → 이륙장 복귀' : this.mode === 'replay' ? '촬영부터 복귀까지 · 4초 다시 보기' : this.mode === 'return' ? '청록 점선을 따라 이륙장으로 복귀' : this.mode === 'review' ? '이륙장 복귀 완료' : '파란 실선을 따라 촬영점으로 이동';
    this.add.text(18, 18, caption, { fontFamily: FONT, fontSize: CANVAS_FONT.label, fontStyle: 'bold', color: '#25384f', backgroundColor: '#ffffffee', padding: { x: 10, y: 6 } }).setOrigin(0, 0).setDepth(10);
    this.droneImage = this.add.image(0, 0, 'drone-craft').setDisplaySize(78, 78).setDepth(12);
    this.positionDrone();
  }

  private positionDrone() {
    const q = this.toPx(this.position);
    this.droneImage?.setPosition(q.x, q.y);
  }

  private emitTelemetry(replayRemaining: number | null = null) {
    const destination = this.mode === 'flight' ? this.waypoints[this.segmentIndex] : null;
    const target = destination ? DRONE_TARGETS.find((item) => distance(item, destination) <= REC_RADIUS) : null;
    this.callbacks.telemetry({
      battery: Math.round(this.battery), wind: windRelation(this.position, this.heading, this.zones).relation, recTarget: this.recTarget,
      recCenter: recQuality(this.recDistance) === 'center', photos: [...this.photos].map(([id, quality]) => ({ id, quality })),
      returning: this.mode === 'return', replayRemaining,
      destination: this.mode === 'return' ? '이륙장으로 복귀 중' : destination ? `${target ? `${DRONE_TARGETS.indexOf(target) + 1} ${target.name}` : `경로점 ${this.segmentIndex + 1}`}으로 이동 중` : '',
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
    this.position = droneReplayPosition(this.route(), this.replayElapsed / 4000);
    this.positionDrone();
    this.emitTelemetry(Math.max(0, 4 - this.replayElapsed / 1000));
    if (this.replayElapsed >= 4000) { this.mode = 'review'; this.drawMap(); this.emitTelemetry(0); }
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
  const [bubble, setBubble] = useState('원 1, 2, 3을 차례로 눌러 점을 놓아. 파란 선을 따라 날고, 마지막에는 청록 점선을 따라 이륙장으로 돌아와.');
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
    setBubble(waypoints.length + 1 >= 3 ? '세 촬영점이 파란 선으로 이어졌는지 확인해. 다 됐으면 오른쪽 아래 출발! 버튼을 눌러.' : waypoints.length + 1 === 2 ? '좋아, 하나 더! 세 번째 원도 눌러 점을 놓아.' : '점 하나 놓았어. 다음 원도 눌러 봐.');
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
    setBubble('점을 끌어 경로를 바꿀 수 있어. 위쪽 바람 안내를 보고 경로를 정한 뒤 출발!을 눌러.');
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
            <span className="is-danger">바람을 거슬러 = 맞바람 · 배터리 {DRAIN_MULTIPLIER.head}배</span><span className="is-wind">바람을 가로질러 = 옆바람 · 조금 더</span><span className="is-tail">바람을 따라 = 뒷바람 · 덜 닳음</span>
          </div>
          <p className="flow-goal">지도 위 화살표는 드론의 이동 방향이야. 파란 실선은 촬영 경로, 청록 점선은 이륙장으로 돌아오는 길이야. 바람은 지도 위쪽 안내에서 촬영점 번호별로 확인해.</p>
          <p className="flow-goal"><strong>도장</strong> 배터리 {PRECISION_BATTERY}% 이상 남기고 3컷 모두 정중앙이면 정밀 비행 도장.</p>
        </div>
      }
    >
      <div className={`drone-v4 is-${phase}`}>
        <div className="v4-card drone-v4__map">
          <div className="drone-v4__map-key">
            <div className="drone-v4__route-key" aria-label="비행 경로 안내">
              <span><i aria-hidden="true" />이동</span>
              <span className="is-return"><i aria-hidden="true" />자동 복귀</span>
            </div>
            <div className="drone-v4__wind-key" aria-label="촬영점별 바람 방향">
              <strong>바람</strong>
              {zones.map((zone, index) => {
                const arrow = zone.wind.x < 0 ? '←' : zone.wind.y < 0 ? '↑' : '↓';
                const direction = zone.wind.x < 0 ? '왼쪽' : zone.wind.y < 0 ? '위쪽' : '아래쪽';
                return <span key={zone.id} aria-label={`${index + 1} ${DRONE_TARGETS[index]!.name} 바람 ${direction}`}><b>{index + 1}</b><span aria-hidden="true">{arrow}</span></span>;
              })}
            </div>
          </div>
          <PhaserStage scene={scene} ariaLabel="푸른솔 숲 위 비행 지도. 이륙장에서 1 벌목지, 2 막힌 물길, 3 공사장 순으로 점을 놓아 경로를 만든다. 파란 실선은 이동, 청록 점선은 이륙장 복귀 방향이다." />
          {telemetry.replayRemaining !== null && telemetry.replayRemaining > 0 && <div className="replay-badge" role="status">다시 보기 · {telemetry.replayRemaining.toFixed(1)}초</div>}
          {phase === 'plan' && waypoints.length > 0 && (
            <div className="drone-v4__tools">
              <button type="button" className="button button--ghost button--small" onClick={() => { savePlan(waypoints.slice(0, -1)); audioService.playSfx('tap'); }}>점 하나 지우기</button>
              <button type="button" className="button button--ghost button--small" onClick={() => { savePlan([]); audioService.playSfx('tap'); }}>모두 지우기</button>
            </div>
          )}
          {phase === 'flight' && (
            <div className="drone-v4__flight-controls" aria-label="드론 비행 조작">
              <p className="drone-v4__flight-status" role="status">{telemetry.destination}</p>
              {telemetry.recTarget && !telemetry.returning && (
                <span className="drone-v4__tap" aria-hidden="true">
                  <span className="drone-v4__tap-pill">{telemetry.recCenter ? '한가운데! 지금 눌러' : '원 안이야, REC 눌러'}</span>
                  <TapIcon />
                </span>
              )}
              <button className={`record-button drone-v4__rec${telemetry.recTarget ? ' is-window is-next-action' : ''}${telemetry.recCenter ? ' is-center' : ''}`} onClick={tapRec} disabled={telemetry.returning}>
                <span />{telemetry.recTarget ? `REC · ${targetName(telemetry.recTarget)}` : 'REC'}
              </button>
            </div>
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

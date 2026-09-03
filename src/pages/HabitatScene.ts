import Phaser from 'phaser';
import { sample3d } from '../shared/assets';
import { CANVAS_FONT } from '../shared/constants';
import {
  BEHAVIOR_LABELS,
  evaluateHabitat,
  evaluateSimulation,
  HABITAT_ITEMS,
  LOUD_BAND,
  type Behavior,
  type HabitatConditions,
  type HabitatItemId,
  type HabitatPlacement,
  type HabitatSimulationResult,
} from './habitatModel';

interface HabitatSceneOptions {
  onChange: (placements: HabitatPlacement[]) => void;
  onSelect: (instanceId: string | null) => void;
}

interface BoardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class HabitatScene extends Phaser.Scene {
  private readonly callbacks: HabitatSceneOptions;
  private placements: HabitatPlacement[] = [];
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private grid?: Phaser.GameObjects.Graphics;
  private routeGraphics?: Phaser.GameObjects.Graphics;
  private selectionGraphics?: Phaser.GameObjects.Graphics;
  private entranceLabel?: Phaser.GameObjects.Text;
  private loudLabel?: Phaser.GameObjects.Text;
  private selectedId: string | null = null;
  private readyForCommands = false;
  private simulating = false;
  private counter = 0;
  private pending: (() => void)[] = [];

  constructor(options: HabitatSceneOptions) {
    super({ key: 'habitat-builder' });
    this.callbacks = options;
  }

  preload() {
    Object.values(HABITAT_ITEMS).forEach((item) => this.load.image(`habitat-${item.id}`, item.image));
    this.load.image('habitat-parrot', sample3d(1));
  }

  create() {
    this.grid = this.add.graphics();
    this.routeGraphics = this.add.graphics();
    this.selectionGraphics = this.add.graphics();
    this.entranceLabel = this.add.text(0, 0, '출입 안전선', {
      fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
      fontSize: CANVAS_FONT.cap,
      fontStyle: 'bold',
      color: '#f7e9c9',
      backgroundColor: '#6f322dcc',
      padding: { x: 7, y: 4 },
    }).setOrigin(0.5);
    this.loudLabel = this.add.text(0, 0, '복도 쪽 · 시끄러움', {
      fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
      fontSize: CANVAS_FONT.cap,
      fontStyle: 'bold',
      color: '#f7e9c9',
      backgroundColor: '#5a3a7acc',
      padding: { x: 7, y: 4 },
    }).setOrigin(1, 0);

    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
      if (this.simulating) return;
      this.selectInstance(gameObject.getData('instanceId') as string);
      gameObject.setDepth(20);
    });
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image, dragX: number, dragY: number) => {
      if (this.simulating) return;
      const instanceId = gameObject.getData('instanceId') as string;
      const placement = this.placements.find((item) => item.instanceId === instanceId);
      if (!placement) return;
      const board = this.getBoardRect();
      const normalized = this.screenToBoard(dragX, dragY, board);
      placement.x = normalized.x;
      placement.y = normalized.y;
      this.clampPlacement(placement);
      this.layoutItems(false);
    });
    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Image) => {
      if (this.simulating) return;
      const instanceId = gameObject.getData('instanceId') as string;
      const placement = this.placements.find((item) => item.instanceId === instanceId);
      if (!placement) return;
      placement.x = Math.round(placement.x / 5) * 5;
      placement.y = Math.round(placement.y / 5) * 5;
      this.clampPlacement(placement);
      gameObject.setDepth(5);
      this.layoutItems(true);
      this.emitChange();
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutAll, this);
    this.readyForCommands = true;
    this.layoutAll();
    const queued = this.pending;
    this.pending = [];
    queued.forEach((command) => command());
  }

  private runOrQueue(command: () => void) {
    if (this.readyForCommands) command();
    else this.pending.push(command);
  }

  private getBoardRect(): BoardRect {
    const width = Math.max(320, this.scale.width);
    const height = Math.max(280, this.scale.height);
    return { left: 30, top: 28, width: width - 60, height: height - 56 };
  }

  private screenToBoard(x: number, y: number, board = this.getBoardRect()) {
    return {
      x: Phaser.Math.Clamp(((x - board.left) / board.width) * 100, 0, 100),
      y: Phaser.Math.Clamp(((y - board.top) / board.height) * 70, 0, 70),
    };
  }

  private boardToScreen(placement: { x: number; y: number }, board = this.getBoardRect()) {
    return {
      x: board.left + (placement.x / 100) * board.width,
      y: board.top + (placement.y / 70) * board.height,
    };
  }

  private clampPlacement(placement: HabitatPlacement) {
    const item = HABITAT_ITEMS[placement.itemId];
    const rotated = Math.abs(Math.round(placement.rotation / 90)) % 2 === 1;
    const width = rotated ? item.height : item.width;
    const height = rotated ? item.width : item.height;
    placement.x = Phaser.Math.Clamp(placement.x, width / 2, 100 - width / 2);
    placement.y = Phaser.Math.Clamp(placement.y, height / 2, 70 - height / 2);
  }

  private drawBoard() {
    if (!this.grid) return;
    const board = this.getBoardRect();
    this.grid.clear();
    this.grid.fillStyle(0x071b2e, 0.92).fillRoundedRect(board.left, board.top, board.width, board.height, 18);
    this.grid.lineStyle(2, 0xe4a63c, 0.78).strokeRoundedRect(board.left, board.top, board.width, board.height, 18);
    this.grid.lineStyle(1, 0x4acfc5, 0.13);
    for (let x = 10; x < 100; x += 10) {
      const screenX = board.left + (x / 100) * board.width;
      this.grid.lineBetween(screenX, board.top, screenX, board.top + board.height);
    }
    for (let y = 10; y < 70; y += 10) {
      const screenY = board.top + (y / 70) * board.height;
      this.grid.lineBetween(board.left, screenY, board.left + board.width, screenY);
    }
    const entranceLeft = board.left;
    const entranceTop = board.top + (34 / 70) * board.height;
    const entranceWidth = board.width * .2;
    const entranceHeight = board.height * (32 / 70);
    this.grid.fillStyle(0xd64535, 0.22).fillRect(entranceLeft, entranceTop, entranceWidth, entranceHeight);
    this.grid.lineStyle(2, 0xf2766a, 0.72).strokeRect(entranceLeft, entranceTop, entranceWidth, entranceHeight);
    this.entranceLabel?.setPosition(entranceLeft + entranceWidth / 2, entranceTop + entranceHeight / 2).setDepth(1);
    const loudHeight = board.height * (LOUD_BAND / 70);
    this.grid.fillStyle(0x8a5cc4, 0.14).fillRect(board.left + entranceWidth, board.top, board.width - entranceWidth, loudHeight);
    this.grid.lineStyle(2, 0xb89ae6, 0.55).lineBetween(board.left + entranceWidth, board.top + loudHeight, board.left + board.width, board.top + loudHeight);
    this.loudLabel?.setPosition(board.left + board.width - 8, board.top + 6).setDepth(1);
  }

  private createView(placement: HabitatPlacement) {
    const view = this.add.image(0, 0, `habitat-${placement.itemId}`)
      .setDepth(5)
      .setData('instanceId', placement.instanceId)
      .setInteractive({ useHandCursor: true });
    this.input.setDraggable(view);
    view.on('pointerdown', () => this.selectInstance(placement.instanceId));
    this.views.set(placement.instanceId, view);
  }

  private layoutItems(animate: boolean) {
    const board = this.getBoardRect();
    const evaluation = evaluateHabitat(this.placements);
    const colliding = new Set(evaluation.collisionPairs.flat());
    this.placements.forEach((placement) => {
      const view = this.views.get(placement.instanceId);
      if (!view) return;
      const item = HABITAT_ITEMS[placement.itemId];
      const point = this.boardToScreen(placement, board);
      const displayWidth = (item.width / 100) * board.width;
      const displayHeight = (item.height / 70) * board.height;
      view.setDisplaySize(displayWidth, displayHeight).setAngle(placement.rotation);
      if (animate) this.tweens.add({ targets: view, x: point.x, y: point.y, duration: 130, ease: 'Sine.Out' });
      else view.setPosition(point.x, point.y);
      if (colliding.has(placement.instanceId)) view.setTint(0xff7f73);
      else if (this.selectedId === placement.instanceId) view.setTint(0x8afff3);
      else view.clearTint();
    });
    this.drawSelection();
  }

  private drawSelection() {
    if (!this.selectionGraphics) return;
    this.selectionGraphics.clear();
    if (!this.selectedId) return;
    const view = this.views.get(this.selectedId);
    if (!view) return;
    const bounds = view.getBounds();
    this.selectionGraphics.lineStyle(3, 0x76e9e0, 0.95).strokeRoundedRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10, 10);
    this.selectionGraphics.setDepth(19);
  }

  private layoutAll() {
    this.drawBoard();
    this.layoutItems(false);
  }

  private emitChange() {
    this.callbacks.onChange(this.placements.map((placement) => ({ ...placement })));
  }

  addItem(itemId: HabitatItemId) {
    this.runOrQueue(() => {
      if (this.placements.some((placement) => placement.itemId === itemId)) return;
      const positions = [{ x: 29, y: 19 }, { x: 43, y: 50 }, { x: 66, y: 23 }, { x: 79, y: 53 }];
      const position = positions[this.placements.length % positions.length] ?? positions[0]!;
      this.counter += 1;
      const placement: HabitatPlacement = { instanceId: `${itemId}-${this.counter}`, itemId, x: position.x, y: position.y, rotation: 0 };
      this.clampPlacement(placement);
      this.placements.push(placement);
      this.createView(placement);
      this.selectInstance(placement.instanceId);
      this.layoutItems(true);
      this.emitChange();
    });
  }

  loadPlacements(placements: HabitatPlacement[]) {
    this.runOrQueue(() => {
      this.views.forEach((view) => view.destroy());
      this.views.clear();
      this.placements = placements.map((placement) => ({ ...placement }));
      this.placements.forEach((placement) => {
        this.clampPlacement(placement);
        this.createView(placement);
      });
      this.selectedId = this.placements[0]?.instanceId ?? null;
      this.callbacks.onSelect(this.selectedId);
      this.routeGraphics?.clear();
      this.layoutItems(false);
      this.emitChange();
    });
  }

  selectInstance(instanceId: string | null) {
    this.selectedId = instanceId && this.placements.some((placement) => placement.instanceId === instanceId) ? instanceId : null;
    this.callbacks.onSelect(this.selectedId);
    this.layoutItems(false);
  }

  rotateSelected() {
    this.runOrQueue(() => {
      const placement = this.placements.find((item) => item.instanceId === this.selectedId);
      if (!placement) return;
      placement.rotation = (placement.rotation + 90) % 360;
      this.clampPlacement(placement);
      this.layoutItems(true);
      this.emitChange();
    });
  }

  nudgeSelected(dx: number, dy: number) {
    this.runOrQueue(() => {
      const placement = this.placements.find((item) => item.instanceId === this.selectedId);
      if (!placement) return;
      placement.x = Math.round((placement.x + dx) / 5) * 5;
      placement.y = Math.round((placement.y + dy) / 5) * 5;
      this.clampPlacement(placement);
      this.layoutItems(true);
      this.emitChange();
    });
  }

  removeSelected() {
    this.runOrQueue(() => {
      if (!this.selectedId) return;
      this.views.get(this.selectedId)?.destroy();
      this.views.delete(this.selectedId);
      this.placements = this.placements.filter((placement) => placement.instanceId !== this.selectedId);
      this.selectedId = this.placements[0]?.instanceId ?? null;
      this.callbacks.onSelect(this.selectedId);
      this.routeGraphics?.clear();
      this.layoutItems(false);
      this.emitChange();
    });
  }

  clearLayout() {
    this.loadPlacements([]);
  }

  runSimulation(conditions: HabitatConditions): Promise<HabitatSimulationResult> {
    const result = evaluateSimulation(this.placements, conditions);
    if (!this.readyForCommands || this.placements.length === 0 || this.simulating) return Promise.resolve(result);
    this.simulating = true;
    const board = this.getBoardRect();
    const ordered = [...this.placements].sort((a, b) => a.x - b.x);
    const behaviorOf = (placement: HabitatPlacement): Behavior => {
      const categories = HABITAT_ITEMS[placement.itemId].categories;
      return categories.includes('water') ? 'eat' : categories.includes('activity') ? 'play' : 'rest';
    };
    const stops = [{ point: this.boardToScreen({ x: 15, y: 50 }, board), behavior: null as Behavior | null }, ...ordered.map((placement) => ({ point: this.boardToScreen(placement, board), behavior: behaviorOf(placement) }))];
    this.routeGraphics?.clear().lineStyle(4, 0x58ddd1, 0.46);
    stops.slice(1).forEach((stop, index) => {
      const previous = stops[index];
      if (previous) this.routeGraphics?.lineBetween(previous.point.x, previous.point.y, stop.point.x, stop.point.y);
    });
    this.routeGraphics?.setDepth(2);
    const start = stops[0]?.point ?? { x: board.left, y: board.top + board.height / 2 };
    const parrot = this.add.image(start.x, start.y, 'habitat-parrot').setDisplaySize(58, 58).setDepth(30).setTint(0x8afff3);
    const labels: Phaser.GameObjects.Text[] = [];

    return new Promise((resolve) => {
      let index = 1;
      const next = () => {
        const stop = stops[index];
        if (!stop) {
          this.time.delayedCall(700, () => {
            parrot.destroy();
            labels.forEach((label) => label.destroy());
            this.simulating = false;
            resolve(result);
          });
          return;
        }
        this.tweens.add({
          targets: parrot,
          x: stop.point.x,
          y: stop.point.y,
          angle: index % 2 ? 4 : -4,
          duration: 620,
          ease: 'Sine.InOut',
          onComplete: () => {
            if (stop.behavior) {
              const seen = result.behaviors[stop.behavior];
              labels.push(this.add.text(stop.point.x, stop.point.y - 40, seen ? BEHAVIOR_LABELS[stop.behavior] : `${BEHAVIOR_LABELS[stop.behavior]} 안 함`, {
                fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
                fontSize: CANVAS_FONT.label,
                fontStyle: 'bold',
                color: seen ? '#041b1c' : '#f7e9c9',
                backgroundColor: seen ? '#8afff3ee' : '#8b2e28ee',
                padding: { x: 7, y: 4 },
              }).setOrigin(0.5).setDepth(31));
            }
            index += 1;
            this.time.delayedCall(stop.behavior ? 420 : 0, next);
          },
        });
      };
      next();
    });
  }
}

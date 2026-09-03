import type { AudioSettings, PageNumber } from '../shared/types';

const BGM_BY_PAGE: Record<PageNumber, string> = {
  1: 'main',
  2: 'main',
  3: 'stage1',
  4: 'stage1',
  5: 'stage2',
  6: 'stage2',
  7: 'stage3',
  8: 'stage4',
  9: 'stage5',
  10: 'main',
  11: 'main',
};

const SFX_PATHS = {
  tap: '/audio/sfx/ui-click-soft.mp3',
  swipe: '/audio/sfx/ui-swipe-soft.mp3',
  clue: '/audio/sfx/clue-found-glass-ping.mp3',
  drop: '/audio/sfx/drag-drop.mp3',
  warning: '/audio/sfx/warning-soft.mp3',
  record: '/audio/sfx/record-start-beep.mp3',
  success: '/audio/sfx/stage-success-chime.mp3',
  reward: '/audio/sfx/final-reward.mp3',
  // v2 단서 소리 — 파일이 없으면 play() 가 거부되고 조용히 무시된다.
  parrotCall: '/audio/v2/parrot-call.mp3',
  parrotAlarm: '/audio/v2/parrot-alarm.mp3',
  chainsaw: '/audio/v2/chainsaw-far.mp3',
  droneLoop: '/audio/v2/drone-loop.mp3',
} as const;

export type SfxId = keyof typeof SFX_PATHS;

class AudioService {
  private bgm: HTMLAudioElement | null = null;
  private settings: AudioSettings = { bgmVolume: 0.28, sfxVolume: 0.7, muted: false };
  private activeTrack = '';
  private unlocked = false;
  private ducked = false;
  private duckTimer = 0;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (!this.bgm) return;
      if (document.hidden) this.bgm.pause();
      else if (this.unlocked && !this.settings.muted) void this.bgm.play().catch(() => undefined);
    });
  }

  unlock(): void {
    this.unlocked = true;
    if (this.bgm && !this.settings.muted) void this.bgm.play().catch(() => undefined);
  }

  private bgmVolume(): number {
    if (this.settings.muted) return 0;
    return this.settings.bgmVolume * (this.ducked ? 0.3 : 1);
  }

  configure(settings: AudioSettings): void {
    this.settings = settings;
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume();
      if (settings.muted) this.bgm.pause();
      else if (this.unlocked) void this.bgm.play().catch(() => undefined);
    }
  }

  playPageBgm(page: PageNumber): void {
    const track = BGM_BY_PAGE[page];
    if (this.activeTrack === track) return;
    this.activeTrack = track;
    this.bgm?.pause();
    const audio = new Audio(`/audio/bgm/${track}.mp3`);
    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = this.bgmVolume();
    this.bgm = audio;
    if (this.unlocked && !this.settings.muted) void audio.play().catch(() => undefined);
  }

  playSfx(id: SfxId): void {
    if (!this.unlocked || this.settings.muted) return;
    const audio = new Audio(SFX_PATHS[id]);
    audio.volume = this.settings.sfxVolume;
    void audio.play().catch(() => undefined);
  }

  /** 단서 소리처럼 들어야 하는 소리를 낼 때 BGM 을 잠시 낮춘다. 겹침 사고 방지. */
  playCue(id: SfxId, durationMs = 2200): void {
    this.duck(durationMs);
    this.playSfx(id);
  }

  duck(durationMs: number): void {
    this.ducked = true;
    if (this.bgm) this.bgm.volume = this.bgmVolume();
    window.clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => {
      this.ducked = false;
      if (this.bgm) this.bgm.volume = this.bgmVolume();
    }, durationMs);
  }

  pause(): void {
    this.bgm?.pause();
  }
}

export const audioService = new AudioService();

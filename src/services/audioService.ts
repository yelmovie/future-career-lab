import type { AudioSettings, PageNumber } from '../shared/types';

const BGM_BY_PAGE: Record<PageNumber, string> = {
  1: 'main',
  2: 'stage1',
  3: 'stage2',
  4: 'stage2',
  5: 'stage3',
  6: 'stage3',
  7: 'stage4',
  8: 'stage5',
  9: 'main',
  10: 'main',
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
} as const;

export type SfxId = keyof typeof SFX_PATHS;

class AudioService {
  private bgm: HTMLAudioElement | null = null;
  private settings: AudioSettings = { bgmVolume: 0.28, sfxVolume: 0.7, muted: false };
  private activeTrack = '';
  private unlocked = false;

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

  configure(settings: AudioSettings): void {
    this.settings = settings;
    if (this.bgm) {
      this.bgm.volume = settings.muted ? 0 : settings.bgmVolume;
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
    audio.volume = this.settings.muted ? 0 : this.settings.bgmVolume;
    this.bgm = audio;
    if (this.unlocked && !this.settings.muted) void audio.play().catch(() => undefined);
  }

  playSfx(id: SfxId): void {
    if (!this.unlocked || this.settings.muted) return;
    const audio = new Audio(SFX_PATHS[id]);
    audio.volume = this.settings.sfxVolume;
    void audio.play().catch(() => undefined);
  }

  pause(): void {
    this.bgm?.pause();
  }
}

export const audioService = new AudioService();

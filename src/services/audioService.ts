import type { AudioSettings, PageNumber } from '../shared/types';

const BGM_BY_PAGE: Record<PageNumber, string> = { 1: 'main', 2: 'main', 3: 'stage1', 4: 'stage1', 5: 'stage2', 6: 'stage2', 7: 'stage3', 8: 'stage4', 9: 'stage5', 10: 'main', 11: 'main' };
const SFX_PATHS = {
  tap: '/audio/sfx/ui-click-soft.mp3', swipe: '/audio/sfx/ui-swipe-soft.mp3',
  clue: '/audio/sfx/clue-found-glass-ping.mp3', drop: '/audio/sfx/drag-drop.mp3',
  warning: '/audio/sfx/warning-soft.mp3', record: '/audio/sfx/record-start-beep.mp3',
  success: '/audio/sfx/stage-success-chime.mp3', reward: '/audio/sfx/final-reward.mp3',
  parrotCall: '/audio/v2/parrot-call-audible.mp3', parrotAlarm: '/audio/v2/parrot-alarm-audible.mp3',
  parrotHappy: '/audio/v2/parrot-happy.mp3', forestBirdsong: '/audio/v2/forest-birdsong.mp3',
  chainsaw: '/audio/v2/chainsaw-far.mp3', droneLoop: '/audio/v2/drone-loop.mp3',
} as const;
export type SfxId = keyof typeof SFX_PATHS;
const volume = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
type Band = { low: number; high: number };
interface LevelDemo {
  element: HTMLAudioElement; context: AudioContext | null; shaper: WaveShaperNode | null;
  gain: GainNode | null; source: MediaElementAudioSourceNode | null; level: number; band: Band;
  onError?: () => void;
}

/** Priority: listening exercise > clue > one UI effect > BGM. All owned sounds obey mute and visibility. */
export class AudioService {
  private bgm: HTMLAudioElement | null = null;
  private cue: HTMLAudioElement | null = null;
  private sfx: HTMLAudioElement | null = null;
  private demo: LevelDemo | null = null;
  private settings: AudioSettings = { bgmVolume: 0.28, sfxVolume: 0.7, muted: false };
  private activeTrack = '';
  private currentPage: PageNumber | null = null;
  private unlocked = false;
  private ducked = false;
  private duckTimer = 0;

  private onVisibility = () => {
    if (document.hidden) {
      this.bgm?.pause();
      this.stopCue();
      this.stopSfx();
      this.demo?.element.pause();
      void this.demo?.context?.suspend().catch(() => undefined);
    } else {
      this.resumeBackground();
      this.resumeDemo();
    }
  };

  constructor() {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
  }

  private get audible(): boolean { return this.unlocked && !this.settings.muted && !document.hidden; }
  private play(element: HTMLAudioElement): void { void element.play().catch(() => undefined); }
  private bgmVolume(): number {
    return this.settings.muted || this.demo ? 0 : volume(this.settings.bgmVolume) * (this.cue ? 0.12 : this.ducked ? 0.3 : 1);
  }
  private refreshBackgroundVolume(): void { if (this.bgm) this.bgm.volume = this.bgmVolume(); }
  private resumeBackground(): void {
    this.refreshBackgroundVolume();
    if (this.bgm && this.audible && this.settings.bgmVolume > 0 && !this.demo) this.play(this.bgm);
  }
  private resumeDemo(): void {
    if (!this.demo || !this.audible || this.settings.sfxVolume <= 0) return;
    const demo = this.demo;
    void demo.context?.resume().catch(() => undefined);
    void demo.element.play().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      this.failDemo(demo);
    });
  }

  private failDemo(demo: LevelDemo): void {
    if (this.demo !== demo) return;
    this.stopLevelDemo();
    demo.onError?.();
  }

  unlock(): void { this.unlocked = true; this.resumeBackground(); this.resumeDemo(); }

  configure(settings: AudioSettings): void {
    this.settings = { ...settings, bgmVolume: volume(settings.bgmVolume), sfxVolume: volume(settings.sfxVolume) };
    if (settings.muted || this.settings.sfxVolume === 0) {
      this.stopCue(); this.stopSfx(); this.demo?.element.pause();
    }
    if (this.cue) this.cue.volume = this.settings.sfxVolume;
    if (this.sfx) this.sfx.volume = this.settings.sfxVolume;
    if (this.demo) this.setLevelDemo(this.demo.level, this.demo.band);
    if (settings.muted || this.settings.bgmVolume === 0) this.bgm?.pause();
    else this.resumeBackground();
  }

  playPageBgm(page: PageNumber): void {
    if (this.currentPage !== page) {
      this.currentPage = page;
      this.stopCue(); this.stopSfx(); this.stopLevelDemo(false);
    }
    const track = BGM_BY_PAGE[page];
    if (this.activeTrack === track) return;
    this.activeTrack = track;
    this.bgm?.pause();
    this.bgm?.removeAttribute('src');
    const audio = new Audio(`/audio/bgm/${track}.mp3`);
    audio.loop = true;
    audio.preload = 'none';
    this.bgm = audio;
    this.resumeBackground();
  }

  private stopSfx(): void {
    this.sfx?.pause();
    this.sfx?.removeAttribute('src');
    this.sfx = null;
  }
  private stopCue(): void {
    this.cue?.pause();
    this.cue?.removeAttribute('src');
    this.cue = null;
    window.clearTimeout(this.duckTimer);
    this.ducked = false;
    this.refreshBackgroundVolume();
  }

  playSfx(id: SfxId): void {
    if (!this.audible || this.settings.sfxVolume <= 0 || this.demo || this.cue) return;
    this.stopSfx();
    const audio = new Audio(SFX_PATHS[id]);
    this.sfx = audio;
    audio.volume = this.settings.sfxVolume;
    const finish = () => { if (this.sfx === audio) this.stopSfx(); };
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    void audio.play().catch(finish);
  }

  playCue(id: SfxId, _durationMs = 2200): void {
    if (!this.audible || this.settings.sfxVolume <= 0 || this.demo) return;
    this.stopSfx(); this.stopCue();
    const audio = new Audio(SFX_PATHS[id]);
    this.cue = audio;
    audio.preload = 'auto';
    audio.volume = this.settings.sfxVolume;
    this.refreshBackgroundVolume();
    const finish = () => { if (this.cue === audio) this.stopCue(); };
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    void audio.play().catch(finish);
  }

  duck(durationMs: number): void {
    this.ducked = true;
    this.refreshBackgroundVolume();
    window.clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => { this.ducked = false; this.refreshBackgroundVolume(); }, durationMs);
  }

  pause(): void {
    this.bgm?.pause(); this.stopCue(); this.stopSfx(); this.stopLevelDemo(false);
  }

  startLevelDemo(src: string, level: number, band: Band, onError?: () => void): void {
    if (this.demo) { this.setLevelDemo(level, band); return; }
    this.stopCue(); this.stopSfx(); this.bgm?.pause();
    const element = new Audio(src);
    element.loop = true;
    element.crossOrigin = 'anonymous';
    const demo: LevelDemo = { element, context: null, source: null, shaper: null, gain: null, level, band, onError };
    this.demo = demo;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      try {
        demo.context = new AudioContextCtor();
        demo.source = demo.context.createMediaElementSource(element);
        demo.shaper = demo.context.createWaveShaper();
        demo.gain = demo.context.createGain();
        demo.gain.gain.value = 0;
        demo.source.connect(demo.shaper).connect(demo.gain).connect(demo.context.destination);
      } catch {
        void demo.context?.close().catch(() => undefined);
        demo.context = null; demo.source = null; demo.shaper = null; demo.gain = null;
      }
    }
    element.addEventListener('error', () => this.failDemo(demo), { once: true });
    this.setLevelDemo(level, band);
    this.refreshBackgroundVolume();
  }

  setLevelDemo(level: number, band: Band): void {
    const demo = this.demo;
    if (!demo) return;
    demo.level = Math.max(0, Math.min(100, Number.isFinite(level) ? level : 0));
    demo.band = band;
    const mid = Math.max(1, (band.low + band.high) / 2);
    const drive = demo.level > band.high ? 1 + (demo.level - band.high) / 5 : 1;
    const loudness = this.audible ? Math.min(1, demo.level / mid) * this.settings.sfxVolume : 0;
    if (demo.context && demo.shaper && demo.gain) {
      demo.shaper.curve = clipCurve(drive);
      demo.gain.gain.setTargetAtTime(loudness, demo.context.currentTime, 0.03);
    } else demo.element.volume = volume(loudness);
    if (!this.audible || this.settings.sfxVolume <= 0) demo.element.pause();
    else this.resumeDemo();
  }

  stopLevelDemo(resume = true): void {
    const demo = this.demo;
    if (!demo) return;
    this.demo = null;
    demo.element.pause(); demo.element.removeAttribute('src');
    demo.source?.disconnect(); demo.shaper?.disconnect(); demo.gain?.disconnect();
    void demo.context?.close().catch(() => undefined);
    this.refreshBackgroundVolume();
    if (resume) this.resumeBackground();
  }

  dispose(): void {
    this.pause();
    this.bgm?.pause(); this.bgm?.removeAttribute('src'); this.bgm = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}

function clipCurve(drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.max(-1, Math.min(1, x * drive));
  }
  return curve;
}
export const audioService = new AudioService();

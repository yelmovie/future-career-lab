import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from '../src/services/audioService';

class FakeAudio extends EventTarget {
  static elements: FakeAudio[] = [];
  paused = true;
  volume = 1;
  loop = false;
  preload = '';
  crossOrigin = '';
  constructor(public src: string) { super(); FakeAudio.elements.push(this); }
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
}
let documentStub: EventTarget & { hidden: boolean };
let service: AudioService;
const settings = { bgmVolume: 0.3, sfxVolume: 0.7, muted: false };
beforeEach(() => {
  FakeAudio.elements = [];
  documentStub = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', documentStub);
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  service = new AudioService();
  service.configure(settings);
  service.playPageBgm(1);
  service.unlock();
});
afterEach(() => { service.dispose(); vi.unstubAllGlobals(); });

describe('classroom audio ownership', () => {
  it('replaces repeated effects and mutes an effect that is already playing', () => {
    service.playSfx('tap');
    const first = FakeAudio.elements.at(-1)!;
    service.playSfx('success');
    const second = FakeAudio.elements.at(-1)!;
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(false);
    service.configure({ ...settings, muted: true });
    expect(FakeAudio.elements.every((audio) => audio.paused)).toBe(true);
  });

  it('keeps a clue above UI clicks, and releases the BGM when the clue really ends', () => {
    const bgm = FakeAudio.elements[0]!;
    service.playCue('forestBirdsong');
    const cue = FakeAudio.elements.at(-1)!;
    service.playSfx('tap');
    expect(FakeAudio.elements.at(-1)).toBe(cue);
    expect(bgm.volume).toBeLessThan(settings.bgmVolume);
    cue.dispatchEvent(new Event('ended'));
    expect(bgm.volume).toBe(settings.bgmVolume);
  });

  it('pauses every sound when hidden and does not replay a stale clue after returning', () => {
    service.playCue('parrotCall');
    const cue = FakeAudio.elements.at(-1)!;
    documentStub.hidden = true;
    documentStub.dispatchEvent(new Event('visibilitychange'));
    expect(FakeAudio.elements.every((audio) => audio.paused)).toBe(true);
    documentStub.hidden = false;
    documentStub.dispatchEvent(new Event('visibilitychange'));
    expect(cue.paused).toBe(true);
    expect(FakeAudio.elements[0]!.paused).toBe(false);
  });

  it('keeps the listening exercise exclusive, obeys mute immediately and disposes it on page changes', () => {
    service.startLevelDemo('/audio/v5/broadcast-mic-test.wav', 55, { low: 40, high: 72 });
    const demo = FakeAudio.elements.at(-1)!;
    expect(FakeAudio.elements[0]!.paused).toBe(true);
    expect(demo.paused).toBe(false);
    service.configure({ ...settings, muted: true });
    expect(demo.paused).toBe(true);
    expect(demo.volume).toBe(0);
    service.configure(settings);
    expect(demo.paused).toBe(false);
    service.playPageBgm(2);
    expect(demo.paused).toBe(true);
    expect(demo.src).toBe('');
  });

  it('does not restart background audio while pausing for certificate printing', () => {
    service.startLevelDemo('/audio/v5/broadcast-mic-test.wav', 55, { low: 40, high: 72 });
    service.pause();
    expect(FakeAudio.elements.every((audio) => audio.paused)).toBe(true);
  });

  it('turns the construction recording down to silence without distortion', () => {
    const band = { low: 100, high: 100 };
    service.startLevelDemo('/audio/v9/construction-site-loop.wav', 80, band);
    const demo = FakeAudio.elements.at(-1)!;
    expect(demo.volume).toBeCloseTo(0.56);
    service.setLevelDemo(20, band);
    expect(demo.volume).toBeCloseTo(0.14);
    service.setLevelDemo(0, band);
    expect(demo.volume).toBe(0);
  });

  it('reports a failed listening clip once and releases background audio', () => {
    const failed = vi.fn();
    service.startLevelDemo('/audio/missing.wav', 80, { low: 100, high: 100 }, failed);
    const demo = FakeAudio.elements.at(-1)!;
    demo.dispatchEvent(new Event('error'));
    expect(failed).toHaveBeenCalledOnce();
    expect(demo.paused).toBe(true);
    expect(FakeAudio.elements[0]!.paused).toBe(false);
    demo.dispatchEvent(new Event('error'));
    expect(failed).toHaveBeenCalledOnce();
  });

  it('allows retry after playback is blocked without leaving a silent demo active', async () => {
    const failed = vi.fn();
    service.configure({ ...settings, muted: true });
    service.startLevelDemo('/audio/v9/construction-site-loop.wav', 80, { low: 100, high: 100 }, failed);
    const demo = FakeAudio.elements.at(-1)!;
    demo.play.mockRejectedValueOnce(new DOMException('Gesture required', 'NotAllowedError'));
    service.configure(settings);
    await Promise.resolve();
    expect(failed).toHaveBeenCalledOnce();
    expect(demo.src).toBe('');
  });
});

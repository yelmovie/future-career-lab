// Rebuild the Stage 5 loop from the CC0 Freesound recording documented below.
// Usage: node scripts/prepare-construction-audio.mjs path/to/88422_57789-hq.mp3
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Pass the downloaded Freesound #88422 high-quality MP3 path.');
const source = await readFile(inputPath);
const browser = await chromium.launch({ headless: true });
let samples;
const rate = 22050;
const compression = { threshold: -26, knee: 12, ratio: 4, attack: 0.003, release: 0.12 };
try {
  const page = await browser.newPage();
  samples = await page.evaluate(async ({ encoded, rate, compression }) => {
    const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const decoder = new globalThis.OfflineAudioContext(1, 1, rate);
    const decoded = await decoder.decodeAudioData(data.buffer);
    const renderer = new globalThis.OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
    const player = renderer.createBufferSource();
    player.buffer = decoded;
    player.connect(renderer.destination);
    player.start();
    const rendered = await renderer.startRendering();
    // Control short machinery peaks before raising the sustained engine sound.
    const pcm = rendered.getChannelData(0);
    const sourceRms = Math.sqrt(pcm.reduce((sum, sample) => sum + sample * sample, 0) / pcm.length);
    const mastering = new globalThis.OfflineAudioContext(1, rendered.length, rate);
    const recording = mastering.createBufferSource();
    recording.buffer = rendered;
    const inputGain = mastering.createGain();
    inputGain.gain.value = 0.1 / Math.max(sourceRms, 1e-8);
    const compressor = mastering.createDynamicsCompressor();
    for (const [key, value] of Object.entries(compression)) compressor[key].value = value;
    recording.connect(inputGain).connect(compressor).connect(mastering.destination);
    recording.start();
    const mastered = await mastering.startRendering();
    return Array.from(mastered.getChannelData(0).slice(8 * rate, Math.round(20.8 * rate)));
  }, { encoded: source.toString('base64'), rate, compression });
} finally { await browser.close(); }
if (samples.length !== Math.round(12.8 * rate)) throw new Error('The source is shorter than the chosen excerpt.');
const overlap = Math.round(0.8 * rate);
const mono = new Float64Array(samples.length - overlap);
mono.set(samples.slice(overlap, -overlap));
for (let i = 0; i < overlap; i++) {
  const phase = i / (overlap - 1) * Math.PI / 2;
  mono[mono.length - overlap + i] = samples[samples.length - overlap + i] * Math.cos(phase) + samples[i] * Math.sin(phase);
}
const mean = mono.reduce((sum, sample) => sum + sample, 0) / mono.length;
for (let i = 0; i < mono.length; i++) mono[i] -= mean;
const rms = Math.sqrt(mono.reduce((sum, sample) => sum + sample * sample, 0) / mono.length);
const peak = mono.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
const gain = Math.min(10 ** (-12 / 20) / rms, 10 ** (-1 / 20) / peak);
const wav = Buffer.alloc(44 + mono.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(mono.length * 2, 40);
for (let i = 0; i < mono.length; i++) wav.writeInt16LE(Math.round(mono[i] * gain * 32767), 44 + i * 2);
const output = 'public/audio/v9/construction-site-loop.wav';
await mkdir('public/audio/v9', { recursive: true });
await writeFile(output, wav);
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const record = {
  title: 'construction equipment tracked.wav', creator: 'cognito perceptu', soundId: 88422,
  sourcePage: 'https://freesound.org/people/cognito%20perceptu/sounds/88422/',
  downloadedFile: 'https://cdn.freesound.org/previews/88/88422_57789-hq.mp3',
  license: 'CC0 1.0 Universal', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  retrievedAt: '2026-09-11', sourceSha256: sha256(source), output, outputSha256: sha256(wav),
  processing: { revision: 2, masteredAt: '2026-09-12', startSeconds: 8, endSeconds: 20.8, crossfadeSeconds: 0.8, outputSeconds: mono.length / rate,
    channels: 1, sampleRate: rate, bitDepth: 16, dcOffsetRemoved: true,
    compression, targetRmsDbfs: -12, peakCeilingDbfs: -1,
    rmsDbfs: 20 * Math.log10(rms * gain), peakDbfs: 20 * Math.log10(peak * gain) },
};
await mkdir('assets/licenses', { recursive: true });
await writeFile('assets/licenses/construction-audio.json', JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ output, bytes: wav.length, ...record.processing }, null, 2));

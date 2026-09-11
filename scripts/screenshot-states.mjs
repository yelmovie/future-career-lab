// 대표 상태(계획·작업·모달)를 실제 브라우저로 캡처한다.
// 사용: node scripts/screenshot-states.mjs [outDir]
// 선택: SHOT_NAMES=p05-fresh,p10-tab2 / SHOT_VIEWPORT=1024x768
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outDir = process.argv[2] ?? 'test-results/states';
fs.mkdirSync(outDir, { recursive: true });
const SAVE_KEY = 'future-career-lab.save.v1';
const baseSave = {
  schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '테스트', lastPage: 1,
  stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [] },
  badges: [], jobCards: [], traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
  logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
  audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
  artifacts: { photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'edge' }], hypothesis: 'logging', careLog: [{ bird: 'green', issue: 'stress', treatment: 'hideout' }, { bird: 'red', issue: 'dehydration', treatment: 'water' }], habitatStars: 2, traces: [], graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'sub' }, { variable: 'water', verdict: 'none' }], clip: { trust: 90, corrections: 0 }, allianceTurns: null },
  updatedAt: new Date().toISOString(),
};
const fullSave = { ...baseSave, stageProgress: { completed: { 1: true, 2: true, 3: true, 4: true, 5: true }, completedPages: [3, 4, 5, 6, 7, 8, 9] }, certificateUnlocked: true };

/** @type {Array<{ name: string; page: number; save?: object; act?: (page: import('@playwright/test').Page) => Promise<void> }>} */
const SHOTS = [
  { name: 'p01-fresh', page: 1, save: baseSave },
  { name: 'p01-resume', page: 1, save: { ...fullSave, lastPage: 7 } },
  { name: 'p02-fresh', page: 2, save: baseSave },
  { name: 'p03-plan', page: 3, save: baseSave },
  { name: 'p03-detail-modal', page: 3, save: baseSave, act: async (p) => { await p.getByRole('button', { name: '자세히' }).click(); } },
  { name: 'p04-fresh', page: 4, save: baseSave },
  { name: 'p05-fresh', page: 5, save: baseSave },
  { name: 'p05-treatment-picked', page: 5, save: baseSave, act: async (p) => { await p.locator('.p5-treatment').first().click(); } },
  { name: 'p06-fresh', page: 6, save: baseSave },
  { name: 'p07-tablet', page: 7, save: { ...baseSave, pageData: { page07Ecology: { step: 'tablet', point: 'A', found: [], envSeen: [], chartPick: null, exp: { baseline: { logging: 5, noise: 5, water: 5 }, levels: { logging: 5, noise: 5, water: 5 }, active: null }, trials: [], lastTrial: null, main: null, sub: null } } } },
  { name: 'p07-lab', page: 7, save: { ...baseSave, pageData: { page07Ecology: { step: 'experiment', point: 'A', found: [], envSeen: [], chartPick: { point: 'A', variable: 'logging' }, exp: { baseline: { logging: 5, noise: 5, water: 5 }, levels: { logging: 8, noise: 5, water: 5 }, active: 'logging' }, trials: [], lastTrial: null, main: null, sub: null } } } },
  { name: 'p08-fresh', page: 8, save: baseSave },
  { name: 'p09-after-brief', page: 9, save: baseSave, act: async (p) => { await p.getByRole('button', { name: '작전 시작' }).click(); await p.waitForTimeout(800); } },
  { name: 'p09-completed', page: 9, save: fullSave },
  { name: 'p11-after', page: 11, save: fullSave, act: async (p) => { await p.waitForTimeout(3200); } },
  { name: 'p11-locked', page: 11, save: baseSave },
  { name: 'p01-settings-modal', page: 1, save: fullSave, act: async (p) => { await p.getByRole('button', { name: '설정 열기' }).click(); } },
];
const requestedShots = process.env.SHOT_NAMES ? new Set(process.env.SHOT_NAMES.split(',')) : null;
const selectedShots = requestedShots ? SHOTS.filter((shot) => requestedShots.has(shot.name)) : SHOTS;
const match = /^(\d+)x(\d+)$/.exec(process.env.SHOT_VIEWPORT ?? '1280x720');
const viewport = { width: Number(match?.[1] ?? 1280), height: Number(match?.[2] ?? 720) };

const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 4177, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const shot of selectedShots) {
    await page.goto('http://127.0.0.1:4177/#/page/1');
    await page.evaluate(([key, save]) => localStorage.setItem(key, JSON.stringify(save)), [SAVE_KEY, shot.save ?? fullSave]);
    await page.reload();
    await page.goto(`http://127.0.0.1:4177/#/page/${shot.page}`);
    await page.waitForTimeout(1200);
    if (shot.act) await shot.act(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${shot.name}.png`) });
  }
  if (errors.length) console.log('page errors:', errors);
  await context.close();
} finally {
  await browser.close();
  await server.close();
}
console.log(`saved to ${outDir}`);

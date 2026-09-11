// 전 페이지를 3개 해상도로 캡처한다. 태블릿·전자칠판 검수용.
// 사용: node scripts/screenshot-pages.mjs [outDir]
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outDir = process.argv[2] ?? 'test-results/screens';
fs.mkdirSync(outDir, { recursive: true });
const PROFILES = process.env.SHOT_PROFILES ? process.env.SHOT_PROFILES.split(',').map((s) => s.split('x').map(Number)) : [[906, 755], [1280, 800], [1920, 1080]];
const PAGES = process.env.SHOT_PAGES ? process.env.SHOT_PAGES.split(',').map(Number) : Array.from({ length: 11 }, (_, index) => index + 1);
const SAVE_KEY = 'future-career-lab.save.v1';
const fullSave = {
  schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '테스트', lastPage: 1,
  stageProgress: { completed: { 1: true, 2: true, 3: true, 4: true, 5: true }, completedPages: [3, 4, 5, 6, 7, 8, 9] },
  badges: [], jobCards: [], traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
  logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: true, rewardGranted: [],
  audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
  artifacts: { photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'edge' }], hypothesis: 'logging', careLog: [{ bird: 'green', issue: 'stress', treatment: 'hideout' }, { bird: 'red', issue: 'dehydration', treatment: 'water' }], habitatStars: 2, traces: [], graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'sub' }, { variable: 'water', verdict: 'none' }], clip: { trust: 90, corrections: 0 }, allianceTurns: null },
  updatedAt: new Date().toISOString(),
};

const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 4176, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
try {
  for (const [w, h] of PROFILES) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4176/#/page/1');
    await page.evaluate(([key, save]) => localStorage.setItem(key, JSON.stringify(save)), [SAVE_KEY, fullSave]);
    for (const n of PAGES) {
      await page.goto(`http://127.0.0.1:4176/#/page/${n}`);
      await page.reload();
      await page.waitForTimeout(1800);
      await page.screenshot({ path: path.join(outDir, `p${String(n).padStart(2, '0')}-${w}x${h}.png`) });
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`saved to ${outDir}`);

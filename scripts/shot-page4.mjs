// 증거판(페이지 4) 4단계를 차례로 눌러 보며 1280×720 으로 캡처한다.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outDir = process.argv[2] ?? 'test-results/p4';
fs.mkdirSync(outDir, { recursive: true });
const SAVE_KEY = 'future-career-lab.save.v1';
const save = {
  schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '테스트', lastPage: 4,
  stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [3] },
  badges: [], jobCards: [], traits: { exploration: 1, analysis: 1, creation: 0, care: 0, execution: 1, collaboration: 0 },
  logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
  audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
  artifacts: { photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }], hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null },
  prediction: 'drone', abilityStatements: [], updatedAt: new Date().toISOString(),
};
// 세부 핫스팟 중심 (stage1-2-content.ts 의 rect 와 같아야 한다)
const HOTSPOT = {
  '벌목지 사진': { x: .30, y: .46 },
  '막힌 물길 사진': { x: .49, y: .48 },
  '공사장 사진': { x: .56, y: .62 },
};

const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 4178, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`) });

  await page.goto('http://127.0.0.1:4178/#/page/1');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, save]);
  await page.goto('http://127.0.0.1:4178/#/page/4');
  await page.reload();
  await page.waitForTimeout(1500);
  await shot('01-step1');

  // 1단계: 사진 3장에서 숨은 것 찾기
  for (const [title, spot] of Object.entries(HOTSPOT)) {
    await page.locator('.p4-photo', { hasText: title }).click();
    await page.waitForTimeout(400);
    if (title === '벌목지 사진') { await page.getByRole('button', { name: '못 찾겠어요' }).click(); await page.waitForTimeout(400); await shot('02-zoom-help'); }
    const image = page.locator('.zoom-frame img');
    const box = await image.boundingBox();
    await page.mouse.click(box.x + box.width * spot.x, box.y + box.height * spot.y);
    await page.waitForTimeout(400);
    if (title === '벌목지 사진') await shot('03-zoom-found');
    await page.getByRole('button', { name: /닫기/ }).click();
    await page.waitForTimeout(300);
  }
  await shot('04-step1-done');

  await page.getByRole('button', { name: /다음으로/ }).click();
  await page.waitForTimeout(600);
  await shot('05-step2');

  // 2단계: 선 잇기 2개
  for (const [detail, fact] of [['톱 자국 그루터기', 'CCTV 클립'], ['물길 막은 자재', '발자국 단서']]) {
    await page.getByRole('button', { name: detail, exact: true }).click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: fact, exact: true }).click();
    await page.waitForTimeout(350);
  }
  await shot('06-step2-done');

  await page.getByRole('button', { name: /다음으로/ }).click();
  await page.waitForTimeout(600);
  await shot('07-step3');

  // 3단계: 카드 고르고 칸에 넣기 — 근거 없는 '확실' 튕김도 한 번 본다
  await page.locator('.p4-sort__tray .evidence-card').first().click();
  await page.waitForTimeout(300);
  await shot('08-step3-picked');
  await page.locator('.p4-sort__tray .evidence-card').first().click();
  await page.waitForTimeout(200);
  const plan =[['벌목지 사진', 'sure'], ['막힌 물길 사진', 'sure'], ['공사장 사진', 'doubt'], ['CCTV 클립', 'sure'], ['발자국 단서', 'sure'], ['녹음기 기록', 'doubt'], ['도시 야경', 'none']];
  for (const [title, bin] of plan) {
    const card = page.locator('.p4-sort__tray .evidence-card', { hasText: title });
    if (await card.count() === 0) continue;
    await card.first().click();
    await page.waitForTimeout(200);
    await page.locator('.evidence-bin.is-' + bin).getByRole('button', { name: '여기에 넣기' }).click();
    await page.waitForTimeout(300);
  }
  await shot('09-step3-done');

  await page.getByRole('button', { name: /다음으로/ }).click();
  await page.waitForTimeout(600);
  await shot('10-step4');
  await page.locator('.p4-guess').first().click();
  await page.waitForTimeout(900);
  await shot('11-step4-chosen');
  await context.close();
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log('page errors:', errors);
console.log(`saved to ${outDir}`);

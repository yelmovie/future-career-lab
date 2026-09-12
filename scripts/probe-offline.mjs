/* global window, document */
// Production-only probe: wait for automatic preparation, then open previously unvisited routes offline.
// Route loading and resource checks do not substitute for a student's complete gameplay run.
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

const requestedUrl = process.argv.find((argument) => argument.startsWith('--url='))?.slice(6);
const server = requestedUrl ? null : await preview({ preview: { host: '127.0.0.1', port: 4177, strictPort: true }, logLevel: 'error' });
const base = requestedUrl ?? 'http://127.0.0.1:4177/';
const browser = await chromium.launch();
fs.mkdirSync(path.resolve('test-results/release-20260912'), { recursive: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
const cancelledRequests = [];
const requested = [];
const report = { startedAt: new Date().toISOString(), base, scope: 'Local production resource/route/first-GLB inspection, not complete student gameplay or school-device acceptance', errors, cancelledRequests };
page.on('request', (request) => requested.push(request.url()));
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('requestfailed', (request) => {
  const detail = `${request.url()} (${request.failure()?.errorText ?? 'unknown'})`;
  if (request.failure()?.errorText === 'net::ERR_ABORTED') cancelledRequests.push(detail);
  else errors.push(detail);
});
try {
  await page.goto(`${base}#/page/1`);
  await page.locator('h1').first().waitFor();
  await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error('Service worker was not ready within 45 seconds; verify shell hashes and registration errors.')), 45000)),
  ]));
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const perf = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    return { domContentLoaded: Math.round(navigation.domContentLoadedEventEnd), load: Math.round(navigation.loadEventEnd), bytes: resources.reduce((sum, resource) => sum + (resource.transferSize || resource.encodedBodySize || 0), 0), count: resources.length };
  });
  report.firstLoad = { ...perf, threeDRequests: requested.filter((url) => /\.glb(?:[?#]|$)|\/meshy\/|model-viewer|ParrotModelPreview/i.test(url)) };
  console.log('First load (local, one run; not LCP or full preparation):', perf);
  console.log('First-load 3D requests:', report.firstLoad.threeDRequests);
  if (report.firstLoad.threeDRequests.length) errors.push('3D resources were requested during the initial home load.');
  // This uses the real student's automatic preparation path, without a synthetic PREPARE message.
  await page.locator('button[aria-label="수업 자료 상태"][title="그림과 소리 준비 완료"]').waitFor({ timeout: 180000 });
  await page.screenshot({ path: 'test-results/release-20260912/home-prepared-1280.png' });
  const prepared = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const manifest = await (await fetch(new URL('classroom-assets.json', registration.scope))).json();
    const result = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const deadline = window.setTimeout(() => { channel.port1.close(); reject(new Error('Classroom preparation timeout')); }, 180000);
      channel.port1.onmessage = ({ data }) => {
        window.clearTimeout(deadline); channel.port1.close();
        if (data.state !== 'ready') reject(new Error(data.error ?? data.state));
        else resolve(data);
      };
      registration.active.postMessage({ type: 'CLASSROOM_STATUS' }, [channel.port2]);
    });
    // Teacher preview only permits opening each route; it does not manufacture student completion.
    sessionStorage.setItem('future-career-lab.teacher-preview', 'true');
    return { result, manifest };
  });
  report.prepared = prepared.result;
  console.log('Automatically prepared classroom release:', prepared.result);
  await context.setOffline(true);
  await page.reload();
  await page.locator('h1').first().waitFor();
  const resourceCheck = await page.evaluate(async (manifest) => {
    const bad = [];
    for (const file of manifest.files) {
      const response = await fetch(file.url);
      if (!response.ok) { bad.push(`${file.url}: ${response.status}`); continue; }
      const bytes = await response.arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== file.sha256) bad.push(`${file.url}: content mismatch`);
    }
    const audio = manifest.files.find((file) => file.url.endsWith('.mp3'));
    if (audio) {
      const range = await fetch(audio.url, { headers: { Range: 'bytes=0-1023' } });
      if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 1024) bad.push(`${audio.url}: offline Range response failed`);
    }
    return { checked: manifest.files.length, failures: bad };
  }, prepared.manifest);
  console.log('Offline resources including previously unvisited media:', resourceCheck);
  report.resourceCheck = resourceCheck;
  const rendered = [];
  for (const number of [2, 3, 4, 5, 6, 7, 8, 9, 11]) {
    await page.goto(`${base}#/page/${number}`);
    await page.locator('h1').first().waitFor();
    rendered.push({ page: number, heading: await page.locator('h1').first().evaluate((element) => element.textContent?.trim() || element.getAttribute('aria-label')) });
    if (number === 7) {
      report.productionHeader = [];
      for (const width of [1280, 1024]) {
        await page.setViewportSize({ width, height: 800 });
        await page.waitForTimeout(200);
        report.productionHeader.push(await page.evaluate(() => {
          const bounds = (selector) => {
            const element = document.querySelector(selector);
            const box = element.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
          };
          return { viewport: window.innerWidth, topbar: bounds('.topbar'), title: bounds('.title-lockup'), status: bounds('.classroom-status-summary'), control: bounds('.classroom-status-button'), actions: bounds('.topbar-actions'), content: bounds('.game-content') };
        }));
        await page.screenshot({ path: `test-results/release-20260912/header-prepared-${width}.png` });
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    if (number === 5) {
      await page.getByRole('button', { name: '3D로 살펴보기', exact: true }).click();
      await page.waitForFunction(() => Boolean(document.querySelector('model-viewer')?.loaded) || Boolean(document.querySelector('.parrot-preview__fallback')), undefined, { timeout: 45000 });
      const model = await page.locator('model-viewer').evaluateAll((elements) => elements.map((element) => ({ loaded: Boolean(element.loaded), description: element.getAttribute('alt') })));
      report.firstOfflineModel = model;
      console.log('First previously unvisited GLB rendered offline:', model);
      if (!model.some((item) => item.loaded)) errors.push('The first offline GLB did not render; inspect the fallback and this browser’s WebGL support.');
      await page.getByRole('button', { name: '관찰로 돌아가기', exact: true }).click();
    }
  }
  console.log('Previously unvisited routes rendered offline (not a gameplay-completion claim):', rendered);
  report.routes = rendered;
  // Finish a real interactive mission offline. Earlier stages are an explicit fixture,
  // so this evidence is not described as a fresh full-game playthrough.
  await page.evaluate(() => {
    const key = 'future-career-lab.save.v1';
    const save = JSON.parse(localStorage.getItem(key));
    sessionStorage.removeItem('future-career-lab.teacher-preview');
    save.stageProgress.completedPages = [3, 4, 5, 6, 7, 8];
    save.pageData = {};
    save.logs = [];
    save.rewardGranted = [];
    save.certificateUnlocked = false;
    save.artifacts.clip = { trust: 100, corrections: 0 };
    save.audio = { muted: true, bgmVolume: 0, sfxVolume: 0 };
    localStorage.setItem(key, JSON.stringify(save));
  });
  await page.reload();
  await page.goto(`${base}#/page/9`);
  await page.getByRole('button', { name: '함께 숲으로 가기', exact: true }).click();
  await page.getByRole('button', { name: '막힌 물길 도와주기', exact: true }).click();
  const water = await page.locator('.coop-water .coop-scene').boundingBox();
  await page.mouse.move(water.x + water.width * .27, water.y + water.height * .4);
  await page.mouse.down();
  await page.mouse.move(water.x + water.width * .7, water.y + water.height * .4, { steps: 12 });
  await page.mouse.up();
  await page.getByRole('button', { name: '물길 정비팀에 보내기', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '다른 곳도 도와주기', exact: true }).click();
  await page.getByRole('button', { name: '숲 옆 공사장 도와주기', exact: true }).click();
  await page.getByRole('slider', { name: '공사 소리 줄이기', exact: true }).fill('25');
  await page.getByRole('button', { name: '가림벽 세우기', exact: true }).click();
  await page.getByRole('button', { name: '공사팀에 약속 전하기', exact: true }).click();
  await page.getByRole('button', { name: '다른 곳도 도와주기', exact: true }).click();
  await page.getByRole('button', { name: '나무가 베인 곳 도와주기', exact: true }).click();
  for (const site of ['left', 'right']) {
    const start = await page.getByRole('button', { name: '열매나무 묘목', exact: true }).boundingBox();
    const end = await page.locator(`[data-plant-site="${site}"]`).boundingBox();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await page.getByRole('button', { name: '함께 나무 돌보기', exact: true }).click();
  await page.getByRole('button', { name: '함께 바꾼 숲 보기', exact: true }).click();
  await page.locator('.coop-ending').waitFor();
  await page.getByRole('slider', { name: '숲의 전후 모습 비교', exact: true }).fill('0');
  await page.getByRole('button', { name: '수료증 확인하기', exact: true }).click();
  await page.getByLabel('미래 직업실 탐험 수료증', { exact: true }).waitFor();
  report.offlineMissionCompletion = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('future-career-lab.save.v1'));
    return { priorStagesWereFixture: true, playedStage: 5, completed: save.pageData.p9Cooperation.completed, certificateUnlocked: save.certificateUnlocked, clearLogCount: save.logs.filter((log) => log.type === 'alliance-clear').length };
  });
  if (!report.offlineMissionCompletion.certificateUnlocked || report.offlineMissionCompletion.clearLogCount !== 1) errors.push('The offline cooperation mission did not unlock exactly one completion and the certificate.');
  console.log('Stage 5 played through to the certificate offline:', report.offlineMissionCompletion);
  if (resourceCheck.failures.length || errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error);
  report.exception = error instanceof Error ? error.message : String(error);
  report.failedScreen = { url: page.url(), text: await page.locator('body').innerText().catch(() => '') };
  await page.screenshot({ path: 'test-results/release-20260912/offline-failed-screen.png' }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  console.log('Runtime/network errors:', errors);
  console.log('Navigation/audio request cancellations (reported separately):', cancelledRequests);
  report.completedAt = new Date().toISOString();
  report.passed = !process.exitCode;
  const reportPath = path.resolve('test-results/release-20260912/offline-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('Saved report:', reportPath);
  await browser.close();
  server?.httpServer.close();
}

/* global window, document */
// Production-only probe: prepare exact classroom resources, then open previously unvisited routes offline.
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
  const prepared = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const manifest = await (await fetch(new URL('classroom-assets.json', registration.scope))).json();
    const result = await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const deadline = window.setTimeout(() => { channel.port1.close(); reject(new Error('Classroom preparation timeout')); }, 180000);
      channel.port1.onmessage = ({ data }) => {
        if (data.state === 'preparing') return;
        window.clearTimeout(deadline); channel.port1.close();
        if (data.state !== 'ready') reject(new Error(data.error ?? data.state));
        else resolve(data);
      };
      registration.active.postMessage({ type: 'PREPARE_CLASSROOM' }, [channel.port2]);
    });
    // Teacher preview only permits opening each route; it does not manufacture student completion.
    sessionStorage.setItem('future-career-lab.teacher-preview', 'true');
    return { result, manifest };
  });
  report.prepared = prepared.result;
  console.log('Prepared classroom release:', prepared.result);
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
  if (resourceCheck.failures.length || errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error);
  report.exception = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  console.log('Runtime/network errors:', errors);
  console.log('Navigation/audio request cancellations (reported separately):', cancelledRequests);
  report.completedAt = new Date().toISOString();
  report.passed = !process.exitCode;
  const reportPath = path.resolve('test-results/advancement-20260910/offline-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log('Saved report:', reportPath);
  await browser.close();
  server?.httpServer.close();
}

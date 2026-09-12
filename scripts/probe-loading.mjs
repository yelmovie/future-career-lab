/* global window, document */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const requestedUrl = process.argv.find((argument) => argument.startsWith('--url='))?.slice(6);
const server = requestedUrl ? null : await preview({ preview: { host: '127.0.0.1', port: 4198, strictPort: true }, logLevel: 'error' });
const base = requestedUrl ?? 'http://127.0.0.1:4198/';
const browser = await chromium.launch();
const report = { at: new Date().toISOString(), base, scope: 'Fresh browser contexts, HTTP cache disabled. 5 Mbps and 40 ms are simulated on a desktop, not a physical school network.', runs: [] };
try {
  for (const limited of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (limited) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 5_000_000 / 8, uploadThroughput: 1_000_000 / 8, connectionType: 'wifi' });
    const errors = [];
    const requests = new Map();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    cdp.on('Network.requestWillBeSent', (event) => requests.set(event.requestId, { url: event.request.url, type: event.type }));
    cdp.on('Network.responseReceived', (event) => Object.assign(requests.get(event.requestId) ?? {}, { status: event.response.status }));
    cdp.on('Network.loadingFinished', (event) => Object.assign(requests.get(event.requestId) ?? {}, { bytes: event.encodedDataLength }));
    await page.addInitScript(() => {
      window.__loadingMetrics = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__loadingMetrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__loadingMetrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '시작하기', exact: true }).waitFor({ timeout: 45000 });
    const buttonReadyMs = await page.evaluate(() => performance.now());
    await page.waitForLoadState('load');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => ({
      ...window.__loadingMetrics,
      measuredAtMs: performance.now(),
      navigation: performance.getEntriesByType('navigation')[0].toJSON(),
      paint: performance.getEntriesByType('paint').map((entry) => entry.toJSON()),
    }));
    const network = [...requests.values()];
    const run = { profile: limited ? '5Mbps-40ms-cold' : 'local-cold', buttonReadyMs, ...metrics, transferredBytes: network.reduce((sum, entry) => sum + (entry.bytes || 0), 0), errors, httpErrors: network.filter((entry) => entry.status >= 400), requests: network };
    report.runs.push(run);
    console.log(JSON.stringify({ profile: run.profile, buttonReadyMs, lcp: run.lcp, cls: run.cls, dcl: metrics.navigation.domContentLoadedEventEnd, load: metrics.navigation.loadEventEnd, transferredBytes: run.transferredBytes, errors, httpErrors: run.httpErrors }));
    await context.close();
  }
} finally {
  const output = path.resolve('test-results/release-20260912/loading-report.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  await browser.close();
  server?.httpServer.close();
}
if (report.runs.some((run) => run.errors.length || run.httpErrors.length)) process.exitCode = 1;

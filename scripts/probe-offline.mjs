// 프로덕션 빌드(dist)를 띄우고 서비스워커 등록 → 오프라인 전환 → 새로고침이 되는지 확인한다.
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 4177, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto('http://127.0.0.1:4177/#/page/1');
  await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready.then(() => true), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), bytes: res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0), count: res.length };
  });
  console.log('first load:', perf);
  await page.goto('http://127.0.0.1:4177/#/page/2');
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await page.waitForTimeout(2500);
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  console.log('offline reload h1:', h1);
  await page.goto('http://127.0.0.1:4177/#/page/1');
  await page.waitForTimeout(1500);
  console.log('offline home h1:', await page.locator('h1').first().textContent().catch(() => null));
} finally {
  console.log('errors:', errors);
  await browser.close();
  server.httpServer.close();
}

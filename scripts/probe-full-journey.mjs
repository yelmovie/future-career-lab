/* global window, document, Image */
/**
 * A fresh student's complete, offline production journey in ONE browser context.
 *
 * Run against an already running production preview (build/serve separately):
 *   node scripts/probe-full-journey.mjs --url=http://127.0.0.1:4197/
 * Options: --out=test-results/full-journey --expected-assets=189 --headed
 *
 * No completion fixtures, storage writes, teacher preview, application/model calls,
 * synthetic DOM events, audio stubs, request interception, or route jumps are used.
 * page.evaluate is limited to observations, uncached network-control fetches,
 * and the service worker STATUS request. navigator.onLine is never overwritten.
 * Only the first navigation targets a URL; subsequent navigation uses the UI.
 * A failure stops the run and leaves every remaining step explicitly NOT TESTED.
 * Passing this probe does not establish child usability, tablet hardware/audio
 * loudness, optional 3D inspection, printing, or every wrong answer.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium, expect as playwrightExpect } from '@playwright/test';

const option = (name) => process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const base = new URL(option('url') ?? 'http://127.0.0.1:4197/');
base.hash = '';
base.search = '';
if (!base.pathname.endsWith('/')) base.pathname += '/';
const expectedAssets = Number(option('expected-assets') ?? 189);
assert(Number.isInteger(expectedAssets) && expectedAssets > 0, '--expected-assets must be a positive integer');
const output = path.resolve(option('out') ?? `test-results/full-journey-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(output, { recursive: true });
const expect = playwrightExpect.configure({ timeout: 45_000 });
const SAVE_KEY = 'future-career-lab.save.v1';
const planned = [
  ['prepare', '새 기록과 자동 자료 준비'],
  ['offline-home', '오프라인 홈 다시 열기'],
  ['briefing', '이야기와 네 직업 만나기'],
  ['drone', '경로 놓기·세 사진 촬영·이륙장 복귀'],
  ['evidence', '사진 확대·흔적 찾기·처음 가설'],
  ['care-jigu', '지구 관찰과 돌봄'],
  ['care-jelly', '젤리 관찰과 돌봄'],
  ['garden', '정원 물건 배치와 시험'],
  ['ecology-traces', '숲 세 곳의 흔적과 새 수 조사'],
  ['ecology-compare', '세 행동 비교와 새로고침 복원'],
  ['ecology-conclusion', '실험 근거로 처음 생각 수정'],
  ['broadcast', '방송 네 장면과 마이크 복구'],
  ['broadcast-replay', '내 방송 네 장면 자동 이어 보기'],
  ['cooperation-trees', '팀과 묘목 심기'],
  ['cooperation-water', '막힌 물길을 쓸어 표시하기'],
  ['cooperation-quiet', '조용한 작업 약속과 소리 조절'],
  ['cooperation-ending', '함께 바꾼 숲 비교'],
  ['school-garden', '새 장소에서 도움을 다시 고르고 물 주기'],
  ['certificate', '수료증·실제 탐험 기록·PNG 저장'],
];
let currentStep = 'launch';
let offline = false;
let page;
let browser;
let context;
const controlPrefix = new URL(`__offline_control__/${Date.now()}/`, base).href;
let controlSequence = 0;
const isControlUrl = (url) => typeof url === 'string' && url.startsWith(controlPrefix);
const report = {
  startedAt: new Date().toISOString(),
  base: base.href,
  status: 'RUNNING',
  journeyCompleted: false,
  scope: 'Fresh storage; one Chromium context; production automatic preparation; all required gameplay offline through UI only.',
  expectedAssets,
  viewport: { width: 1280, height: 800 },
  offlineSince: null,
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  cancelledRequests: [],
  httpErrors: [],
  networkControls: [],
  expectedControlFailures: [],
  expectedControlConsole: [],
  controlResponses: [],
  offlineResponses: [],
  warnings: [],
  steps: planned.map(([id, title]) => ({ id, title, status: 'NOT TESTED' })),
  notTested: ['Real school/tablet hardware', 'Perceived construction sound volume', 'Optional 3D viewer', 'Printing', 'All wrong-answer and recovery branches', 'Deployment/CDN behavior outside the supplied URL'],
};
const writeReport = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
const readSave = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY);
const button = (name) => page.getByRole('button', { name, exact: typeof name === 'string' });
const press = async (name) => { const target = button(name); await expect(target).toBeEnabled(); await target.click(); };
const routeIs = (number) => expect(page).toHaveURL(new RegExp(`#/page/${number}$`));

async function networkControl(shouldBeOffline) {
  const url = `${controlPrefix}${++controlSequence}.json`;
  const observed = await page.evaluate(async (url) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      await response.arrayBuffer();
      return { url, navigatorOnLine: navigator.onLine, resolved: true, status: response.status };
    } catch (error) {
      return { url, navigatorOnLine: navigator.onLine, resolved: false, error: String(error), aborted: controller.signal.aborted };
    } finally { window.clearTimeout(timer); }
  }, url);
  report.networkControls.push({ step: currentStep, expectedOffline: shouldBeOffline, ...observed });
  if (shouldBeOffline) {
    assert.equal(observed.resolved, false, 'An uncached network control unexpectedly succeeded while offline');
    assert.equal(observed.aborted, false, 'The control timed out; this is not evidence of network blocking');
    await expect.poll(() => report.expectedControlFailures.find((failure) => failure.url === url)?.error,
      { timeout: 5_000 }).toBe('net::ERR_INTERNET_DISCONNECTED');
  } else {
    assert.equal(observed.resolved, true, 'Online control failed before testing offline mode');
    await expect.poll(() => report.controlResponses.find((response) => response.url === url)?.fromServiceWorker,
      { timeout: 5_000 }).toBe(false);
  }
  return observed;
}
const readProgress = async () => {
  const save = await readSave();
  if (!save) return null;
  return {
    lastPage: save.lastPage,
    completedPages: save.stageProgress?.completedPages,
    completedStages: save.stageProgress?.completed,
    badges: save.badges,
    certificateUnlocked: save.certificateUnlocked,
    artifacts: save.artifacts,
    pageData: save.pageData,
    logCount: save.logs?.length,
  };
};

async function snapshot(id) {
  const screenshot = `${id}.png`;
  await page.screenshot({ path: path.join(output, screenshot), animations: 'disabled', timeout: 20_000 });
  const visibleMedia = await page.locator('img').evaluateAll((images) => images.filter((image) => {
    const box = image.getBoundingClientRect();
    const style = window.getComputedStyle(image);
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight
      && style.visibility !== 'hidden' && style.display !== 'none';
  }).map((image) => ({ src: image.currentSrc || image.src, alt: image.alt, complete: image.complete, naturalWidth: image.naturalWidth })));
  const broken = visibleMedia.filter((image) => image.complete && !image.naturalWidth);
  if (broken.length) report.warnings.push({ step: currentStep, type: 'broken-visible-image', images: broken });
  return { screenshot, url: page.url(), visibleMedia, progress: await readProgress() };
}

async function step(id, run) {
  currentStep = id;
  const item = report.steps.find((entry) => entry.id === id);
  assert(item, `Unplanned step: ${id}`);
  item.status = 'RUNNING';
  item.startedAt = new Date().toISOString();
  console.log(`[RUN] ${id}: ${item.title}`);
  writeReport();
  try {
    item.evidence = await run();
    // Chromium can reset navigator.onLine on a cached navigation while its actual
    // network remains blocked. Preserve the flag as evidence; verify transport.
    if (offline) item.offlineControl = await networkControl(true);
    item.snapshot = await snapshot(id);
    item.status = 'PASS';
    console.log(`[PASS] ${id}`);
  } catch (error) {
    item.status = 'FAIL';
    item.error = error.stack ?? String(error);
    try {
      item.snapshot = await snapshot(`${id}-failure`);
      fs.writeFileSync(path.join(output, `${id}-failure.html`), await page.content());
      item.visibleText = (await page.locator('body').innerText()).slice(0, 16_000);
    } catch (captureError) { item.captureError = String(captureError); }
    throw error;
  } finally {
    item.finishedAt = new Date().toISOString();
    item.durationMs = Date.parse(item.finishedAt) - Date.parse(item.startedAt);
    writeReport();
  }
}

async function completedPage(number) {
  await expect.poll(async () => (await readSave())?.stageProgress?.completedPages ?? []).toContain(number);
}

async function drag(source, destination) {
  await expect(source).toBeVisible();
  await expect(destination).toBeVisible();
  const from = await source.boundingBox();
  const to = await destination.boundingBox();
  assert(from && to, 'Drag source/target has no visible bounds');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  try { await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 }); }
  finally { await page.mouse.up(); }
}

async function droneMapPoint(point) {
  const canvas = page.locator('.phaser-stage canvas');
  const box = await canvas.boundingBox();
  assert(box, 'Drone map canvas is not visible');
  // Observe rendered image/canvas geometry; do not access Phaser/application state.
  const dimensions = await canvas.evaluate(async (element) => {
    const image = new Image();
    image.src = new URL('assets/v5/drone-map-wide.webp', document.baseURI).href;
    await image.decode();
    return { width: Math.max(320, element.width), height: Math.max(300, element.height),
      sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight,
      canvasWidth: element.width, canvasHeight: element.height };
  });
  const scale = Math.min(dimensions.width / dimensions.sourceWidth, dimensions.height / dimensions.sourceHeight);
  const width = dimensions.sourceWidth * scale;
  const height = dimensions.sourceHeight * scale;
  return {
    x: box.x + ((dimensions.width - width) / 2 + width * point.x) * box.width / dimensions.canvasWidth,
    y: box.y + ((dimensions.height - height) / 2 + height * point.y) * box.height / dimensions.canvasHeight,
  };
}

const birdObservations = {
  지구: { zones: ['눈', '깃털', '주변 환경'], statements: [
    '눈은 맑은데 계속 두리번거려', '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어', '숨을 곳이 없고 큰 소리가 계속 들려',
  ], treatment: /은신처/ },
  젤리: { zones: ['눈', '물·먹이', '날개·자세'], statements: [
    '눈이 흐리고 반쯤 감겨 있어', '물이 아침 그대로고 부리가 말라 있어', '날개가 처지고 바닥 가까이 웅크려 있어',
  ], treatment: /물·전해질/ },
};

async function careBird(name) {
  const bird = birdObservations[name];
  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 반짝이는 곳`) })).toBeVisible();
  for (const [index, zone] of bird.zones.entries()) {
    await press(new RegExp(`^${zone} 살펴보기`));
    await press(bird.statements[index]);
    await expect(page.locator('.p5-board li.is-on')).toHaveCount(index + 1);
  }
  await press('다음');
  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 처치 카드를`) })).toBeVisible();
  await press(bird.treatment);
  // Actual public pointer interaction, including drop validation in the product.
  await page.locator('.p5-treatment-token').dragTo(page.locator('.p5-bird'));
  await expect(page.locator('.p5-bird.is-stable')).toBeVisible();
  return { bird: name, observations: bird.statements, treatmentSelector: String(bird.treatment) };
}

async function compareEcology(label, completedCount) {
  await page.getByRole('group', { name: '행동 카드', exact: true }).getByRole('button', { name: label, exact: true }).click();
  await press(`${label} 해 보기`);
  const status = page.locator('.v4-status');
  const numeric = button('숫자를 비교했어');
  let outcome;
  await expect.poll(async () => {
    if ((await status.textContent())?.trim() === `비교 완료 ${completedCount}/3`) return (outcome = 'pictures');
    if (await numeric.isVisible()) return (outcome = 'numeric-fallback');
    return 'pending';
  }, { timeout: 45_000 }).not.toBe('pending');
  if (outcome === 'numeric-fallback') {
    // Keep the student moving via the offered UI, but never call degraded media a clean pass.
    const explanation = await page.getByRole('region', { name: '숫자와 설명으로 비교하기' }).innerText();
    report.warnings.push({ step: currentStep, type: 'ecology-media-degraded', action: label, explanation });
    await numeric.click();
  }
  await expect(status).toHaveText(`비교 완료 ${completedCount}/3`);
  if (outcome === 'pictures') {
    const slider = page.getByRole('slider', { name: '숲 변화 전후 비교 막대', exact: true });
    await expect(slider).toBeEnabled();
    await slider.fill('50');
    await expect(slider).toHaveValue('50');
  }
  const result = (await page.locator('.p7-result').innerText()).trim();
  await snapshot(`ecology-${completedCount}`);
  return { action: label, outcome, result };
}

writeReport();
try {
  browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
  context = await browser.newContext({ viewport: report.viewport, acceptDownloads: true });
  assert.deepEqual(await context.storageState(), { cookies: [], origins: [] }, 'Browser context was not fresh');
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  page = await context.newPage();
  page.setDefaultTimeout(45_000);
  page.setDefaultNavigationTimeout(60_000);
  page.on('pageerror', (error) => report.pageErrors.push({ step: currentStep, offline, error: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const event = { step: currentStep, offline, text: message.text(), location: message.location() };
      if (isControlUrl(event.location.url) || event.text.includes(controlPrefix)) report.expectedControlConsole.push(event);
      else report.consoleErrors.push(event);
    }
  });
  context.on('requestfailed', (request) => {
    const failure = { step: currentStep, offline, url: request.url(), error: request.failure()?.errorText ?? 'unknown' };
    if (isControlUrl(failure.url)) report.expectedControlFailures.push(failure);
    else (failure.error === 'net::ERR_ABORTED' ? report.cancelledRequests : report.failedRequests).push(failure);
  });
  context.on('response', (response) => {
    const observed = { step: currentStep, url: response.url(), status: response.status(),
      resourceType: response.request().resourceType(), fromServiceWorker: response.fromServiceWorker() };
    if (isControlUrl(response.url())) { report.controlResponses.push(observed); return; }
    if (offline) report.offlineResponses.push(observed);
    if (response.status() >= 400) report.httpErrors.push({ step: currentStep, offline, url: response.url(), status: response.status() });
  });

  await step('prepare', async () => {
    await page.goto(`${base.href}#/page/1`);
    await expect(page.getByRole('heading', { name: '미래 직업실', exact: true })).toBeVisible();
    assert.equal(await page.locator('script[src*="/@vite/client"]').count(), 0, 'This is a development server; use a production build');
    await expect(button('이어하기')).toBeDisabled();
    const save = await readSave();
    assert.equal((save?.stageProgress?.completedPages ?? []).length, 0, 'Fresh context already has completed pages');
    assert.equal((save?.artifacts?.photos ?? []).length, 0, 'Fresh context already has photos');
    assert.equal((save?.logs ?? []).length, 0, 'Fresh context already has gameplay logs');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('future-career-lab.teacher-preview')), null);
    await page.evaluate(() => Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('No production service worker after 45 seconds')), 45_000)),
    ]));
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    // Wait for the real automatic preparation. Do not send PREPARE or fill caches manually.
    await page.locator('button[aria-label="수업 자료 상태"][title="그림과 소리 준비 완료"]').waitFor({ timeout: 180_000 });
    const prepared = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const response = await fetch(new URL('classroom-assets.json', registration.scope));
      if (!response.ok) throw new Error(`Classroom manifest returned ${response.status}`);
      const manifest = await response.json();
      const status = await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = window.setTimeout(() => { channel.port1.close(); reject(new Error('CLASSROOM_STATUS timed out')); }, 15_000);
        channel.port1.onmessage = ({ data }) => { window.clearTimeout(timer); channel.port1.close(); resolve(data); };
        registration.active.postMessage({ type: 'CLASSROOM_STATUS' }, [channel.port2]);
      });
      return { status, manifestCount: manifest.files.length, controller: navigator.serviceWorker.controller.scriptURL };
    });
    assert.equal(prepared.status.state, 'ready');
    assert.equal(prepared.status.total, expectedAssets, 'Asset count changed; review the manifest before changing --expected-assets');
    assert.equal(prepared.status.done, expectedAssets, 'Automatic preparation is incomplete');
    assert.equal(prepared.manifestCount, expectedAssets);
    report.prepared = prepared;
    const onlineControl = await networkControl(false);
    return { freshContext: true, teacherPreview: false, ...prepared, onlineControl };
  });

  await step('offline-home', async () => {
    await context.setOffline(true);
    offline = true;
    report.offlineSince = new Date().toISOString();
    const response = await page.reload();
    assert(response && response.ok(), 'Offline home navigation did not return a successful response');
    assert.equal(response.fromServiceWorker(), true, 'Offline home was not served by the service worker');
    await expect(page.getByRole('heading', { name: '미래 직업실', exact: true })).toBeVisible();
    await expect(button('시작하기')).toBeEnabled();
    await expect(button('이어하기')).toBeDisabled();
    return { offlineReloadSucceeded: true, status: response.status(), fromServiceWorker: response.fromServiceWorker() };
  });

  await step('briefing', async () => {
    await press('시작하기');
    await routeIs(2);
    const lines = [await page.locator('.brief-line strong').innerText()];
    for (let index = 0; index < 2; index++) {
      await page.locator('.brief-line').click();
      lines.push(await page.locator('.brief-line strong').innerText());
    }
    assert.equal(new Set(lines).size, 3, 'The three briefing lines were not shown');
    await press('다음');
    const jobs = page.getByRole('group', { name: '직업 캐릭터', exact: true }).getByRole('button');
    await expect(jobs).toHaveCount(4);
    const met = [];
    for (let index = 0; index < 4; index++) {
      await jobs.nth(index).click();
      met.push({ name: (await jobs.nth(index).innerText()).trim(), says: await page.locator('.brief-talk__says').innerText() });
    }
    await expect.poll(async () => (await readSave())?.pageData?.p2Progress?.met?.length).toBe(4);
    await press('출발!');
    await routeIs(3);
    return { lines, met };
  });

  await step('drone', async () => {
    await expect(page.locator('.phaser-stage canvas')).toBeVisible();
    await expect(page.getByLabel('비행 경로 안내')).toContainText('자동 복귀');
    // Phaser installs its pointer listeners after mounting the canvas (same wait as route E2E).
    await page.waitForTimeout(400);
    const targets = [{ x: .36, y: .4 }, { x: .61, y: .66 }, { x: .8, y: .38 }];
    for (const [index, target] of targets.entries()) {
      const point = await droneMapPoint(target);
      await page.mouse.click(point.x, point.y);
      await expect.poll(async () => (await readSave())?.pageData?.p3Waypoints?.length).toBe(index + 1);
    }
    await snapshot('drone-route-before-flight');
    await press('출발!');
    for (const name of ['벌목지', '막힌 물길', '공사장']) {
      // Only click while the public recording control says that this target is centered.
      const record = page.locator('.drone-v4__rec.is-center').filter({ hasText: name });
      await expect(record).toBeVisible();
      await record.click();
    }
    await expect(page.locator('.drone-v4__flight-status')).toHaveText('이륙장으로 복귀 중');
    await expect(page.locator('.drone-v4__rec')).toBeDisabled();
    await expect(page.locator('.drone-v4.is-review')).toBeVisible();
    await expect(page.locator('.photo-card:not(.is-missing)')).toHaveCount(3);
    await completedPage(3);
    const photos = (await readSave()).artifacts.photos;
    assert.deepEqual(photos.map((photo) => photo.id).sort(), ['construction', 'logging', 'stream']);
    await snapshot('drone-returned-with-photos');
    await press('증거판으로');
    await routeIs(4);
    return { route: targets, photos, returnedBeforeAdvancing: true };
  });

  await step('evidence', async () => {
    const photos = page.locator('.p4-photo');
    await expect(photos).toHaveCount(3);
    const details = [];
    for (let index = 0; index < 3; index++) {
      await photos.nth(index).click();
      const observation = page.getByRole('button', { name: /^사진 관찰하기:/ });
      await expect(observation).toBeVisible();
      details.push(await observation.getAttribute('aria-label'));
      // Exercise the now-accessible observation control without a pixel/model shortcut.
      await observation.focus();
      await page.keyboard.press('Enter');
      await press('찾았어! 닫기');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect.poll(async () => (await readSave())?.pageData?.p4Details?.length).toBe(3);
    await press('다음');
    await page.getByRole('group', { name: '가설 고르기', exact: true }).getByRole('button', { name: '물 때문', exact: true }).click();
    await press('이 가설로 정하기');
    await press('배지 받기');
    await completedPage(4);
    assert.equal((await readSave()).artifacts.hypothesis, 'water');
    await press('지구와 젤리 살피러');
    await routeIs(5);
    return { details, initialHypothesis: '물 때문', provisionalHypothesisWillBeComparedLater: true };
  });

  await step('care-jigu', async () => {
    const result = await careBird('지구');
    await snapshot('jigu-recovered');
    await press('젤리 살피기');
    return result;
  });
  await step('care-jelly', async () => {
    const result = await careBird('젤리');
    await press('돌봄 끝내기');
    await completedPage(5);
    const careLog = (await readSave()).artifacts.careLog;
    assert.equal(careLog.length, 2);
    assert.deepEqual(careLog.map((entry) => entry.bird), ['green', 'red']);
    await snapshot('both-birds-recovered');
    await press('새 정원 다시 만들기');
    await routeIs(6);
    return { ...result, careLog };
  });

  await step('garden', async () => {
    const placements = [
      ['물그릇', '조용히 쉬는 곳'], ['숨는 집', '조용히 쉬는 곳'],
      ['놀이 줄', '먹고 노는 곳'], ['먹이 나무', '먹고 노는 곳'],
    ];
    for (const [item, zone] of placements) {
      await button(item).dragTo(button(`${zone} 아이콘 놓는 곳`));
    }
    await expect(page.getByText('물건 4/4', { exact: true })).toBeVisible();
    await press('다음');
    await expect(page.getByRole('heading', { name: '앵무새 불러 보기', exact: true })).toBeVisible();
    await press('시험하기');
    await expect(page.locator('.p6-stars span.is-on')).toHaveCount(3);
    await snapshot('garden-three-stars');
    await press('새 정원 완성');
    await completedPage(6);
    assert.equal((await readSave()).artifacts.habitatStars, 3);
    await press('숲의 다른 새들 보러 가기');
    await routeIs(7);
    return { placements, stars: 3 };
  });

  await step('ecology-traces', async () => {
    await press('숲 둘러보기');
    for (const [index, name] of ['A 숲 가장자리', 'B 개울가', 'C 깊은 숲'].entries()) {
      await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
      const hotspots = page.locator('.p7-scene .v4-hotspot');
      await expect(hotspots).toHaveCount(2);
      await hotspots.nth(0).click();
      await hotspots.nth(1).click();
      await expect(page.locator('.p7-stamps li.is-found')).toHaveCount((index + 1) * 2);
    }
    await press('새 세어 보기');
    const places = await page.getByRole('group', { name: '지점별 새' }).getByRole('button').evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')));
    await press('A 숲 가장자리 새 1마리');
    await press('왜 그럴까?');
    return { collectedTraces: 6, places };
  });
  await step('ecology-compare', async () => {
    const comparisons = [];
    for (const [index, label] of ['나무 심기', '기계 소리 멈추기', '물 채우기'].entries()) {
      comparisons.push(await compareEcology(label, index + 1));
    }
    await expect(button('원인 고르기')).toBeEnabled();
    await expect.poll(async () => (await readSave())?.pageData?.page07Ecology?.compared?.length).toBe(3);
    const before = (await readSave()).pageData.page07Ecology;
    assert.equal(before.trials.length, 3);
    assert.equal(new Set(before.trials.map((trial) => trial.variable)).size, 3);
    // A real reload of the current route: no save edits and no synthetic restoration.
    const response = await page.reload();
    assert(response && response.ok(), 'Offline ecology navigation did not return a successful response');
    assert.equal(response.fromServiceWorker(), true, 'Offline ecology was not served by the service worker');
    await routeIs(7);
    await expect(page.locator('.v4-status')).toHaveText('비교 완료 3/3');
    await expect(button('원인 고르기')).toBeEnabled();
    const restored = (await readSave()).pageData.page07Ecology;
    assert.deepEqual(restored.trials, before.trials, 'Reload changed or duplicated completed trials');
    assert.deepEqual(restored.compared, before.compared, 'Reload lost explicit comparison confirmations');
    return { comparisons, trials: restored.trials, compared: restored.compared, offlineReloadPreserved: true };
  });
  await step('ecology-conclusion', async () => {
    await press('원인 고르기');
    const choices = page.getByRole('group', { name: '가장 큰 원인', exact: true }).getByRole('button');
    await expect(choices).toHaveCount(3);
    // Use the numbers shown to the student, not a model API or injected answer.
    const observed = await choices.evaluateAll((elements) => elements.map((element) => ({
      label: element.getAttribute('aria-label'), count: Number(element.querySelector('small b')?.textContent),
    })));
    assert(observed.every((choice) => Number.isFinite(choice.count)), 'A conclusion card has no displayed bird count');
    const best = [...observed].sort((a, b) => b.count - a.count)[0];
    // First test the student's earlier water hypothesis. A wrong conclusion must
    // show observed-number feedback, preserve the trials, and allow correction.
    await page.getByRole('group', { name: '가장 큰 원인', exact: true }).getByRole('button', { name: /^물 채우기 새/ }).click();
    await press('결과 확정');
    const feedback = page.locator('.p7-conclusion-feedback');
    await expect(feedback).toContainText('물 채우기 뒤에는 1마리 늘었어');
    await expect(feedback).toContainText('다른 행동의 늘어난 수와 비교하고 다시 골라 봐');
    const feedbackText = await feedback.innerText();
    assert(!(await readSave()).stageProgress.completedPages.includes(7), 'An unsupported conclusion incorrectly completed ecology');
    assert.equal((await readSave()).pageData.page07Ecology.trials.length, 3, 'Correction lost the three real comparisons');
    await snapshot('ecology-unsupported-conclusion');
    await page.getByRole('group', { name: '가장 큰 원인', exact: true }).getByRole('button', { name: best.label, exact: true }).click();
    await press('결과 확정');
    await completedPage(7);
    const save = await readSave();
    assert.equal(save.artifacts.graphs.length, 3);
    assert(save.logs.some((entry) => entry.type === 'ecology-revision'), 'The change from the initial water hypothesis was not recorded');
    await press('생방송으로');
    await routeIs(8);
    assert.deepEqual(save.pageData.page07Ecology.conclusionHistory, ['water', 'logging']);
    return { observedChoices: observed, unsupportedConclusion: '물 채우기', feedback: feedbackText,
      selected: best, initialHypothesis: save.artifacts.hypothesis, graphs: save.artifacts.graphs };
  });

  await step('broadcast', async () => {
    await page.getByRole('slider', { name: '오디오 레벨', exact: true }).fill('55');
    await press('방송 시작');
    const segments = [
      { title: '첫 인사', source: '스튜디오 카메라', caption: '지구와 젤리의 구조 소식과 숲 이야기를 전합니다' },
      { title: '현장 보여주기', source: '드론 사진', caption: '숲 옆에서 공사가 진행 중입니다' },
      { title: '조사 결과', source: '스튜디오 카메라', caption: '먹이나무를 늘리자 새가 1마리에서 10마리로 늘었습니다' },
      { title: '시민 부탁', source: '현장 리포터', caption: '새가 먹을 열매나무를 지키고 심어 주세요' },
    ];
    for (const [index, segment] of segments.entries()) {
      await expect(page.getByRole('heading', { name: `${segment.title}: 어떤 화면?`, exact: true })).toBeVisible();
      await press(segment.source);
      const captions = page.getByRole('group', { name: '자막 고르기', exact: true });
      await expect(captions.getByRole('button')).toHaveCount(3);
      await captions.getByRole('button', { name: new RegExp(segment.caption) }).click();
      await expect(button('방송으로 내보내기')).toBeEnabled();
      await snapshot(`broadcast-segment-${index + 1}`);
      // Optional investigation data is deliberately not opened or made a gate.
      await press('방송으로 내보내기');
      if (index === 1) {
        await expect(page.getByRole('heading', { name: '마이크가 끊겼어!', exact: true })).toBeVisible();
        await press('예비 마이크로 바꾸기');
        await expect(page.getByRole('heading', { name: '리포터 목소리가 돌아왔어!', exact: true })).toBeVisible();
        await expect(page.locator('.p8-screen')).toContainText('잘 들리나요? 숲 소식을 계속 전해 드리겠습니다.');
        await snapshot('broadcast-mic-recovered');
        await press('방송 이어가기');
      }
    }
    await expect(page.getByRole('heading', { name: '방송 끝!', exact: true })).toBeVisible();
    await expect(page.locator('.v4-done')).toContainText('방송기술자 배지를 얻었어');
    await expect(page.locator('.v4-done img[alt="방송기술자 배지"]')).toBeVisible();
    await snapshot('broadcast-badge-earned');
    await completedPage(8);
    const save = await readSave();
    assert.deepEqual(save.pageData.p8Broadcast.log.map((entry) => entry.segmentId), ['opening', 'scene', 'cause', 'action']);
    assert.deepEqual(save.pageData.p8Broadcast.reviewedCaptionIds, []);
    assert.deepEqual(save.pageData.p8Broadcast.incidentLog, [{ incidentId: 'mic', actionId: 'mic-swap' }]);
    assert.deepEqual(save.artifacts.clip, { trust: 100, corrections: 0 });
    await press('내 방송 이어 보기');
    return { segments, aired: save.pageData.p8Broadcast.log, microphoneRecovered: true, optionalDataOpened: false };
  });
  await step('broadcast-replay', async () => {
    const replay = page.getByRole('region', { name: '내가 만든 방송', exact: true });
    await expect(replay).toBeVisible();
    // If preceding artifact capture took longer than a scene, return through the
    // public replay controls so this observation still includes the opening.
    if (await button('처음부터 다시 보기').isVisible()) await press('처음부터 다시 보기');
    else for (let index = 0; index < 3 && await button('이전 장면').isEnabled(); index++) await press('이전 장면');
    const displayed = new Map();
    // Observe natural playback, without clock acceleration or clicking past any scene.
    await expect.poll(async () => {
      const scene = await replay.locator('.p8-replay__screen').getAttribute('data-scene');
      const caption = await replay.locator('.p8-replay__caption').innerText();
      if (scene && caption) displayed.set(scene, caption);
      return replay.getByRole('heading', { name: '내 방송을 모두 봤어!', exact: true }).isVisible();
    }, { timeout: 75_000, intervals: [250, 500, 500] }).toBe(true);
    assert.equal(displayed.size, 4, 'The observer did not see all four actual replay scenes');
    await snapshot('broadcast-replay-complete');
    await press('숲 살리기 작전으로');
    await routeIs(9);
    return { mode: 'natural automatic playback', displayed: [...displayed].map(([id, caption]) => ({ id, caption })) };
  });

  await step('cooperation-trees', async () => {
    await expect(page.locator('.coop-team-grid')).toContainText('네가 찍은 사진 3장');
    await expect(page.locator('.coop-team-grid')).toContainText('네가 비교한 3번의 결과');
    await expect(page.locator('.coop-team-grid')).toContainText('네 방송');
    await press('함께 숲으로 가기');
    await press('나무가 베인 곳 도와주기');
    await expect(page.locator('.coop-handoff')).toContainText('1마리에서 10마리');
    for (const [index, site] of ['left', 'right'].entries()) {
      await drag(button('열매나무 묘목'), page.locator(`[data-plant-site="${site}"]`));
      await expect(page.locator('.coop-plant-site.is-planted')).toHaveCount(index + 1);
    }
    await press('함께 나무 돌보기');
    await expect(page.locator('.coop-result')).toBeVisible();
    await snapshot('cooperation-trees-result');
    await press('다른 곳도 도와주기');
    return { placedByPointer: ['left', 'right'], previousEcologyResultVisible: true };
  });
  await step('cooperation-water', async () => {
    await press('막힌 물길 도와주기');
    const scene = page.locator('.coop-water .coop-scene');
    await expect(scene).toBeVisible();
    const box = await scene.boundingBox();
    assert(box);
    await page.mouse.move(box.x + box.width * .27, box.y + box.height * .4);
    await page.mouse.down();
    try { await page.mouse.move(box.x + box.width * .7, box.y + box.height * .4, { steps: 14 }); }
    finally { await page.mouse.up(); }
    await expect(page.locator('.coop-water-target.is-marked')).toBeVisible();
    await press('물길 정비팀에 보내기');
    await expect(page.locator('.coop-result')).toBeVisible();
    await snapshot('cooperation-water-result');
    await press('다른 곳도 도와주기');
    return { markedByPointerSwipe: true };
  });
  await step('cooperation-quiet', async () => {
    await press('숲 옆 공사장 도와주기');
    await expect(page.locator('.coop-handoff')).toContainText('1마리에서 7마리');
    const listen = button('공사 소리 듣기');
    if (await listen.isEnabled()) {
      await listen.click();
      await expect(button('공사 소리 멈추기')).toBeVisible();
    } else {
      report.warnings.push({ step: currentStep, type: 'audio-disabled', note: 'Listening was disabled by actual UI audio settings; no settings were injected.' });
    }
    await press('가림벽 세우기');
    const slider = page.getByRole('slider', { name: '공사 소리 줄이기', exact: true });
    await slider.fill('25');
    await expect(slider).toHaveValue('25');
    await expect(page.locator('.coop-noise-slider output')).toHaveText('조용해');
    await snapshot('cooperation-quiet-choice');
    await press('공사팀에 약속 전하기');
    await expect(page.locator('.coop-result')).toBeVisible();
    return { promise: '가림벽 세우기', previewLevel: 25, actualAudioLoudness: 'NOT TESTED' };
  });
  await step('cooperation-ending', async () => {
    await press('함께 바꾼 숲 보기');
    await expect(page.locator('.coop-ending')).toBeVisible();
    await completedPage(9);
    const slider = page.getByRole('slider', { name: '숲의 전후 모습 비교', exact: true });
    await slider.fill('100');
    await expect(slider).toHaveAttribute('aria-valuetext', '이전 모습 모두 보기');
    await snapshot('forest-before');
    await slider.fill('0');
    await expect(slider).toHaveAttribute('aria-valuetext', '함께 바꾼 모습 모두 보기');
    await snapshot('forest-after');
    await expect(page.getByLabel('함께한 직업').locator('article')).toHaveCount(4);
    const save = await readSave();
    assert.deepEqual([...save.pageData.p9Cooperation.completed].sort(), ['quiet', 'trees', 'water']);
    assert.equal(save.logs.filter((entry) => entry.type === 'cooperation-help').length, 3);
    assert.equal(save.logs.filter((entry) => entry.type === 'alliance-clear').length, 1);
    return { completed: save.pageData.p9Cooperation.completed, comparisonEndpointsVerified: true };
  });
  await step('school-garden', async () => {
    // This is optional in the product, but included in this probe to verify that
    // the forest's successful solution is not blindly reused in a new place.
    await expect(button('수료증 확인하기')).toBeEnabled();
    await press('학교 화단도 도와볼까?');
    await expect(page.getByRole('region', { name: '학교 화단 도와주기' })).toBeVisible();
    await press('나무 더 심기');
    await expect(page.locator('.school-garden__cue')).toContainText('나무는 이미');
    const hint = await page.locator('.school-garden__cue').innerText();
    await snapshot('school-garden-reconsider');
    await press('깨끗한 물 주기');
    const pour = button('꾹 눌러 물 주기');
    let clicks = 0;
    for (; clicks < 4 && await pour.count(); clicks++) await pour.click();
    await expect(page.locator('.school-garden__success')).toContainText('다시 살펴보고 도움을 바꿨어!');
    await expect(page.locator('.school-garden__picture img')).toHaveAttribute('src', /school-garden-after\.webp$/);
    await expect.poll(async () => (await readSave())?.logs?.filter((entry) => entry.type === 'school-garden-help').length).toBe(1);
    const save = await readSave();
    assert.equal(save.pageData.schoolGarden.completed, true);
    assert.equal(save.pageData.schoolGarden.water, 100);
    const evidence = { hint, waterButtonClicks: clicks, state: save.pageData.schoolGarden,
      log: save.logs.find((entry) => entry.type === 'school-garden-help') };
    await snapshot('school-garden-complete');
    await press('수료증 확인하기');
    await routeIs(11);
    return evidence;
  });
  await step('certificate', async () => {
    await expect(page.getByLabel('미래 직업실 탐험 수료증', { exact: true })).toBeVisible();
    const save = await readSave();
    assert.equal(save.certificateUnlocked, true);
    for (const number of [3, 4, 5, 6, 7, 8, 9]) assert(save.stageProgress.completedPages.includes(number), `Missing genuine page completion: ${number}`);
    for (const stage of [1, 2, 3, 4, 5]) assert.equal(save.stageProgress.completed[stage], true);
    assert.equal(save.badges.length, 5);
    assert.equal(new Set(save.badges).size, 5);
    assert.equal(save.artifacts.photos.length, 3);
    assert.equal(save.artifacts.careLog.length, 2);
    assert.equal(save.artifacts.habitatStars, 3);
    assert.equal(save.pageData.page07Ecology.trials.length, 3);
    assert.equal(save.pageData.p8Broadcast.log.length, 4);
    assert.equal(save.pageData.p9Cooperation.completed.length, 3);
    await snapshot('certificate-visible');
    await press('내 탐험 기록');
    const record = page.getByRole('dialog', { name: '내 탐험 기록', exact: true });
    await expect(record.locator('.learning-record-list article')).toHaveCount(7);
    await expect(record.locator('.learning-record-list article.is-missing')).toHaveCount(0);
    const displayedRecord = await record.locator('.learning-record-list').innerText();
    await snapshot('certificate-learning-record');
    await record.getByRole('button', { name: '닫기', exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45_000 }),
      press('수료증 이미지로 저장하기'),
    ]);
    // Keep the downloaded certificate separate from the screen snapshot that
    // the step helper writes after this check.
    const filename = 'certificate-download.png';
    await download.saveAs(path.join(output, filename));
    assert.equal(await download.failure(), null);
    const png = fs.readFileSync(path.join(output, filename));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'Certificate download is not a PNG');
    assert.equal(png.readUInt32BE(16), 1600);
    assert.equal(png.readUInt32BE(20), 1132);
    fs.writeFileSync(path.join(output, 'final-save-observed.json'), JSON.stringify(save, null, 2));
    return { completedStages: save.stageProgress.completed, badges: save.badges, displayedRecord,
      downloaded: { filename, suggestedFilename: download.suggestedFilename(), bytes: png.length, width: 1600, height: 1132 } };
  });

  report.journeyCompleted = true;
  assert(report.offlineResponses.some((response) => response.fromServiceWorker && response.resourceType === 'script'), 'No offline script response was verified from the service worker');
  assert(report.offlineResponses.some((response) => response.fromServiceWorker && response.resourceType === 'image'), 'No offline image response was verified from the service worker');
  report.offlineSummary = {
    blockedControls: report.expectedControlFailures.filter((failure) => failure.error === 'net::ERR_INTERNET_DISCONNECTED').length,
    serviceWorkerResponses: report.offlineResponses.filter((response) => response.fromServiceWorker).length,
    uniqueServiceWorkerUrls: new Set(report.offlineResponses.filter((response) => response.fromServiceWorker).map((response) => response.url)).size,
    navigatorOnLine: 'Observed only; never spoofed or used as the transport assertion',
  };
  // A completed journey with missing resources/errors remains a release FAIL.
  const problems = report.pageErrors.length + report.consoleErrors.length + report.failedRequests.length + report.httpErrors.length;
  const mediaProblems = report.warnings.filter((warning) => ['broken-visible-image', 'ecology-media-degraded'].includes(warning.type)).length;
  report.status = problems || mediaProblems ? 'FAIL' : report.warnings.length ? 'WARNING' : 'PASS';
  if (report.status === 'FAIL') report.failure = 'Gameplay completed, but runtime/resource/media failures require investigation; inspect the separate error arrays.';
} catch (error) {
  report.status = 'FAIL';
  report.failure = { step: currentStep, error: error.stack ?? String(error), url: page?.url() };
  console.error(`[FAIL] ${currentStep}: ${error.message ?? error}`);
} finally {
  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  report.offlineAtEnd = offline;
  report.blockedSteps = report.steps.filter((item) => item.status === 'NOT TESTED').map((item) => ({ id: item.id, title: item.title, reason: 'The earlier failing step prevented this UI from being reached.' }));
  if (context) {
    try { await context.tracing.stop({ path: path.join(output, 'trace.zip') }); }
    catch (error) { report.traceError = String(error); }
  }
  writeReport();
  await context?.close();
  await browser?.close();
  console.log(`${report.status}: ${report.steps.filter((item) => item.status === 'PASS').length}/${planned.length} steps passed. Report: ${path.join(output, 'report.json')}`);
  if (report.status === 'FAIL') process.exitCode = 1;
}

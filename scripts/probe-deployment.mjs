/* global document, window */
// Run after deployment and the local production build. This never changes application files or a user's browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash, randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';

const requestedUrl = process.argv.find((argument) => argument.startsWith('--url='))?.slice(6);
const base = new URL(requestedUrl || 'https://16job.vercel.app/');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
  throw new Error('--url must be an HTTP(S) deployment URL without credentials, query, or fragment.');
}
base.pathname = `${base.pathname.replace(/\/$/, '')}/`;
const output = path.resolve('test-results/deployment-20260912');
const saveKey = 'future-career-lab.save.v1';
const routes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]; // Retired page 10 redirects; it is not an active screen.
const report = {
  startedAt: new Date().toISOString(), base: base.href,
  scope: 'Post-deployment HTTP/metadata checks, fresh student start/save/reload, and separate teacher-preview rendering. No student mission completion is inferred from preview.',
  failures: [], warnings: [], pages: [], screenshots: [],
  notTested: [
    'Actual school network, physical tablets, and a classroom of concurrent users',
    'Account-specific image/voice/3D generation contracts and rights ownership',
    'A fresh student completing every mission and every optional branch',
    'Offline gameplay acceptance (use the separate offline probe and its stated scope)',
    'Final Git staging, remote branch contents, and operator account settings',
  ],
};
const hash = (body) => createHash('sha256').update(body).digest('hex');
const fail = (message) => report.failures.push(message);
const assetUrl = (pathname) => new URL(pathname.replace(/^\//, ''), base).href;
const safeUrl = (value) => { try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return String(value); } };
const fetchResource = (url, options = {}) => fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000), ...options });
const freshUrl = (pathname) => `${assetUrl(pathname)}?deployment-check=${randomUUID()}`;
const mime = (response) => (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
const expectedTypes = {
  '.html': ['text/html'], '.js': ['application/javascript', 'text/javascript'], '.css': ['text/css'],
  '.json': ['application/json'], '.webmanifest': ['application/manifest+json', 'application/json'],
  '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'], '.webp': ['image/webp'],
  '.svg': ['image/svg+xml'], '.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
  '.woff2': ['font/woff2', 'application/font-woff2'], '.woff': ['font/woff', 'application/font-woff'],
  '.glb': ['model/gltf-binary', 'application/octet-stream'], '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'], '.ogg': ['audio/ogg', 'application/ogg'],
  '.txt': ['text/plain'], '.mp4': ['video/mp4'], '.webm': ['video/webm'],
};

function metadata(html) {
  const values = {};
  for (const tag of html.match(/<(?:meta|link)\b[^>]*>/gi) || []) {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [match[1].toLowerCase(), match[2] ?? match[3]]));
    const key = attributes.property || attributes.name || (attributes.rel === 'canonical' ? 'canonical' : null);
    if (key) values[key] = attributes.content ?? attributes.href;
  }
  values.title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();
  return values;
}

function jpegDimensions(bytes) {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw new Error('OG response is not a JPEG.');
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset++] !== 0xff) continue;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if ([0xd8, 0xd9, 0x01].includes(marker) || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions were not found.');
}

function normalizeManifest(manifest) {
  if (typeof manifest.version !== 'string' || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error('Invalid classroom asset manifest.');
  const seen = new Set();
  return manifest.files.map((file) => {
    if (typeof file.url !== 'string' || !file.url.startsWith('/') || file.url.startsWith('//') || /[?#\\]/.test(file.url) || file.url.split('/').includes('..') || seen.has(file.url)) {
      throw new Error('Manifest contains an unsafe or duplicate asset path.');
    }
    if (!Number.isInteger(file.bytes) || file.bytes <= 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error(`Invalid manifest integrity record: ${file.url}`);
    seen.add(file.url);
    return { url: file.url, bytes: file.bytes, sha256: file.sha256 };
  }).sort((a, b) => a.url.localeCompare(b.url));
}

async function inspectHttp() {
  const [distManifestText, distHtml, selectedOg] = await Promise.all([
    fs.readFile('dist/classroom-assets.json', 'utf8'), fs.readFile('dist/index.html', 'utf8'), fs.readFile('public/og-career-team.jpg'),
  ]);
  const expected = JSON.parse(distManifestText);
  const expectedFiles = normalizeManifest(expected);
  report.expectedBuild = { version: expected.version, files: expectedFiles.length, totalBytes: expected.totalBytes };
  const htmlResponse = await fetchResource(freshUrl(''));
  const html = await htmlResponse.text();
  report.document = { status: htmlResponse.status, type: mime(htmlResponse), finalUrl: safeUrl(htmlResponse.url) };
  if (htmlResponse.status !== 200 || mime(htmlResponse) !== 'text/html' || new URL(htmlResponse.url).origin !== base.origin) fail('Deployment home is unavailable, protected, or redirected off the target origin.');
  const localMeta = metadata(distHtml);
  const liveMeta = metadata(html);
  const keys = ['title', 'description', 'canonical', 'og:type', 'og:locale', 'og:site_name', 'og:url', 'og:title', 'og:description', 'og:image', 'og:image:secure_url', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
  report.metadata = keys.map((key) => ({ key, expected: localMeta[key] ?? null, actual: liveMeta[key] ?? null, matches: Boolean(localMeta[key]) && liveMeta[key] === localMeta[key] }));
  for (const item of report.metadata) if (!item.matches) fail(`Deployment metadata differs from the built page: ${item.key}`);
  if (liveMeta.canonical !== 'https://16job.vercel.app/' || liveMeta['og:image'] !== 'https://16job.vercel.app/og-career-team.jpg') fail('Canonical URL or selected production OG image changed.');
  const ogResponse = await fetchResource(freshUrl('og-career-team.jpg'));
  const ogBytes = Buffer.from(await ogResponse.arrayBuffer());
  let dimensions = null;
  try { dimensions = jpegDimensions(ogBytes); } catch (error) { fail(error.message); }
  report.og = { status: ogResponse.status, type: mime(ogResponse), bytes: ogBytes.length, sha256: hash(ogBytes), expectedSha256: hash(selectedOg), dimensions };
  if (ogResponse.status !== 200 || mime(ogResponse) !== 'image/jpeg' || hash(ogBytes) !== hash(selectedOg)) fail('Deployed OG is not the selected JPEG.');
  if (!dimensions || dimensions.width !== dimensions.height * 2 || Number(liveMeta['og:image:width']) !== dimensions.width || Number(liveMeta['og:image:height']) !== dimensions.height) fail('OG JPEG and metadata must agree on a 2:1 aspect ratio.');
  const manifestResponse = await fetchResource(freshUrl('classroom-assets.json'));
  report.manifest = { status: manifestResponse.status, type: mime(manifestResponse) };
  if (manifestResponse.status !== 200 || mime(manifestResponse) !== 'application/json') fail('Classroom manifest is unavailable or has the wrong MIME type.');
  try {
    const deployed = await manifestResponse.json();
    const files = normalizeManifest(deployed);
    Object.assign(report.manifest, { version: deployed.version, files: files.length, totalBytes: deployed.totalBytes, versionMatches: deployed.version === expected.version, inventoryMatches: JSON.stringify(files) === JSON.stringify(expectedFiles) });
    if (!report.manifest.versionMatches || !report.manifest.inventoryMatches || deployed.totalBytes !== expected.totalBytes) fail('Deployed version/inventory differs from the latest local dist. Rebuild or deploy the intended build.');
  } catch (error) { fail(`Cannot validate deployed classroom manifest: ${error.message}`); }

  // Use the validated local inventory, never an arbitrary URL supplied by a remote manifest.
  report.assetChecks = [];
  for (let offset = 0; offset < expectedFiles.length; offset += 8) {
    const checks = await Promise.allSettled(expectedFiles.slice(offset, offset + 8).map(async (file) => {
      const response = await fetchResource(assetUrl(file.url), { method: 'HEAD' });
      const allowed = expectedTypes[path.extname(file.url).toLowerCase()] || [];
      const type = mime(response);
      return { url: file.url, status: response.status, type, expectedTypes: allowed, ok: response.status === 200 && allowed.includes(type) };
    }));
    checks.forEach((check, index) => {
      const item = check.status === 'fulfilled' ? check.value : { url: expectedFiles[offset + index].url, ok: false, error: String(check.reason) };
      report.assetChecks.push(item);
      if (!item.ok) fail(`Asset HEAD failed: ${item.url} (${item.status ?? 'request error'} ${item.type ?? item.error})`);
    });
  }
  const conversions = JSON.parse(await fs.readFile('docs/ASSET-OPTIMIZATION-20260912.json', 'utf8'));
  report.legacyImageAliases = [];
  for (const item of conversions.images) {
    const response = await fetchResource(freshUrl(item.source));
    const body = Buffer.from(await response.arrayBuffer());
    const actualHash = hash(body);
    const ok = response.status === 200 && mime(response) === 'image/webp' && actualHash === item.runtimeSha256;
    report.legacyImageAliases.push({ source: item.source, runtime: item.runtime, status: response.status, type: mime(response), sha256: actualHash, ok });
    if (!ok) fail(`Legacy image alias failed: ${item.source}`);
  }
  const missing = await fetchResource(assetUrl(`__deployment-missing-${randomUUID()}.webp`));
  report.missingAsset = { status: missing.status, type: mime(missing), finalUrl: safeUrl(missing.url) };
  await missing.arrayBuffer();
  if (missing.status !== 404) fail(`A nonexistent image returned ${missing.status}; check catch-all rewrites or access protection.`);
}

function observePage(page) {
  const events = { runtimeErrors: [], consoleErrors: [], failedRequests: [], cancelledRequests: [], httpErrors: [] };
  page.on('pageerror', (error) => events.runtimeErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') events.consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => {
    const entry = { url: safeUrl(request.url()), error: request.failure()?.errorText || 'Unknown request error' };
    (entry.error === 'net::ERR_ABORTED' ? events.cancelledRequests : events.failedRequests).push(entry);
  });
  page.on('response', (response) => { if (response.status() >= 400) events.httpErrors.push({ url: safeUrl(response.url()), status: response.status() }); });
  return events;
}

async function waitForScreen(page, number) {
  await page.locator(`.game-shell.page-${number}`).waitFor({ timeout: 30000 });
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 10000))]));
}

async function saveSummary(page) {
  return page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key) || 'null');
    if (!save) return null;
    // Deliberately omit names and log contents. This is an isolated synthetic student, not a user record.
    return { schemaVersion: save.schemaVersion, contentVersion: save.contentVersion, sessionSeed: save.sessionSeed, lastPage: save.lastPage, completedPages: save.stageProgress.completedPages, badges: save.badges, logCount: save.logs.length, pageDataKeys: Object.keys(save.pageData).sort(), certificateUnlocked: save.certificateUnlocked };
  }, saveKey);
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name), fullPage: true });
  report.screenshots.push(path.relative(process.cwd(), path.join(output, name)).replaceAll('\\', '/'));
}

async function headerBounds(page) {
  return page.evaluate(() => {
    const rect = (element) => { const r = element?.getBoundingClientRect(); return r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null; };
    const header = document.querySelector('.topbar');
    const title = document.querySelector('.title-lockup');
    const actions = header?.querySelector('.topbar-actions');
    const buttons = [...(header?.querySelectorAll('button') || [])].map((button) => ({ label: button.getAttribute('aria-label') || button.textContent.trim(), rect: rect(button) })).filter((button) => button.rect.width > 0);
    const clippedText = [...(header?.querySelectorAll('.title-lockup h1, .title-lockup__heading, .classroom-status-summary') || [])].filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.textContent.trim());
    return { header: rect(header), stage: rect(document.querySelector('.game-shell')), main: rect(document.querySelector('.game-content')), title: rect(title), actions: rect(actions), heading: title?.textContent.trim() || '', statusVisible: Boolean(header?.querySelector('.classroom-status-button')), buttons, clippedText, viewport: { width: window.innerWidth, height: window.innerHeight } };
  });
}

function validateHeader(bounds, number) {
  const errors = [];
  const tolerance = 0.75;
  const { header, stage, title, actions, main, buttons } = bounds;
  if (!header || !stage || !main || !actions) return ['Header measurement target is missing.'];
  if (!bounds.statusVisible) errors.push('Production classroom status control is missing.');
  if (header.left < stage.left - tolerance || header.right > stage.right + tolerance) errors.push('Header extends beyond the stage.');
  if (number !== 1 && header.bottom > main.top + tolerance) errors.push('Header overlaps the main content.');
  if (title && title.right > actions.left + tolerance) errors.push('Title overlaps the actions.');
  for (const button of buttons) {
    const r = button.rect;
    if (r.width < 47.9 || r.height < 47.9) errors.push(`Touch target below 48 px: ${button.label}`);
    if (r.left < header.left - tolerance || r.right > header.right + tolerance || r.top < header.top - tolerance || r.bottom > header.bottom + tolerance) errors.push(`Button extends beyond the header: ${button.label}`);
  }
  for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
    const a = buttons[i].rect; const b = buttons[j].rect;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance) errors.push(`Header buttons overlap: ${buttons[i].label} / ${buttons[j].label}`);
  }
  if (bounds.clippedText.length) report.warnings.push(`Page ${number} header text is clipped at 1024 px: ${bounds.clippedText.join(' / ')}`);
  return errors;
}

async function inspectStudent(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const events = observePage(page);
  report.student = { scope: 'Fresh home → Start → page 2 → persistent save → reload. No fixture injected.', events };
  try {
    await page.goto(`${base.href}#/page/1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForScreen(page, 1);
    await page.getByRole('button', { name: '시작하기', exact: true }).waitFor();
    await screenshot(page, 'home.png');
    await page.getByRole('button', { name: '시작하기', exact: true }).click();
    await page.waitForURL('**/#/page/2', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForScreen(page, 2);
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || 'null')?.lastPage === 2, saveKey, { timeout: 15000 });
    const before = await saveSummary(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForScreen(page, 2);
    const after = await saveSummary(page);
    Object.assign(report.student, { before, after, persisted: JSON.stringify(before) === JSON.stringify(after), currentPage: new URL(page.url()).hash });
    if (!report.student.persisted || after?.lastPage !== 2 || after?.sessionSeed == null) fail('Fresh student save changed or disappeared after reload.');
    await screenshot(page, 'student-reloaded.png');
  } catch (error) { fail(`Student start/save/reload: ${error.message}`); }
  finally { await context.close(); }
}

async function inspectTeacher(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  const events = observePage(page);
  report.teacher = { scope: 'Separate teacher preview, all 10 active routes at 1024×768, without completion fixtures. Header checks cover rendered status text, not all possible cache-error messages.', events };
  try {
    await page.goto(`${base.href}#/page/1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForScreen(page, 1);
    await page.evaluate(() => sessionStorage.setItem('future-career-lab.teacher-preview', 'true'));
    // Reload the provider before navigating; changing a hash alone does not re-read the preview flag.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForScreen(page, 1);
    for (const number of routes) {
      const item = { number, brokenImages: [], headerErrors: [] };
      report.pages.push(item);
      try {
        await page.goto(`${base.href}#/page/${number}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForScreen(page, number);
        await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, { timeout: 15000 });
        item.brokenImages = await page.locator('img').evaluateAll((images) => images.filter((image) => image.currentSrc && image.naturalWidth === 0).map((image) => ({ src: image.currentSrc.split(/[?#]/)[0], alt: image.alt })));
        item.header = await headerBounds(page);
        item.headerErrors = validateHeader(item.header, number);
        if (item.brokenImages.length) fail(`Broken rendered image on teacher-preview page ${number}.`);
        for (const error of item.headerErrors) fail(`Page ${number}: ${error}`);
        if (number === 9) await screenshot(page, 'stage5-1024.png');
      } catch (error) { item.error = error.message; fail(`Teacher-preview page ${number}: ${error.message}`); }
    }
    const measured = report.pages.filter((item) => item.header?.title && item.header?.actions);
    // Smallest title/actions gap is the most crowded measured header, with text length as a tie-breaker.
    measured.sort((a, b) => (a.header.actions.left - a.header.title.right) - (b.header.actions.left - b.header.title.right) || b.header.heading.length - a.header.heading.length);
    if (measured.length) {
      const worst = measured[0];
      report.teacher.mostCrowdedHeaderPage = worst.number;
      await page.goto(`${base.href}#/page/${worst.number}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForScreen(page, worst.number);
      await screenshot(page, 'header-1024.png');
    }
    const save = await saveSummary(page);
    report.teacher.progress = save;
    if (save?.completedPages.length || save?.certificateUnlocked) fail('Teacher route previews unexpectedly granted student completion.');
  } catch (error) { fail(`Teacher preview setup: ${error.message}`); }
  finally { await context.close(); }
}

await fs.mkdir(output, { recursive: true });
let browser;
try {
  try { await inspectHttp(); } catch (error) { fail(`HTTP/build inspection: ${error.message}`); }
  browser = await chromium.launch({ headless: true });
  await inspectStudent(browser);
  await inspectTeacher(browser);
  for (const lane of ['student', 'teacher']) {
    const events = report[lane]?.events;
    if (!events) continue;
    for (const kind of ['runtimeErrors', 'consoleErrors', 'failedRequests', 'httpErrors']) if (events[kind].length) fail(`${lane}: ${events[kind].length} ${kind}; see report details.`);
  }
} catch (error) { fail(`Deployment probe: ${error.message}`); }
finally {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = report.failures.length === 0;
  await fs.writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ passed: report.passed, target: base.href, expectedBuild: report.expectedBuild, deployedVersion: report.manifest?.version, assetsChecked: report.assetChecks?.length ?? 0, routesChecked: report.pages.length, failures: report.failures, warnings: report.warnings, report: path.join(output, 'report.json') }, null, 2));
  if (!report.passed) process.exitCode = 1;
}

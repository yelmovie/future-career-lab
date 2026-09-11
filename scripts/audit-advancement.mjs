// 고도화 전이·엔딩·수료증 시각 QA. 이미 실행 중인 로컬 서버만 사용한다.
// 사용: node scripts/audit-advancement.mjs [output-directory]
// 필요 시 ADVANCEMENT_BASE=http://127.0.0.1:4185 로 서버 주소를 지정한다.
/* global document, getComputedStyle, HTMLElement, Node */
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BASE = process.env.ADVANCEMENT_BASE ?? 'http://127.0.0.1:4185';
const outDir = path.resolve(process.argv[2] ?? 'test-results/advancement-20260910/visual');
const SAVE_KEY = 'future-career-lab.save.v1';
fs.mkdirSync(outDir, { recursive: true });

function fixture() {
  return {
    schemaVersion: 3, contentVersion: '2026.09', sessionSeed: 42, playerName: '시각 검증 탐험가', lastPage: 9,
    stageProgress: { completed: { 1: true, 2: true, 3: true, 4: true, 5: false }, completedPages: [3, 4, 5, 6, 7, 8] },
    badges: ['드론 현장가 배지', '동물돌봄 배지', '생태연구가 배지', '방송기술자 배지'],
    jobCards: ['드론 현장가', '동물돌봄 전문가', '생태연구가', '미래방송기술자'],
    traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [], dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: {
      photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'edge' }],
      hypothesis: 'water',
      careLog: [{ bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' }, { bird: 'red', issue: '탈수', treatment: '물·전해질' }],
      habitatStars: 3, traces: ['tree-cut', 'sound-chainsaw', 'feather-brown', 'sound-forest-birds', 'foot-songbird', 'feather-blue'],
      graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'sub' }, { variable: 'water', verdict: 'none' }],
      clip: { trust: 90, corrections: 1 }, allianceTurns: null,
    },
    pageData: {
      p9Alliance: { phase: 'transfer', solo: 'ecology', index: 2, turn: 3, attempts: 12 },
      page06Design: { placed: { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] }, result: { waterQuiet: true, hideoutQuiet: true, activityReady: true, stars: 3 }, attempts: 2, revisions: 2 },
      page07Ecology: { conclusionHistory: ['water', 'logging'] },
    },
    updatedAt: new Date().toISOString(),
  };
}

function measure() {
  const stage = document.querySelector('.stage');
  const stageBox = stage.getBoundingClientRect();
  const scale = stageBox.width / stage.offsetWidth;
  const modal = [...document.querySelectorAll('.modal-backdrop')].at(-1);
  const scope = modal ?? stage;
  const round = (number) => Math.round(number * 100) / 100;
  const boxOf = (element) => {
    const r = element.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
  };
  const visible = (element) => element instanceof HTMLElement && element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !element.closest('.sr-only,.skip-link,[inert]');
  const label = (element) => (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 130);
  const name = (element) => `${element.tagName.toLowerCase()}${typeof element.className === 'string' && element.className ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}`;
  const outside = (box, boundary) => box.left < boundary.left - 1.5 || box.right > boundary.right + 1.5 || box.top < boundary.top - 1.5 || box.bottom > boundary.bottom + 1.5;
  const controls = [];
  const fonts = [];
  const clipping = [];
  const scrollAreas = [];

  for (const element of scope.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="tab"]')) {
    if (!visible(element)) continue;
    const box = boxOf(element);
    controls.push({ element: name(element), label: label(element), ...box, below48: box.width < 47.5 || box.height < 47.5 });
    if (outside(element.getBoundingClientRect(), stageBox)) clipping.push({ kind: 'control-off-stage', element: name(element), label: label(element), box });
  }
  for (const element of scope.querySelectorAll('*')) {
    if (!visible(element) || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') continue;
    const style = getComputedStyle(element);
    if (element.scrollHeight > element.clientHeight + 2 && ['auto', 'scroll'].includes(style.overflowY)) {
      scrollAreas.push({ element: name(element), clientHeight: element.clientHeight, scrollHeight: element.scrollHeight });
    }
    const textNodes = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!textNodes.length) continue;
    fonts.push({ element: name(element), text: textNodes.map((node) => node.textContent.trim()).join(' '), cssPx: Number.parseFloat(style.fontSize), effectivePx: round(Number.parseFloat(style.fontSize) * scale), below16: Number.parseFloat(style.fontSize) * scale < 15.9 });
    for (const node of textNodes) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const textBox of range.getClientRects()) {
        if (textBox.width < 1 || textBox.height < 1) continue;
        let ancestor = element;
        while (ancestor && ancestor !== document.body) {
          const ancestorStyle = getComputedStyle(ancestor);
          const clips = ['hidden', 'clip', 'auto', 'scroll'].includes(ancestorStyle.overflowY) || ['hidden', 'clip', 'auto', 'scroll'].includes(ancestorStyle.overflowX);
          if (clips && outside(textBox, ancestor.getBoundingClientRect())) {
            const isScrollable = ['auto', 'scroll'].includes(ancestorStyle.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 2;
            if (!isScrollable) clipping.push({ kind: 'text-clipped', element: name(element), text: node.textContent.trim(), by: name(ancestor) });
            break;
          }
          // 고정 오버레이는 일반 문서 흐름의 main overflow를 벗어나 렌더링된다.
          if (ancestorStyle.position === 'fixed') break;
          ancestor = ancestor.parentElement;
        }
      }
    }
  }
  return { scale: round(scale), stage: boxOf(stage), controls, smallControls: controls.filter((item) => item.below48), fonts, smallFonts: fonts.filter((item) => item.below16), clipping, scrollAreas };
}

const report = [];
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) missing.push({ status: response.status(), url: response.url() }); });
    const prefix = `${viewport.width}x${viewport.height}`;
    const capture = async (state) => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
      });
      const result = await page.evaluate(measure);
      const screenshot = path.join(outDir, `${prefix}-${state}.png`);
      await page.screenshot({ path: screenshot, animations: 'disabled' });
      report.push({ state, viewport, screenshot, ...result });
      console.log(`${prefix} ${state}: clipping=${result.clipping.length}, small-controls=${result.smallControls.length}, small-fonts=${result.smallFonts.length}, scroll-areas=${result.scrollAreas.length}`);
    };
    try {
      // Seed once before the application starts. Later state changes are all visible user actions.
      await page.addInitScript(({ key, save }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save));
      }, { key: SAVE_KEY, save: fixture() });
      await page.goto(`${BASE}/#/page/9`);
      await expect(page.getByRole('heading', { name: '새 공원의 새들도 도와주자', exact: true })).toBeVisible();
      await capture('p9-transfer-start');
      await page.getByRole('button', { name: /열매 나무 심기/ }).click();
      await page.getByRole('button', { name: '모든 공원에 같은 도움이 필요해서', exact: true }).click();
      await page.getByRole('button', { name: '이 방법으로 도와주기', exact: true }).click();
      await expect(page.locator('.transfer-feedback')).toContainText('공원마다 필요한 도움이 달라');
      await capture('p9-transfer-wrong');
      await page.getByRole('button', { name: /깨끗한 물 채우기/ }).click();
      await page.getByRole('button', { name: '이 공원에서 새가 가장 많이 늘어서', exact: true }).click();
      await page.getByRole('button', { name: '이 방법으로 도와주기', exact: true }).click();
      await expect(page.locator('.transfer-feedback.is-success')).toBeVisible();
      await capture('p9-transfer-correct');
      await page.getByRole('button', { name: '되살아난 숲 보러 가기', exact: true }).click();
      await expect(page.getByRole('heading', { name: '푸른솔 숲에 새소리가 돌아왔어', exact: true })).toBeVisible();
      await capture('p9-ending');
      await page.getByRole('button', { name: '수료증 확인하기', exact: true }).click();
      await expect(page.getByRole('heading', { name: '미래 직업실 탐험 수료증', exact: true })).toBeVisible();
      await capture('p11-certificate');
      await page.getByRole('button', { name: '내 탐험 기록', exact: true }).click();
      await expect(page.getByRole('heading', { name: '내 탐험 기록', exact: true })).toBeVisible();
      await capture('p11-learning-record');
      const recordBody = page.locator('.modal-body');
      await recordBody.hover();
      await page.mouse.wheel(0, 600);
      await capture('p11-learning-record-lower');
      const finalSave = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
      report.push({ state: 'flow-result', viewport, transfer: finalSave.pageData?.p9Transfer, completedPages: finalSave.stageProgress?.completedPages, certificateUnlocked: finalSave.certificateUnlocked, errors, missing });
    } catch (error) {
      const screenshot = path.join(outDir, `${prefix}-ERROR.png`);
      await page.screenshot({ path: screenshot }).catch(() => undefined);
      report.push({ state: 'ERROR', viewport, error: String(error), screenshot, errors, missing });
      process.exitCode = 1;
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  const lines = ['# 고도화 화면 실측', '', '대상: 전이 도전 → 수정 → 엔딩 → 수료증 → 탐험 기록. 시작 저장값만 QA fixture이며, 이후 진행은 실제 UI 조작.', '', '| 화면 | 크기 | 잘림 | 48px 미만 조작 | 16px 미만 글자 | 스크롤 영역 |', '|---|---|---:|---:|---:|---:|'];
  for (const item of report.filter((entry) => entry.controls)) lines.push(`| ${item.state} | ${item.viewport.width}×${item.viewport.height} | ${item.clipping.length} | ${item.smallControls.length} | ${item.smallFonts.length} | ${item.scrollAreas.length} |`);
  for (const item of report) {
    if (item.error) lines.push('', `실행 오류: ${item.error}`);
    if (!item.clipping?.length && !item.smallFonts?.length && !item.smallControls?.length) continue;
    lines.push('', `## ${item.viewport.width}×${item.viewport.height} ${item.state}`);
    for (const issue of item.clipping ?? []) lines.push(`- 잘림: ${issue.element} — ${issue.text ?? issue.label} (${issue.by ?? ''})`);
    for (const issue of item.smallControls ?? []) lines.push(`- 조작 ${issue.width}×${issue.height}px: ${issue.label}`);
    for (const issue of item.smallFonts ?? []) lines.push(`- 글자 ${issue.effectivePx}px: ${issue.text}`);
  }
  fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'));
  console.log(`Visual report: ${path.join(outDir, 'report.json')}`);
}

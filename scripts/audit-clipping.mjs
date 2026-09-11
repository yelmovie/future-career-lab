// 화면 잘림·클릭 불가 자동 점검.
// 대표 상태(페이지·단계·팝업)를 실제 브라우저로 열어 놓고, 무대(#stage) 밖으로 나간 요소,
// overflow 로 잘린 요소, 스크롤이 생긴 컨테이너, 다른 요소에 가려진 버튼, 작은 터치 영역을 찾는다.
// 사용: node scripts/audit-clipping.mjs [outDir]   선택: SHOT_VIEWPORT=1024x768  SHOT_NAMES=p05-step1,p08-audio  TEACHER=1
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const outDir = process.argv[2] ?? 'test-results/audit';
fs.mkdirSync(outDir, { recursive: true });
const SAVE_KEY = 'future-career-lab.save.v1';
const TEACHER_KEY = 'future-career-lab.teacher-preview';
const PORT = Number(process.env.PORT ?? 4179);
const BASE = `http://127.0.0.1:${PORT}`;

const photos = [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }];
const graphs = [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'sub' }, { variable: 'water', verdict: 'none' }];
const makeSave = (patch = {}) => ({
  schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '테스트 탐험가', lastPage: 1,
  stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [] },
  badges: [], jobCards: [], traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
  logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
  audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
  artifacts: { photos, hypothesis: 'logging', careLog: [], habitatStars: 3, traces: [], graphs, clip: { trust: 90, corrections: 0 }, allianceTurns: null },
  updatedAt: new Date().toISOString(),
  ...patch,
});
const fresh = makeSave({ playerName: '', artifacts: { photos: [], hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null } });
const midway = makeSave({ stageProgress: { completed: { 1: true, 2: false, 3: false, 4: false, 5: false }, completedPages: [3, 4] } });
const done = makeSave({ lastPage: 10, stageProgress: { completed: { 1: true, 2: true, 3: true, 4: true, 5: true }, completedPages: [3, 4, 5, 6, 7, 8, 9] }, certificateUnlocked: true, artifacts: { photos, hypothesis: 'logging', careLog: [], habitatStars: 3, traces: [], graphs, clip: { trust: 90, corrections: 0 }, allianceTurns: 3 } });
const relayAt = (index, turn, phase = 'turn') => makeSave({ stageProgress: midway.stageProgress, pageData: { p9Alliance: { phase, index, turn, attempts: index * 4 + turn, solo: 'drone' } } });
const ecologyAt = (step, extra = {}) => makeSave({ pageData: { page07Ecology: { step, point: 'A', found: [], fewest: step >= 3, trials: [], active: null, lastTrial: null, main: null, ...extra } } });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const next = (p) => p.locator('.v4-next');

/** @type {Array<{ name: string; page: number; save?: object; teacher?: boolean; act?: (p: import('@playwright/test').Page) => Promise<void> }>} */
const STATES = [
  { name: 'p01-fresh', page: 1, save: fresh },
  { name: 'p01-talk-student', page: 1, save: fresh, act: async (p) => { await p.getByRole('button', { name: '신입 탐험가에게 말 걸기' }).click(); } },
  { name: 'p01-talk-mentor', page: 1, save: fresh, act: async (p) => { await p.getByRole('button', { name: '탐험단장에게 말 걸기' }).click(); } },
  { name: 'p01-progress', page: 1, save: midway },
  { name: 'p01-reset-modal', page: 1, save: midway, act: async (p) => { await p.getByRole('button', { name: /시작하기/ }).click(); } },
  { name: 'p01-settings', page: 1, save: midway, act: async (p) => { await p.getByRole('button', { name: '설정 열기' }).click(); } },
  { name: 'p01-settings-howto', page: 1, save: midway, act: async (p) => { await p.getByRole('button', { name: '설정 열기' }).click(); await p.getByRole('tab', { name: '게임 방법' }).click(); } },
  { name: 'p01-settings-info', page: 1, save: midway, act: async (p) => { await p.getByRole('button', { name: '설정 열기' }).click(); await p.getByRole('tab', { name: '기록·정보' }).click(); } },
  { name: 'p01-settings-teacher-open', page: 1, save: midway, act: async (p) => {
    await p.getByRole('button', { name: '설정 열기' }).click();
    await p.getByText('교사용 가이드', { exact: true }).click();
    await p.getByLabel('교사용 비밀번호').fill('yelsam');
    await p.getByRole('button', { name: '전체 해금' }).click();
    await wait(300);
  } },
  { name: 'p01-teacher-home', page: 1, save: midway, teacher: true },
  { name: 'p11-teacher', page: 11, save: midway, teacher: true },
  { name: 'p02-step1', page: 2, save: fresh },
  { name: 'p02-step2', page: 2, save: fresh, act: async (p) => { const line = p.locator('.brief-line'); await line.click(); await line.click(); await next(p).click(); await p.getByRole('group', { name: '직업 캐릭터' }).getByRole('button').nth(1).click(); } },
  { name: 'p02-all-met', page: 2, save: makeSave({ playerName: '', pageData: { p2Progress: { line: 2, met: ['drone', 'care', 'ecology', 'broadcast'] } } }) },
  { name: 'p02-help', page: 2, save: fresh, act: async (p) => { await p.getByRole('button', { name: '어떻게 하는 거야' }).click(); } },
  { name: 'p02-topbar-help', page: 2, save: fresh, act: async (p) => { await p.getByRole('button', { name: '도움말' }).click(); } },
  { name: 'p03-plan', page: 3, save: fresh },
  { name: 'p03-plan-points', page: 3, save: makeSave({ playerName: '', pageData: { p3Waypoints: [{ x: .36, y: .4 }, { x: .61, y: .66 }, { x: .8, y: .38 }] } }) },
  { name: 'p03-help', page: 3, save: fresh, act: async (p) => { await p.getByRole('button', { name: '어떻게 하는 거야' }).click(); } },
  { name: 'p03-done', page: 3, save: makeSave({ stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [3] }, pageData: { p3Result: { photos, batteryRemaining: 42, drainByZone: {}, passed: true, precision: true }, p3Precision: true } }) },
  { name: 'p04-step1', page: 4, save: makeSave() },
  { name: 'p04-zoom', page: 4, save: makeSave(), act: async (p) => { await p.locator('.p4-photo').first().click(); await p.getByRole('button', { name: '못 찾겠어요' }).click(); } },
  { name: 'p04-step2', page: 4, save: makeSave({ pageData: { p4Details: ['stump', 'dam', 'noise-sign'] } }) },
  { name: 'p04-explain', page: 4, save: makeSave({ pageData: { p4Details: ['stump', 'dam', 'noise-sign'] } }), act: async (p) => { await p.getByRole('group', { name: '가설 고르기' }).getByRole('button', { name: /벌목 때문/ }).click(); await next(p).click(); } },
  { name: 'p04-done', page: 4, save: midway },
  { name: 'p05-step1', page: 5, save: midway },
  { name: 'p05-step1-card', page: 5, save: midway, act: async (p) => { await p.getByRole('button', { name: /^눈 살펴보기/ }).click(); } },
  { name: 'p05-step2', page: 5, save: midway, act: async (p) => {
    for (const [i, zone] of ['눈', '깃털', '행동·주변'].entries()) {
      await p.getByRole('button', { name: new RegExp(`^${zone} 살펴보기`) }).click();
      const text = ['눈은 맑은데 계속 두리번거려', '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어', '숨을 곳이 없고 큰 소리가 계속 들려'][i];
      await p.getByRole('button', { name: text, exact: true }).click();
    }
    await next(p).click();
  } },
  { name: 'p05-step3', page: 5, save: midway, act: async (p) => {
    for (const [i, zone] of ['눈', '깃털', '행동·주변'].entries()) {
      await p.getByRole('button', { name: new RegExp(`^${zone} 살펴보기`) }).click();
      await p.getByRole('button', { name: ['눈은 맑은데 계속 두리번거려', '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어', '숨을 곳이 없고 큰 소리가 계속 들려'][i], exact: true }).click();
    }
    await next(p).click();
    await p.getByRole('button', { name: '달라요' }).click();
    await next(p).click();
    await p.getByRole('button', { name: '깃털 관리' }).click();
  } },
  { name: 'p05-step3-stable', page: 5, save: midway, act: async (p) => {
    for (const [i, zone] of ['눈', '깃털', '행동·주변'].entries()) {
      await p.getByRole('button', { name: new RegExp(`^${zone} 살펴보기`) }).click();
      await p.getByRole('button', { name: ['눈은 맑은데 계속 두리번거려', '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어', '숨을 곳이 없고 큰 소리가 계속 들려'][i], exact: true }).click();
    }
    await next(p).click();
    await p.getByRole('button', { name: '달라요' }).click();
    await next(p).click();
    await p.getByRole('button', { name: '은신처·조용한 곳' }).click();
    await p.getByRole('button', { name: '지구에게 고른 처치 주기' }).click();
    await wait(800);
  } },
  { name: 'p05-help', page: 5, save: midway, act: async (p) => { await p.getByRole('button', { name: '어떻게 하는 거야' }).click(); } },
  { name: 'p05-teacher', page: 5, save: midway, teacher: true },
  { name: 'p06-step1', page: 6, save: midway, act: async (p) => { await p.getByRole('button', { name: '물그릇', exact: true }).click(); await p.getByRole('button', { name: '조용히 쉬는 곳 자리' }).click(); await p.getByRole('button', { name: '숨는 집', exact: true }).click(); } },
  { name: 'p06-step2', page: 6, save: midway, act: async (p) => {
    const put = async (chip, slot) => { await p.getByRole('button', { name: chip, exact: true }).click(); await p.getByRole('button', { name: `${slot} 자리` }).click(); };
    await put('물그릇', '조용히 쉬는 곳'); await put('숨는 집', '조용히 쉬는 곳'); await put('놀이 줄', '먹고 노는 곳'); await put('먹이 나무', '먹고 노는 곳');
    await next(p).click();
  } },
  { name: 'p06-step3-result', page: 6, save: midway, act: async (p) => {
    const put = async (chip, slot) => { await p.getByRole('button', { name: chip, exact: true }).click(); await p.getByRole('button', { name: `${slot} 자리` }).click(); };
    await put('물그릇', '먹고 노는 곳'); await put('숨는 집', '조용히 쉬는 곳'); await put('놀이 줄', '먹고 노는 곳'); await put('먹이 나무', '조용히 쉬는 곳');
    await next(p).click();
    await p.getByRole('button', { name: /시험하기/ }).click();
    await wait(1800);
  } },
  { name: 'p06-step3-perfect', page: 6, save: midway, act: async (p) => {
    const put = async (chip, slot) => { await p.getByRole('button', { name: chip, exact: true }).click(); await p.getByRole('button', { name: `${slot} 자리` }).click(); };
    await put('물그릇', '조용히 쉬는 곳'); await put('숨는 집', '조용히 쉬는 곳'); await put('놀이 줄', '먹고 노는 곳'); await put('먹이 나무', '먹고 노는 곳');
    await next(p).click();
    await p.getByRole('button', { name: /시험하기/ }).click();
    await wait(1800);
  } },
  { name: 'p07-step1', page: 7, save: midway },
  { name: 'p07-step2-outliers', page: 7, save: ecologyAt(2), act: async (p) => { await p.getByRole('button', { name: /C 깊은 숲 새 8마리/ }).click(); } },
  { name: 'p07-step3-picked', page: 7, save: ecologyAt(3), act: async (p) => { await p.getByRole('group', { name: '행동 카드' }).getByRole('button', { name: /^나무 심기/ }).click(); } },
  { name: 'p07-step3-result', page: 7, save: ecologyAt(3), act: async (p) => { await p.getByRole('group', { name: '행동 카드' }).getByRole('button', { name: /^나무 심기/ }).click(); await next(p).click(); await wait(800); } },
  { name: 'p07-step3-cause', page: 7, save: ecologyAt(3, { trials: [{ variable: 'logging', from: 3, to: 9, before: 7, after: 16 }, { variable: 'noise', from: 9, to: 2, before: 7, after: 13 }, { variable: 'water', from: 6, to: 9, before: 7, after: 8 }] }) },
  { name: 'p07-help', page: 7, save: midway, act: async (p) => { await p.getByRole('button', { name: '어떻게 하는 거야' }).click(); } },
  { name: 'p08-audio', page: 8, save: midway },
  { name: 'p08-source', page: 8, save: midway, act: async (p) => { await p.getByLabel('오디오 레벨').fill('55'); await next(p).click(); } },
  { name: 'p08-captions', page: 8, save: midway, act: async (p) => { await p.getByLabel('오디오 레벨').fill('55'); await next(p).click(); await p.getByRole('button', { name: '스튜디오 카메라', exact: true }).click(); } },
  { name: 'p08-caption-picked', page: 8, save: midway, act: async (p) => { await p.getByLabel('오디오 레벨').fill('55'); await next(p).click(); await p.getByRole('button', { name: '스튜디오 카메라', exact: true }).click(); await p.getByRole('group', { name: '자막 고르기' }).getByRole('button').filter({ hasText: '조사 그래프' }).first().click(); await wait(3200); } },
  { name: 'p08-incident', page: 8, save: midway, act: async (p) => {
    await p.getByLabel('오디오 레벨').fill('55'); await next(p).click();
    const captions = () => p.getByRole('group', { name: '자막 고르기' }).getByRole('button');
    const RUMOR = /SNS 제보|익명|그러던데/;
    await p.getByRole('button', { name: '스튜디오 카메라', exact: true }).click();
    await captions().filter({ hasNotText: RUMOR }).first().click(); await next(p).click();
    await p.getByRole('button', { name: '드론 사진', exact: true }).click();
    await captions().filter({ hasNotText: RUMOR }).first().click(); await next(p).click();
  } },
  { name: 'p08-help', page: 8, save: midway, act: async (p) => { await p.getByRole('button', { name: '어떻게 하는 거야' }).click(); } },
  { name: 'p09-solo', page: 9, save: midway, act: async (p) => { await p.getByRole('button', { name: /드론 현장가/ }).click(); } },
  { name: 'p09-solo-result', page: 9, save: midway, act: async (p) => { await p.getByRole('button', { name: /드론 현장가/ }).click(); await next(p).click(); await wait(300); } },
  { name: 'p09-turn-drone', page: 9, save: relayAt(0, 0), act: async (p) => { await p.getByRole('button', { name: '2번 막힌 물길' }).click(); } },
  { name: 'p09-turn-eco', page: 9, save: relayAt(0, 1) },
  { name: 'p09-turn-care', page: 9, save: relayAt(1, 2) },
  { name: 'p09-turn-say', page: 9, save: relayAt(2, 3) },
  { name: 'p09-wrong', page: 9, save: relayAt(0, 2), act: async (p) => { await p.getByRole('button', { name: /놀이 밧줄/ }).click(); await next(p).click(); await wait(200); } },
  { name: 'p09-result', page: 9, save: relayAt(1, 0, 'result') },
  { name: 'p09-help', page: 9, save: midway, act: async (p) => { await p.getByRole('button', { name: '어떻게 하는 거야' }).click(); } },
  { name: 'p09-ending', page: 9, save: done },
  { name: 'p11-locked', page: 11, save: midway },
  { name: 'p11-open', page: 11, save: done, act: async () => { await wait(3000); } },
];

/** 브라우저 안에서 실행: 무대 밖·잘림·스크롤·가림·작은 터치 영역을 찾는다. */
/* global document, getComputedStyle, HTMLElement */
function auditInPage() {
  const stage = document.getElementById('stage');
  const stageRect = stage.getBoundingClientRect();
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')) || 1;
  const backdrop = document.querySelector('.modal-backdrop');
  const scope = backdrop ?? stage;
  const issues = [];
  const seen = new Set();
  const push = (issue) => { const key = JSON.stringify(issue); if (!seen.has(key)) { seen.add(key); issues.push(issue); } };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const desc = (el) => {
    const tag = el.tagName.toLowerCase();
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return `${tag}${cls}${text ? ` "${text}"` : ''}`;
  };
  const within = (r, box, tol = 1.5) => r.left >= box.left - tol && r.right <= box.right + tol && r.top >= box.top - tol && r.bottom <= box.bottom + tol;
  const px = (v) => Math.round(v / scale);
  // 의도적으로 넘치는 장식(키아트 바닥 잘림, 로고 크롭, 사진 컨테이너 등)
  const IGNORE = ['.sr-only', '.skip-link', '.home-intro', '.home-logo-frame', '.p8-meter', '.v4-choice__art', '.zoom-frame', '.p7-scene', '.p7-place__scene', '.p7-edge', '.p8-screen', '.phaser-stage', '.certificate-border'];

  const interactive = scope.querySelectorAll('button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])');
  for (const el of interactive) {
    if (!visible(el) || el.closest('.sr-only, .skip-link')) continue;
    const r = el.getBoundingClientRect();
    if (!within(r, stageRect)) push({ kind: 'off-stage', el: desc(el), box: [px(r.left - stageRect.left), px(r.top - stageRect.top), px(r.width), px(r.height)] });
    let a = el.parentElement;
    while (a && a !== document.body) {
      const cs = getComputedStyle(a);
      const clipX = ['hidden', 'auto', 'scroll', 'clip'].includes(cs.overflowX);
      const clipY = ['hidden', 'auto', 'scroll', 'clip'].includes(cs.overflowY);
      if ((clipX || clipY) && a !== stage) {
        const ar = a.getBoundingClientRect();
        if (!within(r, ar)) {
          const scrollable = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && a.scrollHeight > a.clientHeight + 1;
          push({ kind: scrollable ? 'needs-scroll' : 'clipped', el: desc(el), by: desc(a) });
          break;
        }
      }
      a = a.parentElement;
    }
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    // 완료 도장(.v4-done)이 덮는 건 의도 — 그 단계는 끝났으므로 다시 누를 필요가 없다.
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el) && !hit.closest('.v4-done')) push({ kind: 'covered', el: desc(el), by: desc(hit) });
    if (!el.matches('input[type="range"]') && (r.width < 44 || r.height < 44)) push({ kind: 'small', el: desc(el), size: [Math.round(r.width), Math.round(r.height)] });
  }

  for (const el of scope.querySelectorAll('*')) {
    if (el === stage || !(el instanceof HTMLElement) || !visible(el)) continue;
    if (IGNORE.some((s) => el.matches(s) || el.closest(s))) continue;
    const cs = getComputedStyle(el);
    const ofX = el.scrollWidth > el.clientWidth + 2;
    const ofY = el.scrollHeight > el.clientHeight + 2;
    if (!ofX && !ofY) continue;
    const hidX = (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && ofX;
    const hidY = (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && ofY;
    const scrX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && ofX;
    const scrY = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && ofY;
    if (hidX || hidY) push({ kind: cs.textOverflow === 'ellipsis' && hidX ? 'ellipsis' : 'overflow-hidden', el: desc(el), over: [px(el.scrollWidth - el.clientWidth), px(el.scrollHeight - el.clientHeight)] });
    else if (scrX || scrY) push({ kind: 'scroll', el: desc(el), over: [px(el.scrollWidth - el.clientWidth), px(el.scrollHeight - el.clientHeight)] });
  }

  if (backdrop) {
    const m = backdrop.querySelector('.modal');
    if (m && !within(m.getBoundingClientRect(), stageRect)) push({ kind: 'modal-off-stage', el: desc(m) });
  }
  return { scale: Number(scale.toFixed(3)), issues };
}

const requested = process.env.SHOT_NAMES ? new Set(process.env.SHOT_NAMES.split(',')) : null;
const selected = requested ? STATES.filter((s) => requested.has(s.name)) : STATES;
const match = /^(\d+)x(\d+)$/.exec(process.env.SHOT_VIEWPORT ?? '1280x720');
const viewport = { width: Number(match?.[1] ?? 1280), height: Number(match?.[2] ?? 720) };
const teacherAll = process.env.TEACHER === '1';

const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch();
const report = [];
try {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const state of selected) {
    const entry = { name: state.name, viewport: `${viewport.width}x${viewport.height}`, issues: [], error: null };
    try {
      await page.goto(`${BASE}/#/page/${state.page}`);
      // 실행 중인 앱이 lastPage 저장으로 시드를 덮어쓸 수 있어, 잠깐 기다렸다가 한 번 더 심고 새로고침한다.
      const seed = ([key, save, tKey, teacher]) => {
        localStorage.setItem(key, JSON.stringify(save));
        if (teacher) sessionStorage.setItem(tKey, 'true'); else sessionStorage.removeItem(tKey);
      };
      const args = [SAVE_KEY, state.save ?? makeSave(), TEACHER_KEY, Boolean(state.teacher || teacherAll)];
      await page.evaluate(seed, args);
      await page.waitForTimeout(350);
      await page.evaluate(seed, args);
      await page.reload();
      await page.waitForTimeout(1200);
      if (state.act) await state.act(page);
      await page.waitForTimeout(450);
      const result = await page.evaluate(auditInPage);
      entry.scale = result.scale;
      entry.issues = result.issues;
      await page.screenshot({ path: path.join(outDir, `${state.name}.png`) });
    } catch (error) {
      entry.error = String(error).split('\n')[0];
      await page.screenshot({ path: path.join(outDir, `${state.name}.ERROR.png`) }).catch(() => undefined);
    }
    report.push(entry);
  }
  if (pageErrors.length) report.push({ name: '_pageErrors', issues: pageErrors.map((m) => ({ kind: 'page-error', el: m })) });
  await context.close();
} finally {
  await browser.close();
  await server.close();
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
const lines = [`# 잘림·클릭 점검 (${viewport.width}×${viewport.height})`, ''];
let total = 0;
for (const entry of report) {
  const real = entry.issues.filter((i) => i.kind !== 'small' || true);
  if (entry.error) { lines.push(`## ${entry.name} — ERROR: ${entry.error}`); continue; }
  if (real.length === 0) continue;
  total += real.length;
  lines.push(`## ${entry.name} (scale ${entry.scale})`);
  for (const i of real) lines.push(`- **${i.kind}** ${i.el}${i.by ? ` ← ${i.by}` : ''}${i.over ? ` over=${i.over.join('×')}` : ''}${i.size ? ` size=${i.size.join('×')}` : ''}${i.box ? ` box=${i.box.join(',')}` : ''}`);
  lines.push('');
}
lines.push(`총 ${total}건 · 상태 ${report.length}개`);
fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'));
console.log(lines.join('\n'));

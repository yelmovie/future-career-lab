import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';
const CLUES = ['tree-cut', 'sound-chainsaw', 'feather-brown', 'sound-forest-birds', 'foot-songbird', 'feather-blue'];
const CARE_RECORDS = {
  green: { eyes: 'eyes-1', feathers: 'feathers-2', behavior: 'behavior-1' },
  red: { eyes: 'eyes-2', water: 'water-1', posture: 'posture-1' },
};

function fixture(pageNumber: number, pageData: Record<string, unknown> = {}, completedPages: number[] = []) {
  return {
    schemaVersion: 3, contentVersion: '2026.09', sessionSeed: 42, playerName: '화면 점검 탐험가', lastPage: pageNumber,
    stageProgress: { completed: { 1: completedPages.includes(4), 2: completedPages.includes(6), 3: completedPages.includes(7), 4: completedPages.includes(8), 5: completedPages.includes(9) }, completedPages },
    badges: ['드론 현장가 배지', '동물돌봄 배지', '생태연구가 배지', '방송기술자 배지'],
    jobCards: ['드론 현장가', '동물돌봄 전문가', '생태연구가', '미래방송기술자'],
    traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [], dailyMissionId: 'daily-1', certificateUnlocked: completedPages.includes(9), rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: {
      photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }],
      hypothesis: 'water',
      careLog: [{ bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' }, { bird: 'red', issue: '탈수', treatment: '물·전해질' }],
      habitatStars: 3, traces: [],
      graphs: [{ variable: 'logging', verdict: 'main' }, { variable: 'noise', verdict: 'sub' }, { variable: 'water', verdict: 'none' }],
      clip: { trust: 90, corrections: 1 }, allianceTurns: 12,
    },
    pageData, updatedAt: new Date().toISOString(),
  };
}

function broadcast(patch: Record<string, unknown> = {}) {
  return {
    index: 2, trust: 100, corrections: 0, correctionAt: [], ap: 3,
    incidentPlan: ['mic'], pendingIncident: null, pendingRecovery: null, incidentLog: [],
    log: [
      { segmentId: 'opening', title: '첫 인사', source: 'studio', captionId: 'opening-rescue', sourced: true },
      { segmentId: 'scene', title: '현장 보여주기', source: 'drone', captionId: 'photo-construction', sourced: true },
    ],
    draft: { source: 'studio', captionId: 'graph-water', level: 55 }, pendingCorrection: null, reviewedCaptionIds: [], correctionLog: [],
    ...patch,
  };
}

async function openState(context: BrowserContext, pageNumber: number, data: Record<string, unknown> = {}, completed: number[] = []) {
  const page = await context.newPage();
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value: fixture(pageNumber, data, completed) });
  await page.goto(`/#/page/${pageNumber}`);
  await expect(page.locator(`.page-${pageNumber}`)).toBeVisible();
  return page;
}

async function measureBoundaries(page: Page, name: string, screenshot = false) {
  const viewport = page.viewportSize()!;
  await expect.poll(() => page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--stage-scale')))).toBeCloseTo(Math.min(viewport.width / 1280, viewport.height / 720), 4);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
    // Measure the settled layout; a brief stamp entrance is not its final hit target.
    await Promise.all(document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return timing && Number.isFinite(timing.endTime);
    }).map((animation) => animation.finished.catch(() => undefined)));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const issues = await page.evaluate(() => {
    const errors: string[] = [];
    const rect = (element: Element) => element.getBoundingClientRect();
    const visible = (element: Element) => element instanceof HTMLElement && element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !element.closest('.sr-only,.skip-link,.v4-placement-status');
    const nameOf = (element: Element) => `${element.tagName.toLowerCase()}.${String(element.className).trim().replace(/\s+/g, '.')}`;
    const outside = (inner: DOMRect, outer: DOMRect, tolerance = 1.5) => inner.left < outer.left - tolerance || inner.right > outer.right + tolerance || inner.top < outer.top - tolerance || inner.bottom > outer.bottom + tolerance;
    const contain = (element: Element, parent: Element, label: string) => {
      if (outside(rect(element), rect(parent))) errors.push(`${label}: ${nameOf(element)} ${element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 50) ?? ''} is outside ${nameOf(parent)}: ${JSON.stringify({ inner: rect(element).toJSON(), outer: rect(parent).toJSON() })}`);
    };
    const separate = (above: Element, below: Element, label: string, gap = 0) => {
      const actual = rect(below).top - rect(above).bottom;
      if (actual < gap - 0.5) errors.push(`${label}: gap ${actual.toFixed(1)}px, needs ${gap}px`);
    };
    const topbar = document.querySelector('.topbar')!;
    const content = document.querySelector('.game-content')!;
    for (const button of topbar.querySelectorAll('button')) contain(button, topbar, 'topbar button');
    if (!topbar.classList.contains('topbar--home')) separate(topbar, content, 'topbar/content');
    else for (const control of content.querySelectorAll('button,a[href]')) {
      if (!visible(control)) continue;
      contain(control, document.querySelector('.stage')!, 'home control viewport');
      for (const tool of topbar.querySelectorAll('button')) {
        const a = rect(control); const b = rect(tool);
        if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1) errors.push('home interaction overlaps toolbar button');
      }
    }
    const stage = document.querySelector('.v4-stage');
    if (stage) {
      const head = document.querySelector('.v4-head')!;
      const foot = document.querySelector('.v4-foot')!;
      separate(head, stage, 'instruction/stage');
      for (const child of head.querySelectorAll('.v4-dots,.v4-instruction,.v4-status,.v4-help')) {
        contain(child, head, 'instruction child');
        separate(child, stage, 'instruction control/stage', 4);
      }
      separate(stage, foot, 'stage/footer');
      for (const child of foot.querySelectorAll('.v4-mentor,.v4-mentor > img,.v4-bubble,.v4-next-wrap,.v4-next,.v4-hint,.v4-next-status')) {
        if (!visible(child)) continue;
        contain(child, foot, 'footer child');
        separate(stage, child, 'stage/footer control', 4);
        contain(child, document.querySelector('.stage')!, 'footer viewport');
      }
      const bubble = document.querySelector('.v4-bubble');
      const next = document.querySelector('.v4-next-wrap');
      if (bubble && next && rect(bubble).right > rect(next).left - 3) errors.push('mentor bubble overlaps next-button column');
      for (const control of stage.querySelectorAll('button,input,[role="button"],[role="tab"]')) {
        if (visible(control) && !control.closest('.modal-backdrop')) contain(control, stage, 'activity control');
      }
    }
    // Check real text glyphs, not just wrappers. Intentionally scrollable records are allowed.
    for (const element of document.querySelectorAll('.v4-stage-content *, .v4-bubble, .v4-bubble *, .certificate-layout *')) {
      if (!visible(element)) continue;
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const glyphs of range.getClientRects()) {
          if (glyphs.width < 1 || glyphs.height < 1) continue;
          let ancestor: Element | null = element;
          while (ancestor && ancestor !== document.body) {
            const css = getComputedStyle(ancestor);
            const scrollable = ['auto', 'scroll'].includes(css.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 2;
            if (scrollable) break;
            const clips = ['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowY) || ['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowX);
            if ((clips || ancestor.matches('.v4-bubble')) && outside(glyphs, rect(ancestor), 2)) {
              errors.push(`clipped text: ${node.textContent.trim().slice(0, 70)} by ${nameOf(ancestor)}`);
              break;
            }
            if (css.position === 'fixed') break;
            ancestor = ancestor.parentElement;
          }
        }
      }
    }
    return [...new Set(errors)];
  });
  await test.info().attach(`${name}-boundaries`, { body: JSON.stringify({ viewport, issues }), contentType: 'application/json' });
  if (screenshot || issues.length) await page.screenshot({ path: test.info().outputPath(`${name}.png`), animations: 'disabled' });
  expect.soft(issues, `${name} at ${viewport.width}×${viewport.height}`).toEqual([]);
}

for (const viewport of [
  { width: 820, height: 500 },   // Galaxy Z Fold 계열 펼친 가로 화면·인앱 브라우저
  { width: 1024, height: 768 },  // 학교 태블릿 가로
  { width: 1366, height: 768 },  // 일반 노트북·웹앱
  { width: 1920, height: 1080 }, // 전자칠판·대형 화면
]) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport, reducedMotion: 'reduce' });
    test('all routes and longer mission states keep the header, activity and mentor in separate rows', async ({ context }) => {
      test.setTimeout(180000);
      for (const pageNumber of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]) {
        const page = await openState(context, pageNumber);
        await measureBoundaries(page, `p${pageNumber}-initial`, [3, 5, 7].includes(pageNumber));
        if (pageNumber === 5) {
          await page.getByRole('button', { name: /^눈 살펴보기/ }).click();
          await expect(page.locator('.p5-obs .v4-big-button')).toHaveCount(2);
          await measureBoundaries(page, 'p5-observation-question', true);
        }
        await page.close();
      }
      const cases = [
        { name: 'p2-professions', route: 2, data: { p2Progress: { line: 2, met: [] } } },
        { name: 'p3-review', route: 3, completed: [3], data: { p3Result: { photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }], batteryRemaining: 40, drainByZone: {}, passed: true, precision: true } } },
        { name: 'p4-hypothesis', route: 4, data: { p4Details: ['stump', 'dam', 'noise-sign'] } },
        { name: 'p5-treatment', route: 5, data: { page05Care: { records: CARE_RECORDS, treatments: { green: null, red: null }, wrongRecords: 0, wrongTreatments: 0 } } },
        { name: 'p5-complete', route: 5, completed: [5], data: { page05Care: { records: CARE_RECORDS, treatments: { green: 'shelter', red: 'water' }, wrongRecords: 0, wrongTreatments: 0 } } },
        { name: 'p6-result', route: 6, completed: [6], data: { page06Session: { placed: { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] }, step: 2, tested: true, attempts: 1, revisions: 0 } } },
        { name: 'p7-clues', route: 7, data: { page07Intro: true, page07Ecology: { step: 1, point: 'C', found: CLUES } } },
        { name: 'p7-comparison', route: 7, data: { page07Intro: true, page07Ecology: { step: 3, found: CLUES, fewest: true, trials: [], active: 'logging', lastTrial: null } } },
        { name: 'p7-comparison-result', route: 7, data: { page07Intro: true, page07Ecology: { step: 3, found: CLUES, fewest: true, trials: [{ variable: 'logging', from: 0, to: 1, before: 1, after: 10 }], active: 'logging', lastTrial: { variable: 'logging', from: 0, to: 1, before: 1, after: 10 } } } },
        { name: 'p8-cause', route: 8, data: { p8Broadcast: broadcast() } },
        { name: 'p8-correction', route: 8, data: { p8Broadcast: broadcast({ trust: 20, pendingCorrection: 'rumor-back' }) } },
        { name: 'p8-recovery', route: 8, data: { p8Broadcast: broadcast({ pendingRecovery: 'mic', incidentLog: [{ incidentId: 'mic', actionId: 'mic-swap' }] }) } },
      ];
      for (const state of cases) {
        const page = await openState(context, state.route, state.data, state.completed);
        if (state.name === 'p7-comparison-result') await expect(page.getByRole('button', { name: '다음 행동 고르기', exact: false })).toBeVisible();
        await measureBoundaries(page, state.name, true);
        if (state.name === 'p7-comparison-result') {
          const slider = page.getByRole('slider', { name: '숲 변화 전후 비교 막대', exact: true });
          for (const [key, value] of [['Home', '0'], ['End', '100']] as const) {
            await slider.press(key);
            await expect(slider).toHaveValue(value);
            const bounds = await page.locator('.p7-edge').evaluate((frame) => {
              const outer = frame.getBoundingClientRect();
              const handle = frame.querySelector('.p7-edge__handle')!.getBoundingClientRect();
              return { left: handle.left - outer.left, right: outer.right - handle.right };
            });
            expect.soft(bounds.left, `comparison handle at ${value}% left edge`).toBeGreaterThanOrEqual(0);
            expect.soft(bounds.right, `comparison handle at ${value}% right edge`).toBeGreaterThanOrEqual(0);
          }
        }
        if (state.name === 'p5-treatment') {
          await page.getByRole('button', { name: '깃털 관리', exact: true }).click();
          await page.locator('.p5-bird').click();
          await measureBoundaries(page, 'p5-treatment-feedback', true);
        }
        await page.close();
      }

      // Old completed missions continue into the new cooperation ending without an extra quiz.
      const page = await openState(context, 9, { p9Alliance: { phase: 'transfer', solo: 'ecology', index: 2, turn: 3, attempts: 12 } }, [2, 3, 4, 5, 6, 7, 8]);
      await expect(page.getByRole('heading', { name: '어느 곳부터 도와줄까?', exact: true })).toBeVisible();
      await measureBoundaries(page, 'p9-cooperation-map', true);
      await page.getByRole('button', { name: '함께 바꾼 숲 보기', exact: true }).click();
      await expect(page.getByRole('heading', { name: '우리가 함께 바꾼 숲이야', exact: true })).toBeVisible();
      await measureBoundaries(page, 'p9-ending', true);
      await page.getByRole('button', { name: '수료증 확인하기', exact: true }).click();
      await expect(page.getByRole('heading', { name: '미래 직업실 탐험 수료증', exact: true })).toBeVisible();
      await measureBoundaries(page, 'p11-certificate', true);
      await page.close();
    });
  });
}

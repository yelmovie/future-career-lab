import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

function makeSave() {
  return {
    schemaVersion: 2,
    contentVersion: '2026.09',
    sessionSeed: 42,
    playerName: '테스트 탐험가',
    lastPage: 1,
    stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [] as number[] },
    badges: [] as string[],
    jobCards: [] as string[],
    traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [],
    pageData: {},
    dailyMissionId: 'daily-1',
    certificateUnlocked: false,
    rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: {
      photos: [
        { id: 'logging', quality: 'center' },
        { id: 'stream', quality: 'center' },
        { id: 'construction', quality: 'center' },
      ],
      hypothesis: 'logging',
      careLog: [],
      habitatStars: 3,
      traces: [],
      graphs: [
        { variable: 'logging', verdict: 'main' },
        { variable: 'noise', verdict: 'sub' },
        { variable: 'water', verdict: 'none' },
      ],
      clip: null,
      allianceTurns: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function seed(page: Page) {
  await page.goto('/#/page/1');
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, makeSave()]);
  await page.reload();
}

async function captureBroadcastLayout(page: Page, scene: string) {
  await page.locator('.p8-stage img').evaluateAll((images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
  for (const viewport of [{ width: 1728, height: 972 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--stage-scale')))).toBeCloseTo(Math.min(viewport.width / 1280, viewport.height / 720), 4);
    await page.screenshot({ path: test.info().outputPath(`${scene}-${viewport.width}.png`), animations: 'disabled' });
    const layout = await page.locator('.p8-stage').evaluate((element) => {
      const stage = element.getBoundingClientRect();
      const shell = element.closest('.v4-shell')!;
      const header = shell.querySelector('.v4-head')!.getBoundingClientRect();
      const bubble = shell.querySelector('.v4-bubble')!.getBoundingClientRect();
      const next = shell.querySelector('.v4-next')!.getBoundingClientRect();
      const controls = shell.querySelector('.p8-controls')!.getBoundingClientRect();
      const buttons = [...shell.querySelectorAll('.p8-controls button')].map((button) => button.getBoundingClientRect());
      const overlap = buttons.some((first, index) => buttons.slice(index + 1).some((second) => (
        Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
        && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1
      )));
      return {
        headerGap: stage.top - header.bottom,
        footerGap: Math.min(bubble.top, next.top) - stage.bottom,
        bubbleGap: next.left - bubble.right,
        buttonsWithinControls: buttons.every((button) => button.left >= controls.left - 1 && button.right <= controls.right + 1 && button.top >= controls.top - 1 && button.bottom <= controls.bottom + 1),
        overlap,
        footerVisible: Math.max(bubble.bottom, next.bottom) <= window.innerHeight,
        footerBottom: Math.max(bubble.bottom, next.bottom),
        viewportHeight: window.innerHeight,
      };
    });
    await test.info().attach(`${scene}-${viewport.width}-layout`, { body: JSON.stringify(layout), contentType: 'application/json' });
    expect(layout.headerGap).toBeGreaterThanOrEqual(0);
    expect(layout.footerGap).toBeGreaterThanOrEqual(0);
    expect(layout.bubbleGap).toBeGreaterThanOrEqual(0);
    expect(layout.buttonsWithinControls).toBe(true);
    expect(layout.overlap).toBe(false);
    expect(layout.footerVisible).toBe(true);
  }
}

test.use({ viewport: { width: 1280, height: 720 } });

test('page 7: existing six clues migrate to the cut fruit tree without losing progress', async ({ page }) => {
  const legacy = ['foot-boot', 'sound-chainsaw', 'feather-brown', 'sound-forest-birds', 'foot-songbird', 'feather-blue'];
  const base = makeSave();
  const value = { ...base, pageData: { page07Intro: true, page07Ecology: { step: 1, point: 'C', found: legacy } }, artifacts: { ...base.artifacts, traces: legacy } };
  await page.addInitScript(({ key, marker, value }) => {
    if (sessionStorage.getItem(marker) === '1') return;
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem(marker, '1');
  }, { key: SAVE_KEY, marker: 'e2e:legacy-six-clue-migration:seeded', value });
  await page.goto('/#/page/7');
  await expect(page.locator('.v4-status')).toHaveText('흔적 6/6');
  const clue = page.getByRole('button', { name: '잘린 열매나무 다시 살펴보기', exact: true });
  await expect(clue).toBeVisible();
  await clue.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.v4-bubble')).toContainText('열매 달린 가지');
  await expect.poll(() => page.evaluate((key) => {
    const save = JSON.parse(localStorage.getItem(key) ?? '{}');
    return [save.pageData.page07Ecology.found, save.artifacts.traces];
  }, SAVE_KEY)).toEqual([['tree-cut', ...legacy.slice(1)], ['tree-cut', ...legacy.slice(1)]]);
  await page.reload();
  await expect(page.locator('.p7-stamps li.is-found')).toHaveCount(6);
  await page.getByRole('button', { name: '새 세어 보기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '새가 제일 적은 곳은?' })).toBeVisible();
});

test('page 7: observations, fair comparisons, unsupported conclusion blocked and revised after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  await page.goto('/#/page/7');
  // 연결 화면: 꾸꾸·앵자 → 숲의 다른 새들
  await expect(page.getByRole('heading', { name: '꾸꾸와 앵자 말고, 숲의 다른 새들은?' })).toBeVisible();
  await page.getByRole('button', { name: /숲 둘러보기/ }).click();
  await expect(page.getByRole('heading', { name: '반짝이는 흔적을 눌러 봐' })).toBeVisible();

  const fieldLayout = await page.locator('.p7-field').evaluate((field) => {
    const stage = field.closest('.v4-stage')!.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const scene = field.querySelector('.p7-scene')!.getBoundingClientRect();
    const spot = field.querySelector('.p7-scene .v4-hotspot')!.getBoundingClientRect();
    const icon = field.querySelector('.p7-scene .v4-hotspot img')!.getBoundingClientRect();
    const tabs = field.querySelector('.p7-tabs')!.getBoundingClientRect();
    const stamps = field.querySelector('.p7-stamps')!.getBoundingClientRect();
    const spots = [...field.querySelectorAll('.p7-scene .v4-hotspot')].map((item) => item.getBoundingClientRect());
    return {
      sideSpace: Math.round(stage.width - fieldRect.width),
      withinStage: fieldRect.top >= stage.top - 1 && fieldRect.bottom <= stage.bottom + 1,
      tabsGap: scene.top - tabs.bottom,
      stampsGap: stamps.top - scene.bottom,
      hotspotsVisible: spots.every((item) => item.left >= scene.left && item.right <= scene.right && item.top >= scene.top && item.bottom <= scene.bottom),
      spotSize: Math.round(spot.width),
      iconSize: Math.round(icon.width),
    };
  });
  expect(fieldLayout.sideSpace).toBeGreaterThanOrEqual(70);
  expect(fieldLayout.withinStage).toBe(true);
  expect(fieldLayout.tabsGap).toBeGreaterThanOrEqual(0);
  expect(fieldLayout.stampsGap).toBeGreaterThanOrEqual(0);
  expect(fieldLayout.hotspotsVisible).toBe(true);
  expect(fieldLayout.spotSize).toBeGreaterThanOrEqual(80);
  expect(fieldLayout.iconSize).toBeGreaterThanOrEqual(64);

  // 1단계: 지점 탭 3개 × 흔적 2개. 다 찾기 전엔 다음 버튼이 힌트만 준다.
  const next = page.getByRole('button', { name: /새 세어 보기/ });
  await next.click();
  await expect(page.getByText('흔적 6개를 다 찾으면 켜져요')).toBeVisible();
  for (const tab of ['A 숲 가장자리', 'B 개울가', 'C 깊은 숲']) {
    await page.getByRole('tab', { name: tab }).click();
    const spots = page.locator('.p7-scene .v4-hotspot');
    await expect(spots).toHaveCount(2);
    await spots.nth(0).click();
    await spots.nth(1).click();
    await expect(page.locator('.p7-scene .v4-hotspot.is-done')).toHaveCount(2);
  }
  await expect(page.locator('.p7-stamps li.is-found')).toHaveCount(6);
  await expect(page.locator('.p7-stamps')).toContainText('잘린 열매나무');
  await expect(page.locator('.p7-stamps')).not.toContainText('부츠 발자국');
  await expect(page.locator('.p7-stamps')).toContainText('갈색 숲새 깃털');
  await expect(page.locator('.p7-stamps')).toContainText('숲새 합창 녹음');
  await expect(page.locator('.p7-stamps')).toContainText('작은 새 발자국');
  await expect(page.locator('.p7-stamps')).toContainText('푸른 숲새 깃털');
  await expect(page.locator('.p7-stamps')).not.toContainText(/앵무|꾸꾸|앵자/);
  await page.getByRole('button', { name: '잘린 열매나무 다시 살펴보기', exact: true }).click();
  await expect(page.locator('.v4-bubble')).toContainText('새들의 먹이가 줄었을까?');
  await expect(page.locator('.p7-stamps li.is-found')).toHaveCount(6);
  await page.getByRole('tab', { name: /A 숲 가장자리/ }).click();
  await expect(page.locator('.p7-scene')).toHaveCSS('background-image', /photo-logging/);
  await page.getByRole('button', { name: '잘린 열매나무', exact: true }).click();
  await expect(page.locator('.v4-bubble')).toContainText('열매 달린 가지');
  await page.locator('.p7-scene img').first().evaluate((element) => (element as HTMLImageElement).decode());
  await page.screenshot({ path: test.info().outputPath('cut-fruit-tree-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1024, height: 768 });
  const clueLayout = await page.locator('.v4-bubble').evaluate((element) => {
    const bubble = element.getBoundingClientRect();
    const stamps = element.closest('.v4-shell')!.querySelector('.p7-stamps')!.getBoundingClientRect();
    const next = element.closest('.v4-shell')!.querySelector('.v4-next')!.getBoundingClientRect();
    return { topGap: bubble.top - stamps.bottom, rightGap: next.left - bubble.right, bottom: bubble.bottom, viewport: window.innerHeight };
  });
  expect(clueLayout.topGap).toBeGreaterThanOrEqual(0);
  expect(clueLayout.rightGap).toBeGreaterThanOrEqual(0);
  expect(clueLayout.bottom).toBeLessThanOrEqual(clueLayout.viewport);
  await page.screenshot({ path: test.info().outputPath('cut-fruit-tree-tablet.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await next.click();

  // 2단계: 그림 속 새를 세어 제일 적은 곳. 틀리면 튕기고 한 줄 질문.
  await expect(page.getByRole('heading', { name: '새가 제일 적은 곳은?' })).toBeVisible();
  await page.getByRole('button', { name: /C 깊은 숲 새 8마리/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '새가 제일 적은 곳은 어디야' })).toBeVisible();
  await page.getByRole('button', { name: /A 숲 가장자리 새 1마리/ }).click();
  await expect(page.getByRole('heading', { name: '숲 가장자리엔 새가 거의 없네' })).toBeVisible();
  await page.getByRole('button', { name: /왜 그럴까/ }).click();

  // 3단계: 그림 옆에서 행동을 골라 실행한다. 노란 버튼은 세 비교가 끝나야 열린다.
  await expect(page.getByRole('heading', { name: '하나만 골라서 비교해 보자' })).toBeVisible();
  await expect(page.getByRole('button', { name: '새가 돌아올 거야', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '그대로일 거야', exact: true })).toHaveCount(0);
  const nextCause = page.getByRole('button', { name: '원인 고르기', exact: true });
  await expect(nextCause).toBeDisabled();
  await expect(nextCause).toHaveAttribute('disabled', '');
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 0/3');
  const cards = page.getByRole('group', { name: '행동 카드' });
  // 실행 전에는 선택을 바꿀 수 있다. 선택만으로 실험하거나 다음 단계로 넘어가지 않는다.
  await cards.getByRole('button', { name: /^물 채우기/ }).click();
  await cards.getByRole('button', { name: /^나무 심기/ }).click();
  await expect(cards.getByRole('button', { name: /^물 채우기/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(cards.getByRole('button', { name: /^나무 심기/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(nextCause).toBeDisabled();
  await expect(page.locator('.p7-result')).toHaveCount(0);
  const treeRun = page.getByRole('button', { name: '나무 심기 해 보기', exact: true });
  await expect(treeRun).toBeEnabled();
  await expect(page.locator('.v4-react')).toHaveCount(0, { timeout: 500 });
  await page.setViewportSize({ width: 1728, height: 972 });
  await page.screenshot({ path: test.info().outputPath('comparison-controls-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1024, height: 768 });
  const controlLayout = await treeRun.evaluate((element) => {
    const button = element.getBoundingClientRect();
    const scene = element.closest('.p7-lab')!.querySelector('.p7-edge')!.getBoundingClientRect();
    return { height: button.height, withinSceneHorizontally: button.left >= scene.left && button.right <= scene.right, bottom: button.bottom, viewport: window.innerHeight };
  });
  expect(controlLayout.height).toBeGreaterThanOrEqual(47.5);
  expect(controlLayout.withinSceneHorizontally).toBe(true);
  expect(controlLayout.bottom).toBeLessThanOrEqual(controlLayout.viewport);
  await page.screenshot({ path: test.info().outputPath('comparison-controls-tablet.png'), animations: 'disabled' });
  await treeRun.click();
  await expect(page.locator('.p7-result')).toHaveClass(/is-running/);
  await expect(nextCause).toBeDisabled();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 0/3');
  await expect(cards.getByRole('button', { name: /^기계 소리 멈추기/ })).toBeDisabled();
  await expect(page.locator('.p7-result')).toContainText('비교 막대를 움직여 보고', { timeout: 5_000 });
  await expect(page.locator('.p7-result')).toContainText('새 1마리 → 10마리');
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 1/3');
  await expect(nextCause).toBeDisabled();
  await expect(treeRun).toHaveCount(0);
  const compare = page.getByRole('slider', { name: '숲 변화 전후 비교 막대' });
  await expect(compare).toBeEnabled();
  await expect(compare).toHaveValue('100');
  await compare.fill('72');
  await expect(compare).toHaveValue('72');
  await expect(page.locator('.p7-edge__scene--after')).toHaveAttribute('src', '/assets/v8/ecology-compare-trees.jpg');
  await page.screenshot({ path: test.info().outputPath('comparison-result-tablet.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '다음 행동 고르기', exact: true }).click();
  await expect(page.locator('.p7-edge__count')).toHaveText('1마리');
  await expect(compare).toHaveCount(0);
  // 이미 비교한 카드는 읽을 수 있지만 중복 실행할 수 없다.
  await expect(cards.getByRole('button', { name: /^나무 심기/ })).toBeDisabled();
  await expect(cards.getByRole('button', { name: /^나무 심기/ })).toContainText('10마리');
  await page.reload();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 1/3');
  await expect(nextCause).toBeDisabled();
  await expect(cards.getByRole('button', { name: /^나무 심기/ })).toBeDisabled();
  await page.setViewportSize({ width: 1280, height: 720 });
  await cards.getByRole('button', { name: /^기계 소리 멈추기/ }).click();
  const noiseRun = page.getByRole('button', { name: '기계 소리 멈추기 해 보기', exact: true });
  await noiseRun.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.p7-result')).toHaveClass(/is-running/);
  await expect(nextCause).toBeDisabled();
  await expect(page.locator('.p7-result')).toContainText('새 1마리 → 7마리', { timeout: 5_000 });
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 2/3');
  await expect(nextCause).toBeDisabled();
  // 결과를 본 뒤 미완료 카드를 바로 골라도 기준 1마리에서 새 비교가 시작된다.
  await cards.getByRole('button', { name: /^물 채우기/ }).click();
  await expect(page.locator('.p7-edge__count')).toHaveText('1마리');
  await expect(compare).toHaveCount(0);
  await expect(cards.getByRole('button', { name: /^기계 소리 멈추기/ })).toBeDisabled();
  const waterRun = page.getByRole('button', { name: '물 채우기 해 보기', exact: true });
  await expect(waterRun).toBeEnabled();
  await expect(nextCause).toBeDisabled();
  await waterRun.click();
  await expect(page.locator('.p7-result')).toHaveClass(/is-running/);
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 2/3');
  await expect(nextCause).toBeDisabled();
  await expect(page.getByRole('group', { name: '가장 큰 원인' })).toHaveCount(0);
  await expect(page.locator('.p7-result')).toContainText('새 1마리 → 2마리', { timeout: 5_000 });
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 3/3');
  await expect(nextCause).toBeEnabled();
  await expect(compare).toBeEnabled();
  await page.screenshot({ path: test.info().outputPath('comparison-all-complete.png'), animations: 'disabled' });
  await nextCause.click();

  const ecologyState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.page07Ecology, SAVE_KEY);
  expect(ecologyState).not.toHaveProperty('prediction');
  expect(ecologyState.trials.map((trial: { variable: string }) => trial.variable)).toEqual(['logging', 'noise', 'water']);
  expect(ecologyState.trials.every((trial: Record<string, unknown>) => !('prediction' in trial))).toBe(true);

  await expect(page.getByRole('heading', { name: '새를 제일 많이 돌아오게 한 건?' })).toBeVisible();
  await page.getByRole('group', { name: '가장 큰 원인' }).getByRole('button', { name: /물 채우기/ }).click();
  await page.getByRole('button', { name: /결과 확정/ }).click();
  await expect(page.locator('.p7-conclusion-feedback')).toContainText('1마리 늘었어');
  await expect(page.getByText('생태연구가 배지를 얻었어')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '새를 제일 많이 돌아오게 한 건?' })).toBeVisible();
  await page.getByRole('group', { name: '가장 큰 원인' }).getByRole('button', { name: /나무 심기/ }).click();
  await page.getByRole('button', { name: /결과 확정/ }).click();
  await expect(page.getByText('생태연구가 배지를 얻었어')).toBeVisible();
  const artifacts = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').artifacts, SAVE_KEY);
  expect(artifacts.graphs).toEqual([
    { variable: 'logging', verdict: 'main' },
    { variable: 'noise', verdict: 'sub' },
    { variable: 'water', verdict: 'none' },
  ]);
  expect(artifacts.traces).toHaveLength(6);
  const revised = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(revised.pageData.page07Ecology.conclusionHistory).toEqual(['water', 'logging']);
  expect(revised.logs.some((log: { type: string; summary: string }) => log.type === 'ecology-revision' && log.summary.includes('고쳤어'))).toBe(true);
  await page.getByRole('button', { name: /생방송으로/ }).click();
  await expect(page).toHaveURL(/page\/8/);
  expect(errors).toEqual([]);
});

test('page 7: reloading the third comparison replays it before unlocking the conclusion without duplicate trials', async ({ page }) => {
  await seed(page);
  const base = makeSave();
  const found = ['tree-cut', 'sound-chainsaw', 'feather-brown', 'sound-forest-birds', 'foot-songbird', 'feather-blue'];
  const value = {
    ...base,
    pageData: {
      page07Intro: true,
      page07Ecology: {
        step: 3,
        point: 'A',
        found,
        fewest: true,
        trials: [
          { variable: 'logging', from: 3, to: 9, before: 1, after: 10 },
          { variable: 'noise', from: 9, to: 2, before: 1, after: 7 },
        ],
        active: 'water',
        lastTrial: null,
        main: null,
        conclusionHistory: [],
      },
    },
    artifacts: { ...base.artifacts, traces: found },
  };
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value });
  await page.reload();
  await page.goto('/#/page/7');
  const nextCause = page.getByRole('button', { name: '원인 고르기', exact: true });
  await expect(nextCause).toBeDisabled();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 2/3');
  await page.getByRole('button', { name: '물 채우기 해 보기', exact: true }).click();
  await expect(page.locator('.p7-result')).toHaveClass(/is-running/);
  await expect(nextCause).toBeDisabled();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.page07Ecology.lastTrial?.variable, SAVE_KEY)).toBe('water');
  await page.reload();
  await expect(page.locator('.p7-result')).toHaveClass(/is-running/);
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 2/3');
  await expect(nextCause).toBeDisabled();
  await expect(page.getByRole('slider', { name: '숲 변화 전후 비교 막대' })).toBeDisabled();
  await expect(page.locator('.p7-result')).toContainText('새 1마리 → 2마리', { timeout: 5_000 });
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 3/3');
  await expect(nextCause).toBeEnabled();
  const trials = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.page07Ecology.trials, SAVE_KEY);
  expect(trials.map((trial: { variable: string }) => trial.variable)).toEqual(['logging', 'noise', 'water']);
  await nextCause.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '새를 제일 많이 돌아오게 한 건?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '새를 제일 많이 돌아오게 한 건?' })).toBeVisible();
  await expect(page.getByRole('group', { name: '가장 큰 원인' }).getByRole('button')).toHaveCount(3);
});

test('page 8: microphone retry and recovery persist until explicit keyboard continuation without duplicate cost', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  const base = makeSave();
  const value = {
    ...base,
    pageData: {
      p8Broadcast: {
        index: 2,
        trust: 100,
        corrections: 0,
        correctionAt: [],
        ap: 3,
        incidentPlan: ['mic'],
        pendingIncident: 'mic',
        pendingRecovery: null,
        incidentLog: [],
        log: [
          { segmentId: 'opening', title: '첫 인사', source: 'studio', captionId: 'graph-logging', sourced: true },
          { segmentId: 'scene', title: '현장 보여주기', source: 'drone', captionId: 'photo-construction', sourced: true },
        ],
        draft: { source: null, captionId: null, level: 55 },
        pendingCorrection: null,
        reviewedCaptionIds: [],
        correctionLog: [],
      },
    },
  };
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value });
  await page.reload();
  await page.goto('/#/page/8');
  const readBroadcast = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p8Broadcast, SAVE_KEY);
  const brokenHeading = page.getByRole('heading', { name: '마이크가 끊겼어!', exact: true });
  const recoveryHeading = page.getByRole('heading', { name: '리포터 목소리가 돌아왔어!', exact: true });
  const ignore = page.getByRole('button', { name: '그대로 두기', exact: true });
  const retryFeedback = page.getByRole('status').filter({ hasText: '아직 목소리가 안 들려. 예비 마이크로 바꿔 보자.' });
  const continueBroadcast = page.getByRole('button', { name: '방송 이어가기', exact: true });

  // 해결되지 않은 선택에는 이유를 알려 주고 같은 장면에서 다시 해 볼 수 있다.
  await expect(brokenHeading).toBeVisible();
  await ignore.click();
  await expect(retryFeedback).toBeVisible();
  await expect(brokenHeading).toBeVisible();
  await expect(page.locator('.p8-screen .p8-program-media img')).toHaveAttribute('src', '/assets/v7/broadcast-mic-failure-poster.webp');
  await expect(page.getByRole('group', { name: '화면 고르기', exact: true })).toHaveCount(0);
  await expect(page.locator('.v4-status')).toHaveText('시청자 신뢰도 85');
  await ignore.click();
  await page.reload();
  await expect(retryFeedback).toBeVisible();
  await expect(brokenHeading).toBeVisible();
  await ignore.click();
  await expect(page.locator('.v4-status')).toHaveText('시청자 신뢰도 85');
  const failedAttempt = await readBroadcast();
  expect(failedAttempt).toMatchObject({ index: 2, ap: 3, trust: 85, pendingIncident: 'mic', pendingRecovery: null });
  expect(failedAttempt.incidentLog).toEqual([{ incidentId: 'mic', actionId: 'mic-ignore' }]);
  expect(failedAttempt.log).toHaveLength(2);

  // 교체 성공은 다음 문제로 넘어가지 않고 리포터가 다시 말하는 장면을 보여 준다.
  await page.getByRole('button', { name: '예비 마이크로 바꾸기', exact: true }).click();
  await expect(recoveryHeading).toBeVisible();
  await expect(retryFeedback).toHaveCount(0);
  const recoveredImage = page.locator('.p8-screen .p8-program-media img');
  await expect(recoveredImage).toHaveAttribute('src', '/assets/v8/broadcast-mic-recovered.webp');
  await expect(page.locator('.p8-screen')).toContainText('잘 들리나요? 숲 소식을 계속 전해 드리겠습니다.');
  await expect(page.getByRole('group', { name: '화면 고르기', exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: '자막 고르기', exact: true })).toHaveCount(0);
  await expect(continueBroadcast).toBeEnabled();
  await expect.poll(readBroadcast).toMatchObject({ index: 2, ap: 1, trust: 85, pendingIncident: null, pendingRecovery: 'mic' });
  await page.reload();
  await expect(recoveryHeading).toBeVisible();
  await expect(continueBroadcast).toBeEnabled();
  // 이전의 짧은 피드백 시간보다 기다려도 확인 버튼 없이 다음 순서로 이동하지 않는다.
  await page.waitForTimeout(2200);
  await expect(recoveryHeading).toBeVisible();
  await expect(page.getByRole('heading', { name: '조사 결과: 어떤 화면?', exact: true })).toHaveCount(0);

  await recoveredImage.evaluate((element) => (element as HTMLImageElement).decode());
  for (const viewport of [{ width: 1728, height: 972 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--stage-scale')))).toBeCloseTo(Math.min(viewport.width / 1280, viewport.height / 720), 4);
    await page.screenshot({ path: test.info().outputPath(`mic-recovery-${viewport.width}.png`), animations: 'disabled' });
    const layout = await continueBroadcast.evaluate((element) => {
      const button = element.getBoundingClientRect();
      const shell = element.closest('.v4-shell')!;
      const bubble = shell.querySelector('.v4-bubble')!.getBoundingClientRect();
      const screen = shell.querySelector('.p8-screen')!.getBoundingClientRect();
      const controls = shell.querySelector('.p8-controls')!.getBoundingClientRect();
      return {
        buttonHeight: button.height,
        buttonVisible: button.left >= 0 && button.right <= window.innerWidth && button.top >= 0 && button.bottom <= window.innerHeight,
        bubbleGap: button.left - bubble.right,
        screenGap: controls.left - screen.right,
        contentBottom: Math.max(screen.bottom, controls.bottom),
        footerTop: Math.min(button.top, bubble.top),
        buttonBottom: button.bottom,
        viewportHeight: window.innerHeight,
      };
    });
    await test.info().attach(`mic-recovery-${viewport.width}-layout`, { body: JSON.stringify(layout), contentType: 'application/json' });
    expect(layout.buttonHeight).toBeGreaterThanOrEqual(47.5);
    expect(layout.buttonVisible).toBe(true);
    expect(layout.bubbleGap).toBeGreaterThanOrEqual(0);
    expect(layout.screenGap).toBeGreaterThanOrEqual(0);
    expect(layout.contentBottom).toBeLessThanOrEqual(layout.footerTop);
  }

  await continueBroadcast.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '조사 결과: 어떤 화면?', exact: true })).toBeVisible();
  await expect(recoveryHeading).toHaveCount(0);
  await expect(page.getByRole('group', { name: '화면 고르기', exact: true }).getByRole('button')).toHaveCount(3);
  const continued = await readBroadcast();
  expect(continued).toMatchObject({ index: 2, ap: 1, trust: 85, pendingIncident: null, pendingRecovery: null });
  expect(continued.incidentLog).toEqual([
    { incidentId: 'mic', actionId: 'mic-ignore' },
    { incidentId: 'mic', actionId: 'mic-swap' },
  ]);
  expect(continued.log).toHaveLength(2);
  await page.reload();
  await expect(page.getByRole('heading', { name: '조사 결과: 어떤 화면?', exact: true })).toBeVisible();
  expect((await readBroadcast()).incidentLog).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('page 8: all four segments finish without opening optional investigation data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  const base = makeSave();
  const value = {
    ...base,
    pageData: {
      page07Ecology: { trials: [
        { variable: 'logging', from: 3, to: 9, before: 1, after: 10 },
        { variable: 'noise', from: 9, to: 2, before: 1, after: 7 },
        { variable: 'water', from: 3, to: 8, before: 1, after: 2 },
      ] },
    },
  };
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value });
  await page.reload();
  await page.goto('/#/page/8');
  await page.getByLabel('오디오 레벨').fill('55');
  await page.getByRole('button', { name: '방송 시작', exact: true }).click();

  const captions = page.getByRole('group', { name: '자막 고르기', exact: true });
  for (const segment of [
    { title: '첫 인사', source: '스튜디오 카메라', caption: '꾸꾸와 앵자의 구조 소식과 숲 이야기를 전합니다' },
    { title: '현장 보여주기', source: '드론 사진', caption: '숲 옆에서 공사가 진행 중입니다' },
    { title: '조사 결과', source: '스튜디오 카메라', caption: '먹이나무를 늘리자 새가 1마리에서 10마리로 늘었습니다' },
    { title: '시민 부탁', source: '현장 리포터', caption: '새가 먹을 열매나무를 지키고 심어 주세요' },
  ]) {
    await expect(page.getByRole('heading', { name: `${segment.title}: 어떤 화면?`, exact: true })).toBeVisible();
    await page.getByRole('button', { name: segment.source, exact: true }).click();
    await expect(captions.getByRole('button')).toHaveCount(3);
    await expect(captions).not.toContainText(/SNS|익명|그러던데/);
    if (segment.source === '스튜디오 카메라') {
      await expect(page.locator('.p8-screen .p8-program-media img')).toHaveAttribute('src', '/assets/v8/broadcast-anchor-neutral.webp');
    }
    if (segment.title === '조사 결과') {
      await expect(captions).toContainText('기계 소리를 줄이자 새가 1마리에서 7마리로 늘었습니다');
      await expect(captions).toContainText('물을 채우자 새가 1마리에서 2마리로 늘었습니다');
      await expect(captions).not.toContainText(/SNS|익명|그러던데/);
      await expect(captions.getByRole('button', { name: /먹이나무를 늘리자/ }).locator('img')).toHaveAttribute('src', '/assets/v8/broadcast-graph-trees-grown.webp');
      await expect(captions.getByRole('button', { name: /기계 소리를 줄이자/ }).locator('img')).toHaveAttribute('src', '/assets/v8/broadcast-graph-quiet.webp');
      await expect(captions.getByRole('button', { name: /물을 채우자/ }).locator('img')).toHaveAttribute('src', '/assets/v8/broadcast-graph-water.webp');
    }
    if (segment.title === '시민 부탁') {
      await expect(captions).toContainText('숲 옆의 시끄러운 기계 소리를 줄여 주세요');
      await expect(captions).toContainText('다친 새를 보면 돌봄센터에 알려 주세요');
      await expect(captions).not.toContainText(/SNS|익명|그러던데|도시로 갔다고/);
      await expect(captions.getByRole('button', { name: /새가 먹을 열매나무를/ }).locator('img')).toHaveAttribute('src', '/assets/v8/broadcast-graph-trees-grown.webp');
      await expect(captions.getByRole('button', { name: /시끄러운 기계 소리를/ }).locator('img')).toHaveAttribute('src', '/assets/v8/broadcast-graph-quiet.webp');
      await expect(captions.getByRole('button', { name: /다친 새를 보면/ }).locator('img')).toHaveAttribute('src', '/assets/v8/broadcast-action-report.webp');
    }
    await captions.getByRole('button', { name: new RegExp(segment.caption) }).click();
    if (segment.title === '현장 보여주기') {
      await expect(page.locator('.p8-screen .p8-program-media img')).toHaveAttribute('src', '/assets/v8/broadcast-photo-construction-v2.jpg');
    }
    await expect(page.getByRole('button', { name: '조사자료 보기', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.v4-next')).not.toHaveClass(/is-off/);
    if (segment.title === '조사 결과' || segment.title === '시민 부탁') {
      await expect(page.locator('.p8-screen__caption')).toContainText(segment.caption);
      await captureBroadcastLayout(page, segment.title === '조사 결과' ? 'cause-with-optional-data' : 'citizen-request');
    }
    await page.getByRole('button', { name: '방송으로 내보내기', exact: true }).click();
    if (segment.title === '현장 보여주기') {
      await expect(page.getByRole('heading', { name: '마이크가 끊겼어!', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '예비 마이크로 바꾸기', exact: true }).click();
      await expect(page.getByRole('heading', { name: '리포터 목소리가 돌아왔어!', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '방송 이어가기', exact: true }).click();
    }
  }
  await expect(page.getByRole('heading', { name: '방송 끝!', exact: true })).toBeVisible();
  const reward = page.locator('.v4-done');
  await expect(reward).toContainText('방송기술자 배지를 얻었어');
  await expect(reward.getByRole('img', { name: '방송기술자 배지', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '내가 만든 방송', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '내 방송 이어 보기', exact: true }).click();
  await expect(page.getByRole('region', { name: '내가 만든 방송', exact: true })).toBeVisible();
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(save.artifacts.clip).toEqual({ trust: 100, corrections: 0 });
  expect(save.pageData.p8Broadcast.log.map((entry: { segmentId: string }) => entry.segmentId)).toEqual(['opening', 'scene', 'cause', 'action']);
  expect(save.pageData.p8Broadcast.reviewedCaptionIds).toEqual([]);
  expect(save.pageData.p8Broadcast.incidentLog).toEqual([{ incidentId: 'mic', actionId: 'mic-swap' }]);
  expect(save.stageProgress.completedPages).toContain(8);
  expect(errors).toEqual([]);
});

test('page 8: legacy low-trust correction on the last segment can finish with a real citizen request', async ({ page }) => {
  await seed(page);
  const base = makeSave();
  const value = {
    ...base,
    pageData: {
      p8Broadcast: {
        index: 3,
        trust: 20,
        corrections: 4,
        correctionAt: [],
        ap: 1,
        incidentPlan: ['mic'],
        pendingIncident: null,
        incidentLog: [{ incidentId: 'mic', actionId: 'mic-swap' }],
        log: [
          { segmentId: 'opening', title: '첫 인사', source: 'studio', captionId: 'graph-logging', sourced: true },
          { segmentId: 'scene', title: '현장 보여주기', source: 'drone', captionId: 'photo-construction', sourced: true },
          { segmentId: 'cause', title: '조사 결과', source: 'studio', captionId: 'graph-noise', sourced: true },
        ],
        draft: { source: null, captionId: null, level: 55 },
        pendingCorrection: 'rumor-city',
        reviewedCaptionIds: [],
        correctionLog: [],
      },
    },
  };
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value });
  await page.reload();
  await page.goto('/#/page/8');
  await expect(page.getByRole('heading', { name: '정정 방송: 어떤 화면?', exact: true })).toBeVisible();
  await expect(page.locator('.v4-status')).toHaveText('시청자 신뢰도 20');
  await page.getByRole('button', { name: '스튜디오 카메라', exact: true }).click();
  const captions = page.getByRole('group', { name: '자막 고르기', exact: true });
  await expect(captions.getByRole('button')).toHaveCount(3);
  await expect(captions).not.toContainText(/SNS|익명|그러던데/);
  await captions.getByRole('button').first().click();
  await expect(page.locator('.v4-next')).not.toHaveClass(/is-off/);
  await captureBroadcastLayout(page, 'legacy-correction');
  await page.getByRole('button', { name: '바로잡아 방송하기', exact: true }).click();
  await expect(page.locator('.v4-status')).toHaveText('시청자 신뢰도 40');
  await expect(page.getByRole('heading', { name: '시민 부탁: 어떤 화면?', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '현장 리포터', exact: true }).click();
  await captions.getByRole('button', { name: /다친 새를 보면 돌봄센터에 알려 주세요/ }).click();
  await page.getByRole('button', { name: '방송으로 내보내기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '방송 끝!', exact: true })).toBeVisible();
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(save.artifacts.clip).toEqual({ trust: 40, corrections: 4 });
  expect(save.pageData.p8Broadcast.pendingCorrection).toBeNull();
  expect(save.pageData.p8Broadcast.correctionLog).toHaveLength(1);
  expect(save.pageData.p8Broadcast.log.map((entry: { segmentId: string }) => entry.segmentId)).toEqual(['opening', 'scene', 'cause', 'correction', 'action']);
  expect(save.stageProgress.completedPages).toContain(8);
  await page.reload();
  await expect(page.getByRole('heading', { name: '방송 끝!', exact: true })).toBeVisible();
});

test('page 8: optional investigation data shows the selected photo and returns to the same caption', async ({ page }) => {
  await seed(page);
  const base = makeSave();
  const value = {
    ...base,
    pageData: { p8Broadcast: {
      index: 1, trust: 100, corrections: 0, correctionAt: [], ap: 3,
      incidentPlan: ['mic'], pendingIncident: null, pendingRecovery: null, incidentLog: [],
      log: [{ segmentId: 'opening', title: '첫 인사', source: 'studio', captionId: 'opening-rescue', sourced: true }],
      draft: { source: null, captionId: null, level: 55 }, pendingCorrection: null, reviewedCaptionIds: [], correctionLog: [],
    } },
  };
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value });
  await page.reload();
  await page.goto('/#/page/8');
  await page.getByRole('button', { name: '스튜디오 카메라', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /사진|숲/ })).toBeVisible();
  await page.getByRole('button', { name: '드론 사진', exact: true }).click();
  await expect(page.getByRole('heading', { name: '사진을 설명할 자막을 골라', exact: true })).toBeVisible();
  const caption = page.getByRole('group', { name: '자막 고르기', exact: true }).getByRole('button', { name: /개울 물길이 자재에 막혀 있습니다/ });
  await caption.click();
  await expect(page.locator('.p8-screen .p8-program-media img')).toHaveAttribute('src', '/assets/v8/broadcast-photo-stream-blocked-v2.jpg');
  await expect(page.locator('.v4-next')).not.toHaveClass(/is-off/);
  await page.getByRole('button', { name: '조사자료 보기', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '자막과 관련된 조사자료', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.p8-evidence img')).toHaveAttribute('src', '/assets/v8/broadcast-photo-stream-blocked-v2.jpg');
  await expect(dialog).toContainText('개울 물길이 자재에 막혀 있습니다');
  await expect(dialog).not.toContainText(/원자료|뒷받침|단정/);
  await dialog.getByRole('button', { name: '확인했어', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(caption).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.v4-next')).not.toHaveClass(/is-off/);
  await page.getByRole('button', { name: '방송으로 내보내기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '마이크가 끊겼어!', exact: true })).toBeVisible();
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p8Broadcast, SAVE_KEY);
  expect(state.index).toBe(2);
  expect(state.log.at(-1)).toMatchObject({ segmentId: 'scene', source: 'drone', captionId: 'photo-stream', sourced: true });
});

import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';
const IMAGES = /\/assets\/v(?:8|6)\/ecology-compare-[^/?]+\.(?:jpg|png|webp)(?:\?|$)/;
const ACTIONS = [
  { variable: 'logging', label: '나무 심기', from: 3, to: 9, before: 1, after: 10 },
  { variable: 'noise', label: '기계 소리 멈추기', from: 9, to: 2, before: 1, after: 7 },
  { variable: 'water', label: '물 채우기', from: 0, to: 9, before: 1, after: 2 },
] as const;

async function seedComparison(page: Page, prior = 0) {
  const found = ['tree-cut', 'sound-chainsaw', 'feather-brown', 'sound-forest-birds', 'foot-songbird', 'feather-blue'];
  const trials = ACTIONS.slice(0, prior).map(({ variable, from, to, before, after }) => ({ variable, from, to, before, after }));
  const save = {
    schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '복구 탐험가', lastPage: 1,
    stageProgress: { completed: { 1: true, 2: true, 3: false, 4: false, 5: false }, completedPages: [3, 4, 5, 6] },
    badges: [], jobCards: [], traits: {}, logs: [], rewardGranted: [], certificateUnlocked: false,
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    pageData: { page07Intro: true, page07Ecology: { step: 3, point: 'A', found, fewest: true, trials, compared: trials.map((trial) => trial.variable), active: null, lastTrial: null, main: null, conclusionHistory: [] } },
    artifacts: { photos: [], hypothesis: 'logging', careLog: [], habitatStars: 3, traces: found, graphs: [], clip: null, allianceTurns: 0 },
    updatedAt: new Date().toISOString(),
  };
  await page.goto('/#/page/1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value: save });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goto('/#/page/7', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '하나만 골라서 비교해 보자' })).toBeVisible();
}

async function startAction(page: Page, index: number) {
  const action = ACTIONS[index]!;
  await page.getByRole('group', { name: '행동 카드' }).getByRole('button', { name: new RegExp(`^${action.label}`) }).click();
  await page.getByRole('button', { name: `${action.label} 해 보기`, exact: true }).click();
}

async function savedComparison(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.page07Ecology, SAVE_KEY);
}

test('P7 successful pictures complete all three comparisons and confirmed results survive reload', async ({ page }) => {
  await seedComparison(page);
  for (let index = 0; index < ACTIONS.length; index++) {
    await startAction(page, index);
    await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeDisabled();
    await expect(page.locator('.v4-status')).toHaveText(`비교 완료 ${index + 1}/3`, { timeout: 7000 });
    await expect(page.getByRole('slider', { name: '숲 변화 전후 비교 막대' })).toBeEnabled();
    await expect(page.getByRole('region', { name: '숫자와 설명으로 비교하기' })).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeEnabled();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 3/3');
  await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeEnabled();
  expect((await savedComparison(page)).trials).toHaveLength(3);
  expect((await savedComparison(page)).compared).toEqual(['logging', 'noise', 'water']);
});

test('P7 a failed primary image uses its fallback before completing comparison', async ({ page }) => {
  // Serve the real fallback asset directly so this case isolates fallback handling,
  // independently of the development server's transform/request queue.
  await page.route(IMAGES, (route) => route.request().url().includes('/v8/') ? route.abort() : route.fulfill({ path: `public${new URL(route.request().url()).pathname}` }));
  await seedComparison(page);
  await startAction(page, 0);
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 1/3', { timeout: 7000 });
  await expect(page.locator('.p7-edge__scene--after')).toHaveAttribute('src', '/assets/v6/ecology-compare-trees.webp');
  await expect(page.getByRole('region', { name: '숫자와 설명으로 비교하기' })).toHaveCount(0);
});

test('P7 a missing before image cannot be counted merely because the after image loaded', async ({ page }) => {
  await page.route(IMAGES, (route) => route.request().url().includes('compare-before') ? route.abort() : route.fulfill({ path: `public${new URL(route.request().url()).pathname}` }));
  await seedComparison(page);
  await startAction(page, 0);
  await page.locator('.p7-edge__scene--after').evaluate((image) => (image as HTMLImageElement).decode());
  await expect(page.getByRole('region', { name: '숫자와 설명으로 비교하기' })).toBeVisible();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 0/3');
  await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '숫자를 비교했어', exact: true }).click();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 1/3');
});

test('P7 missing pictures require direct numeric confirmation, restore it, and finish three trials only once', async ({ page }) => {
  await page.route(IMAGES, (route) => route.abort());
  await seedComparison(page);
  for (let index = 0; index < ACTIONS.length; index++) {
    await startAction(page, index);
    const recovery = page.getByRole('region', { name: '숫자와 설명으로 비교하기' });
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText(`새 ${ACTIONS[index]!.after}마리`);
    await expect(page.locator('.v4-status')).toHaveText(`비교 완료 ${index}/3`);
    await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeDisabled();
    if (index === 0) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(recovery).toBeVisible();
      await expect(page.locator('.v4-status')).toHaveText('비교 완료 0/3');
      expect((await savedComparison(page)).trials).toHaveLength(1);
      for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
        await page.setViewportSize(viewport);
        const layout = await recovery.evaluate((panel) => {
          const box = panel.getBoundingClientRect();
          const buttons = [...panel.querySelectorAll('button')].map((button) => button.getBoundingClientRect());
          return { fits: panel.scrollHeight <= panel.clientHeight + 1, buttonsInside: buttons.every((button) => button.left >= box.left && button.right <= box.right && button.top >= box.top && button.bottom <= box.bottom), buttonHeights: buttons.map((button) => button.height), bottom: box.bottom, viewportHeight: window.innerHeight };
        });
        expect(layout.fits).toBe(true);
        expect(layout.buttonsInside).toBe(true);
        expect(Math.min(...layout.buttonHeights)).toBeGreaterThanOrEqual(44);
        expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight);
        await page.screenshot({ path: test.info().outputPath(`numeric-comparison-${viewport.width}.png`), animations: 'disabled' });
      }
    }
    const confirm = page.getByRole('button', { name: '숫자를 비교했어', exact: true });
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.v4-status')).toHaveText(`비교 완료 ${index + 1}/3`);
    await expect(confirm).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.v4-status')).toHaveText(`비교 완료 ${index + 1}/3`);
    expect((await savedComparison(page)).trials).toHaveLength(index + 1);
  }
  await page.getByRole('button', { name: '원인 고르기', exact: true }).click();
  await page.getByRole('group', { name: '가장 큰 원인' }).getByRole('button', { name: /^나무 심기/ }).click();
  await page.getByRole('button', { name: '결과 확정', exact: true }).click();
  await expect(page.getByText('생태연구가 배지를 얻었어')).toBeVisible();
  expect((await savedComparison(page)).trials).toHaveLength(3);
  expect((await savedComparison(page)).compared).toEqual(['logging', 'noise', 'water']);
});

test('P7 reconnect and retry recover the pending third comparison without a new trial or page reload', async ({ page }) => {
  await page.route(IMAGES, (route) => route.abort());
  await seedComparison(page, 2);
  await startAction(page, 2);
  await expect(page.getByRole('region', { name: '숫자와 설명으로 비교하기' })).toBeVisible();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 2/3');
  await page.unroute(IMAGES);
  await page.getByRole('button', { name: '그림 다시 불러오기', exact: true }).click();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 3/3', { timeout: 7000 });
  await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: '숫자와 설명으로 비교하기' })).toHaveCount(0);
  expect((await savedComparison(page)).trials).toHaveLength(3);
  expect((await savedComparison(page)).compared).toEqual(['logging', 'noise', 'water']);
});

test('P7 indefinitely pending images time out to a comparison choice rather than automatic completion', async ({ page }) => {
  // Deliberately leave both primary and fallback requests unresolved.
  await page.route(IMAGES, () => {});
  await seedComparison(page);
  await page.clock.install();
  await startAction(page, 0);
  await page.clock.runFor(8200);
  await expect(page.getByRole('region', { name: '숫자와 설명으로 비교하기' })).toBeVisible();
  await page.clock.runFor(10000);
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 0/3');
  await expect(page.getByRole('button', { name: '원인 고르기', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '숫자를 비교했어', exact: true }).click();
  await expect(page.locator('.v4-status')).toHaveText('비교 완료 1/3');
  expect((await savedComparison(page)).trials).toHaveLength(1);
});

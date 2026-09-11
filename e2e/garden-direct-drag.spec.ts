import { expect, test, type Locator, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';
const ITEM_IDS = ['water', 'hideout', 'rope', 'feeder'] as const;
type Placement = { shade: string[]; perch: string[] };
type Point = { x: number; y: number };

async function seedGarden(page: Page) {
  await page.goto('/#/page/6');
  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '정원 탐험가', lastPage: 6,
    stageProgress: { completed: { 1: true, 2: false, 3: false, 4: false, 5: false }, completedPages: [3, 4, 5] },
    badges: [], jobCards: [], traits: { exploration: 0, analysis: 0, creation: 0, care: 0, execution: 0, collaboration: 0 },
    logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: { photos: [], hypothesis: 'logging', careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null },
    updatedAt: new Date().toISOString(),
  })), SAVE_KEY);
  await page.reload();
  await expect(page.locator('.v4-slotboard')).toBeVisible();
  await expect(page.locator('.v4-pool .v4-chip')).toHaveCount(4);
}

async function pointIn(locator: Locator, x = 0.5, y = 0.5): Promise<Point> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width * x, y: box!.y + box!.height * y };
}

const poolChip = (page: Page, id: string) => page.locator(`.v4-pool [data-chip="${id}"]`);
const slot = (page: Page, id: string) => page.locator(`.v4-slot[data-slot="${id}"]`);
const placedChip = (page: Page, id: string) => page.locator(`.v4-slot [data-chip="${id}"]`);

async function expectPlacement(page: Page, placed: Placement) {
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).pageData.page06Draft, SAVE_KEY)).toEqual(placed);
  // A release must not create a duplicate or immediately click the placed object back out.
  for (const id of ITEM_IDS) await expect(page.locator(`.v4-chip[data-chip="${id}"]`)).toHaveCount(1);
  await expect(page.locator('.v4-slot .v4-chip')).toHaveCount(placed.shade.length + placed.perch.length);
  await expect(page.locator('.v4-drag-preview')).toHaveCount(0);
}

async function beginMouseDrag(page: Page, source: Locator, target: Point) {
  const from = await pointIn(source);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 14, from.y - 14, { steps: 2 });
  await expect(page.locator('.v4-drag-preview')).toBeVisible();
  await expect(page.locator('.v4-drag-preview')).toHaveCSS('pointer-events', 'none');
  await page.mouse.move(target.x, target.y, { steps: 8 });
}

async function mouseDrag(page: Page, source: Locator, target: Point) {
  await beginMouseDrag(page, source, target);
  await page.mouse.up();
}

async function touchDrag(page: Page, source: Locator, target: Point, options: { cancel?: boolean; screenshot?: string } = {}) {
  const from = await pointIn(source);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let step = 1; step <= 8; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: from.x + (target.x - from.x) * step / 8,
        y: from.y + (target.y - from.y) * step / 8,
      }] });
    }
    await expect(page.locator('.v4-drag-preview')).toBeVisible();
    if (options.screenshot) await page.screenshot({ path: test.info().outputPath(options.screenshot), animations: 'disabled' });
    await cdp.send('Input.dispatchTouchEvent', { type: options.cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

test('desktop: objects drag directly, move between zones, return to the pool, cancel safely and complete the garden', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1728, height: 972 });
  await seedGarden(page);
  const shade = await pointIn(slot(page, 'shade'));
  const perch = await pointIn(slot(page, 'perch'));
  const pool = await pointIn(page.locator('.v4-pool'), 0.04, 0.5);
  const outside = await pointIn(page.locator('.v4-instruction'));

  // No preliminary click: hold the original object and carry it into the large zone.
  await beginMouseDrag(page, poolChip(page, 'water'), shade);
  await expect(slot(page, 'shade')).toHaveClass(/is-over/);
  await page.screenshot({ path: test.info().outputPath('desktop-direct-drag.png'), animations: 'disabled' });
  await page.mouse.up();
  await expectPlacement(page, { shade: ['water'], perch: [] });
  await slot(page, 'shade').click({ position: { x: 30, y: 80 } });
  await expectPlacement(page, { shade: ['water'], perch: [] });

  await mouseDrag(page, placedChip(page, 'water'), perch);
  await expectPlacement(page, { shade: [], perch: ['water'] });
  await mouseDrag(page, placedChip(page, 'water'), pool);
  await expectPlacement(page, { shade: [], perch: [] });

  await mouseDrag(page, poolChip(page, 'water'), outside);
  await expectPlacement(page, { shade: [], perch: [] });
  await mouseDrag(page, poolChip(page, 'water'), shade);
  await mouseDrag(page, placedChip(page, 'water'), outside);
  await expectPlacement(page, { shade: ['water'], perch: [] });

  await beginMouseDrag(page, placedChip(page, 'water'), perch);
  await page.keyboard.press('Escape');
  await expect(page.locator('.v4-drag-preview')).toHaveCount(0);
  await page.mouse.up();
  await expectPlacement(page, { shade: ['water'], perch: [] });
  await expect(page.locator('.v4-slot.is-over')).toHaveCount(0);

  // Releasing long after Escape must not click the original placed object back out.
  const waterPosition = await pointIn(placedChip(page, 'water'));
  await beginMouseDrag(page, placedChip(page, 'water'), { x: waterPosition.x + 16, y: waterPosition.y });
  await page.keyboard.press('Escape');
  await expect(page.locator('.v4-drag-preview')).toHaveCount(0);
  // This delay exceeds the former 400ms click-suppression window.
  await page.waitForTimeout(700);
  await page.mouse.move(waterPosition.x, waterPosition.y);
  await page.mouse.up();
  await expectPlacement(page, { shade: ['water'], perch: [] });

  await mouseDrag(page, poolChip(page, 'hideout'), shade);
  await mouseDrag(page, poolChip(page, 'feeder'), shade);
  await expectPlacement(page, { shade: ['water', 'hideout', 'feeder'], perch: [] });
  // An object already in a full zone can return to that same zone without changing it.
  await beginMouseDrag(page, placedChip(page, 'water'), shade);
  await expect(slot(page, 'shade')).not.toHaveClass(/is-full/);
  await page.mouse.up();
  await expectPlacement(page, { shade: ['water', 'hideout', 'feeder'], perch: [] });
  // A full zone cannot swallow a fourth object or remove it from the pool.
  await mouseDrag(page, poolChip(page, 'rope'), shade);
  await expectPlacement(page, { shade: ['water', 'hideout', 'feeder'], perch: [] });
  await expect(poolChip(page, 'rope')).toBeVisible();
  await mouseDrag(page, poolChip(page, 'rope'), perch);
  await expectPlacement(page, { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] });

  await page.reload();
  await expectPlacement(page, { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] });
  await page.getByRole('button', { name: /^다음/ }).click();
  await page.getByRole('button', { name: /시험하기/ }).click();
  await expect(page.locator('.p6-stars span.is-on')).toHaveCount(3);
  await page.getByRole('button', { name: /새 정원 완성/ }).click();
  await expect(page.getByText('동물돌봄 배지를 얻었어')).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.pageData.page06Design).toMatchObject({ placed: { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] }, attempts: 1 });
  expect(saved.stageProgress.completedPages).toContain(6);
  expect(saved.logs.filter((log: { type: string }) => log.type === 'habitat-simulation')).toHaveLength(1);
});

test.describe('tablet direct dragging', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test('real touch moves the original object, preserves it after cancellation, and keeps tap placement available', async ({ page }) => {
    await seedGarden(page);
    const shade = await pointIn(slot(page, 'shade'));
    const perch = await pointIn(slot(page, 'perch'));
    const pool = await pointIn(page.locator('.v4-pool'), 0.04, 0.5);
    const outside = await pointIn(page.locator('.v4-instruction'));

    await touchDrag(page, poolChip(page, 'water'), shade, { screenshot: 'tablet-direct-drag.png' });
    await expectPlacement(page, { shade: ['water'], perch: [] });
    await touchDrag(page, placedChip(page, 'water'), perch);
    await expectPlacement(page, { shade: [], perch: ['water'] });
    await touchDrag(page, placedChip(page, 'water'), shade, { cancel: true });
    await expectPlacement(page, { shade: [], perch: ['water'] });
    await expect(page.locator('.v4-slot.is-over')).toHaveCount(0);
    await touchDrag(page, placedChip(page, 'water'), outside);
    await expectPlacement(page, { shade: [], perch: ['water'] });
    await touchDrag(page, placedChip(page, 'water'), pool);
    await expectPlacement(page, { shade: [], perch: [] });

    // A normal tap still selects an object; it does not need the removed intermediate token.
    await poolChip(page, 'water').tap();
    await expect(poolChip(page, 'water')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.v4-chip-token')).toHaveCount(0);
    await slot(page, 'shade').tap();
    await expectPlacement(page, { shade: ['water'], perch: [] });
    await placedChip(page, 'water').tap();
    await expectPlacement(page, { shade: [], perch: [] });
  });
});

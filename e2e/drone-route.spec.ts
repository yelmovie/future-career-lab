import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';
const TARGETS = [{ x: .36, y: .4 }, { x: .61, y: .66 }, { x: .8, y: .38 }];

async function mapPoint(page: Page, point: { x: number; y: number }) {
  const canvas = page.locator('.phaser-stage canvas');
  const box = (await canvas.boundingBox())!;
  const dimensions = await canvas.evaluate(async (element) => {
    const source = new Image();
    source.src = '/assets/v5/drone-map-wide.webp';
    await source.decode();
    return { width: Math.max(320, element.width), height: Math.max(300, element.height), sourceWidth: source.width, sourceHeight: source.height, canvasWidth: element.width, canvasHeight: element.height };
  });
  const scale = Math.min(dimensions.width / dimensions.sourceWidth, dimensions.height / dimensions.sourceHeight);
  const width = dimensions.sourceWidth * scale; const height = dimensions.sourceHeight * scale;
  return {
    x: box.x + ((dimensions.width - width) / 2 + width * point.x) * box.width / dimensions.canvasWidth,
    y: box.y + ((dimensions.height - height) / 2 + height * point.y) * box.height / dimensions.canvasHeight,
  };
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`drone route, dragging, recording and return stay consistent at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/page/3');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('.phaser-stage canvas')).toBeVisible();
    await expect(page.getByLabel('촬영점별 바람 방향')).toBeVisible();
    await expect(page.getByLabel('비행 경로 안내')).toContainText('자동 복귀');
    await page.waitForTimeout(400);

    for (const [index, target] of TARGETS.entries()) {
      const point = await mapPoint(page, target);
      await page.mouse.click(point.x, point.y);
      await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p3Waypoints?.length, SAVE_KEY)).toBe(index + 1);
    }

    // 자유 경로점은 촬영 목표에서 벗어나게 끌었다가 다시 중앙에 놓을 수 있다.
    const initial = await mapPoint(page, TARGETS[2]!);
    const moved = await mapPoint(page, { x: .86, y: .47 });
    await page.mouse.move(initial.x, initial.y);
    await page.mouse.down();
    await page.mouse.move(moved.x, moved.y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p3Waypoints[2].x, SAVE_KEY)).toBeCloseTo(.86, 2);
    await page.mouse.move(moved.x, moved.y);
    await page.mouse.down();
    await page.mouse.move(initial.x, initial.y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p3Waypoints[2].x, SAVE_KEY)).toBeCloseTo(.8, 2);
    await page.screenshot({ path: `artifacts/drone-route-${viewport.width}-plan.png` });

    await page.getByRole('button', { name: /출발!/ }).click();
    for (const name of ['벌목지', '막힌 물길', '공사장']) {
      const record = page.locator('.drone-v4__rec.is-center').filter({ hasText: name });
      await expect(record).toBeVisible();
      await record.click();
    }
    await expect(page.locator('.drone-v4__flight-status')).toHaveText('이륙장으로 복귀 중');
    await expect(page.locator('.drone-v4__rec')).toBeDisabled();
    await page.screenshot({ path: `artifacts/drone-route-${viewport.width}-return.png` });
    await expect(page.locator('.drone-v4.is-review')).toBeVisible();
    await expect(page.locator('.photo-card:not(.is-missing)')).toHaveCount(3);

    const layout = await page.locator('.drone-v4__map-key').evaluate((key) => {
      const frame = key.getBoundingClientRect();
      const route = key.querySelector('.drone-v4__route-key')!.getBoundingClientRect();
      const wind = key.querySelector('.drone-v4__wind-key')!.getBoundingClientRect();
      const canvas = key.parentElement!.querySelector('.phaser-stage')!.getBoundingClientRect();
      return { legendFits: route.left >= frame.left && route.right <= wind.left && wind.right <= frame.right, separateFromCanvas: frame.bottom <= canvas.top + 1 };
    });
    expect(layout).toEqual({ legendFits: true, separateFromCanvas: true });
    await page.getByRole('button', { name: '4초 다시 보기' }).click();
    await expect(page.locator('.replay-badge')).toBeVisible();
    await expect(page.locator('.replay-badge')).toHaveCount(0);
    await page.screenshot({ path: `artifacts/drone-route-${viewport.width}-review.png` });
  });
}

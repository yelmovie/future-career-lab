import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 915, height: 412 }, reducedMotion: 'reduce' });

test('a stale app chunk is cleared once and the latest screen opens automatically', async ({ page }) => {
  let failedRequests = 0;
  await page.route('**/src/app/App.tsx*', async (route) => {
    if (failedRequests === 0) {
      failedRequests += 1;
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'stale chunk' });
      return;
    }
    await route.continue();
  });

  await page.goto('/#/page/3');
  await expect(page.locator('.game-shell.page-3')).toBeVisible();
  expect(failedRequests).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('future-career-lab.boot-recovery.v1'))).toBeNull();
  expect(new URL(page.url()).searchParams.has('app-recovery')).toBe(false);
});

test('a repeated boot failure gives an explicit Chrome fallback instead of looping', async ({ page }) => {
  await page.route('**/src/app/App.tsx*', (route) => route.fulfill({ status: 503, contentType: 'text/plain', body: 'still unavailable' }));
  await page.goto('/');

  const boot = page.locator('.boot-screen');
  await expect(boot).toContainText('연결을 확인하고 화면을 다시 열어 줘.');
  await expect(boot).toContainText('Chrome에서 열어 줘.');
  await expect(page.getByRole('button', { name: '다시 열기' })).toBeVisible();
});

import { expect, test } from '@playwright/test';

test.use({ channel: 'chrome' });

test('page 8 runs the accelerated priority loop and spends AP once', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/#/page/8');
  await expect(page.getByRole('heading', { name: '일의 순서를 정해 보자' })).toBeVisible();
  await page.getByRole('button', { name: '30초로 해 보기' }).click();
  await expect(page.getByRole('timer')).toContainText('00:');
  await expect(page.locator('.p07-scene canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: '앵무새가 달라 보여' })).toBeVisible();
  await page.getByRole('button', { name: /먹는 모습과 깃털 적기/ }).click();
  await expect(page.getByLabel(/남은 힘 9/)).toBeVisible();
  await expect(page.getByRole('button', { name: /앵무새가 달라 보여/ })).toContainText('완료');
  expect(runtimeErrors).toEqual([]);
});

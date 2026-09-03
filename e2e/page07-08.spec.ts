import { expect, test } from '@playwright/test';

test.use({ channel: 'chrome' });

test('page 7 runs the accelerated priority loop and spends AP once', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/#/page/7');
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

test('page 8 supports keyboard assignment and pauses its shared timer', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/#/page/8');
  await expect(page.getByRole('heading', { name: '직업의 힘을 이어 보자' })).toBeVisible();
  await page.getByRole('button', { name: '32초로 해 보기' }).click();
  await expect(page.locator('.p08-scene canvas')).toBeVisible();

  const caretaker = page.locator('.p08-job-card').filter({ hasText: '동물 돌봄가' });
  await caretaker.focus();
  await page.keyboard.press('Enter');
  await expect(caretaker).toHaveAttribute('aria-pressed', 'true');

  const park = page.getByRole('button', { name: /공존 공원/ });
  await park.focus();
  await page.keyboard.press('Enter');
  await expect(caretaker).toContainText(/가는 중|돕는 중|쉬는 중/);

  await page.getByRole('button', { name: '전략 잠시 멈춤' }).click();
  await expect(page.getByRole('heading', { name: '도시 문제 풀이가 멈췄어' })).toBeVisible();
  const timerValue = await page.getByRole('timer').locator('strong').textContent();
  await page.waitForTimeout(700);
  await expect(page.getByRole('timer').locator('strong')).toHaveText(timerValue ?? '');
  await page.getByRole('button', { name: '계속하기' }).click();
  expect(runtimeErrors).toEqual([]);
});

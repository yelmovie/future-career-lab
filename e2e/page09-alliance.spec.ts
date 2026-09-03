import { expect, test } from '@playwright/test';

test.use({ channel: 'chrome' });

test('page 9 supports keyboard assignment and pauses its shared timer', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/#/page/9');
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

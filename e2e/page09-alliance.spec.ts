import { expect, test } from '@playwright/test';


test('page 9 supports keyboard pair assignment and advances a turn', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/#/page/9');
  await expect(page.getByRole('heading', { name: '네 직업의 힘을 짝지어 보자' })).toBeVisible();
  await page.getByRole('button', { name: '작전 시작' }).click();
  await expect(page.locator('.p08-scene canvas')).toBeVisible();
  await expect(page.locator('.p08-turn strong')).toHaveText('1턴');

  const fireCard = page.locator('.p08-crisis-card').filter({ hasText: '벌목지 화재 확산' });
  await expect(fireCard.locator('.p08-crisis-gauge')).toHaveText('위기 40%');
  await expect(fireCard).not.toContainText(/드론|방송/);

  const assignByKeyboard = async (badge: string) => {
    const card = page.locator('.p08-job-card').filter({ hasText: badge });
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    const target = fireCard.getByRole('button', { name: /벌목지 화재 확산, 위기/ });
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(card).toContainText('벌목지 화재 확산에 배치');
  };
  await assignByKeyboard('드론 현장가');
  await assignByKeyboard('미래방송기술자');

  await page.getByRole('button', { name: '턴 진행' }).click();
  await expect(page.locator('.p08-turn strong')).toHaveText('2턴');
  await expect(fireCard.locator('.p08-crisis-gauge')).toHaveText('안정');
  const flockCard = page.locator('.p08-crisis-card').filter({ hasText: '앵무 무리 이동 경로 위험' });
  await expect(flockCard.locator('.p08-crisis-gauge')).toHaveText('위기 50%');
  await expect(page.locator('.p08-job-card').filter({ hasText: '드론 현장가' })).toContainText('쉬는 중');
  await expect(page.locator('.p08-turn small')).toContainText('12턴 안에');
  await expect(page.locator('.p08-metrics')).toContainText('잃은 숲 노드');
  expect(runtimeErrors).toEqual([]);
});

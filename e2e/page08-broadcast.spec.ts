import { expect, test } from '@playwright/test';


test('page 8 airs the opening segment from the cue sheet without a timer', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) runtimeErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/#/page/8');
  await expect(page.getByRole('heading', { name: '오프닝 준비', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByTestId('trust-text')).toHaveText('신뢰 100점 · 정정 0회');

  // 큐시트는 필요한 것만 말하고 소스 이름은 알려 주지 않는다
  const cue = page.getByRole('list', { name: '큐시트' }).locator('.is-current');
  await expect(cue).toContainText('진행자가 사건을 소개해');
  await expect(cue).not.toContainText('스튜디오 카메라');

  const air = page.getByRole('button', { name: /1번 송출/ });
  await expect(air).toBeDisabled();

  // 1. 잘못된 소스 → 되묻는 힌트(답 없음), 맞는 소스 → 힌트 사라짐
  await page.getByRole('button', { name: '드론 사진', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('보여 주기');
  await expect(page.getByRole('alert')).not.toContainText('스튜디오 카메라');
  await page.getByRole('button', { name: '스튜디오 카메라', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // 2. 출처 있는 자막 (키보드 대안 경로)
  await page.getByRole('button', { name: /출처: 조사 그래프/ }).first().click();
  await page.getByRole('button', { name: '자막 올리기', exact: true }).click();
  await expect(page.locator('.preview-caption')).toContainText('조사 그래프');

  // 3. 오디오 레벨을 초록 구간으로
  await page.getByRole('slider', { name: '오디오 레벨' }).fill('55');
  await expect(air).toBeEnabled();
  await air.click();

  await expect(page.getByRole('heading', { name: '현장 상황 준비', exact: true })).toBeVisible();
  await expect(page.getByTestId('trust-text')).toHaveText('신뢰 100점 · 정정 0회');
  expect(runtimeErrors).toEqual([]);
});

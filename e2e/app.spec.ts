import { expect, test } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

test('home loads and a corrupt save recovers safely', async ({ page }) => {
  await page.goto('/#/page/1');
  await expect(page.getByRole('heading', { level: 1, name: '미래 직업실' })).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('안전하게 새 탐험판');
});

test('briefing requires all four job cards, a name and a prediction before departure', async ({ page }) => {
  await page.goto('/#/page/2');
  const depart = page.getByRole('button', { name: /탐험단 입단하고 출발/ });
  await expect(depart).toBeDisabled();
  for (const card of await page.locator('.job-card').all()) await card.click();
  await page.getByPlaceholder('이름을 적어 봐').fill('테스트');
  await page.locator('.prediction__option').nth(2).click();
  await expect(depart).toBeEnabled();
  await depart.click();
  await expect(page.getByRole('heading', { level: 1, name: '드론 정찰 비행' })).toBeVisible();

  await page.goto('/#/page/1');
  await page.getByRole('button', { name: /이어하기/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: '드론 정찰 비행' })).toBeVisible();
});

test('certificate stays locked until five real stage flags are complete', async ({ page }) => {
  await page.goto('/#/page/11');
  await page.reload();
  await expect(page.getByRole('heading', { name: /수료증은 다섯 스테이지/ })).toBeVisible();
});

test('unlocked certificate has a clean print view', async ({ page }) => {
  await page.goto('/#/page/11');
  await page.evaluate((key) => {
    const now = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 2,
      contentVersion: '2026.09',
      sessionSeed: 42,
      playerName: '테스트 탐험가',
      lastPage: 11,
      stageProgress: { completed: { 1: true, 2: true, 3: true, 4: true, 5: true }, completedPages: [3, 4, 5, 6, 7, 8, 9] },
      badges: [], jobCards: [],
      traits: { exploration: 1, analysis: 2, creation: 3, care: 4, execution: 3, collaboration: 2 },
      logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: true,
      rewardGranted: [], audio: { bgmVolume: 0, sfxVolume: 0, muted: true }, updatedAt: now,
      artifacts: { photos: [], hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null },
      prediction: 'drone', abilityStatements: ['조건을 하나씩 바꿔서 원인을 찾을 수 있다'],
    }));
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByLabel('미래 직업실 탐험 수료증')).toBeVisible();
  await expect(page.getByText('테스트 탐험가', { exact: true })).toBeVisible();
  await expect(page.getByText(/나는 이제 조건을 하나씩/)).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.certificate-sheet')).toBeVisible();
});

import { expect, test } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

test('home loads and a corrupt save recovers safely', async ({ page }) => {
  await page.goto('/#/page/1');
  await expect(page.getByRole('heading', { level: 1, name: '미래 직업실' })).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('안전하게 새 탐험판');
});

test('certificate stays locked until five real stage flags are complete', async ({ page }) => {
  await page.goto('/#/page/10');
  await page.reload();
  await expect(page.getByRole('heading', { name: /수료증은 다섯 스테이지/ })).toBeVisible();
});

test('unlocked certificate has a clean print view', async ({ page }) => {
  await page.goto('/#/page/10');
  await page.evaluate((key) => {
    const now = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      contentVersion: '2026.08',
      sessionSeed: 42,
      playerName: '테스트 탐험가',
      lastPage: 10,
      stageProgress: { completed: { 1: true, 2: true, 3: true, 4: true, 5: true }, completedPages: [2, 3, 4, 5, 6, 7, 8] },
      badges: [], jobCards: [],
      traits: { exploration: 1, analysis: 2, creation: 3, care: 4, execution: 3, collaboration: 2 },
      logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: true,
      rewardGranted: [], audio: { bgmVolume: 0, sfxVolume: 0, muted: true }, updatedAt: now,
    }));
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByLabel('미래 직업실 탐험 수료증')).toBeVisible();
  await expect(page.getByText('테스트 탐험가', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.certificate-sheet')).toBeVisible();
});

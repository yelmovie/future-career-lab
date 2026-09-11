import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

function makeSave(completed = false) {
  return {
    schemaVersion: 2,
    contentVersion: '2026.09',
    sessionSeed: 42,
    playerName: '테스트 탐험가',
    lastPage: completed ? 10 : 9,
    stageProgress: {
      completed: completed ? { 1: true, 2: true, 3: true, 4: true, 5: true } : { 1: true, 2: true, 3: true, 4: true, 5: false },
      completedPages: completed ? [3, 4, 5, 6, 7, 8, 9] : [3, 4, 5, 6, 7, 8],
    },
    badges: [],
    jobCards: [],
    traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [],
    pageData: {},
    dailyMissionId: 'daily-1',
    certificateUnlocked: completed,
    rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: {
      photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }],
      hypothesis: 'logging',
      careLog: [],
      habitatStars: 3,
      traces: [],
      graphs: [],
      clip: { trust: 90, corrections: 0 },
      allianceTurns: completed ? 12 : null,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function seed(page: Page, completed = false) {
  await page.goto('/#/page/1');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, makeSave(completed)] as const);
  await page.reload();
}

test.use({ viewport: { width: 1280, height: 720 } });

test('alliance revisit after completion shows the ending straight away', async ({ page }) => {
  await seed(page, true);
  await page.goto('/#/page/9');
  await expect(page.getByRole('button', { name: '수료증 확인하기' })).toBeVisible();
  await expect(page.locator('.p9-relay')).toHaveCount(0);
  await expect(page.locator('.coop-team-summary article')).toHaveCount(4);
});

test('retired reflection route redirects to the certificate without ability statements', async ({ page }) => {
  await seed(page, true);
  await page.goto('/#/page/10');

  await expect(page).toHaveURL(/#\/page\/11$/);
  await expect(page.getByLabel('미래 직업실 탐험 수료증')).toBeVisible();
  await expect(page.locator('.v4-choice')).toHaveCount(0);
  await expect(page.locator('.certificate-abilities')).toHaveCount(0);
});

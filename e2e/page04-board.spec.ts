import { expect, test } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

const baseSave = {
  schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '테스트', lastPage: 4,
  stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [3] },
  badges: [], jobCards: [], traits: { exploration: 1, analysis: 1, creation: 0, care: 0, execution: 1, collaboration: 0 },
  logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
  audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
  artifacts: {
    photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }],
    hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null,
  },
  prediction: 'drone', abilityStatements: [], updatedAt: new Date().toISOString(),
};

/** 페이지 4 를 먼저 연 뒤 저장값을 심고 새로고침한다. 순서를 바꾸면 실행 중인 앱이 기본 저장값으로 덮어쓴다. */
async function seed(page: import('@playwright/test').Page, save: object) {
  await page.goto('/#/page/4');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, save] as const);
  await page.reload();
}

test('evidence board opens on step 1 and locks the next button until the step is done', async ({ page }) => {
  await seed(page, baseSave);

  await expect(page.getByRole('heading', { name: '사진 속 숨은 것을 찾아' })).toBeVisible();
  const next = page.locator('.p4-next');
  await expect(next).toBeDisabled();
  await expect(next).toContainText('숨은 것 찾기 먼저 끝내기');

  // 사진을 누르면 크게 보기가 열리고, 못 찾을 때 쓸 힌트 버튼이 있다.
  await page.locator('.p4-photo').first().click();
  await expect(page.getByRole('dialog')).toContainText('크게 보기');
  await page.getByRole('button', { name: '못 찾겠어요' }).click();
  await expect(page.locator('.zoom-help')).toBeVisible();
});

test('sorted photo cards keep a zoom button so finding details never dead-ends', async ({ page }) => {
  // 세부·연결은 끝났고 분류만 남은 상태로 시작한다.
  await seed(page, {
    ...baseSave,
    pageData: {
      p4Details: ['stump', 'dam', 'noise-sign'],
      p4Links: ['stump::cctv', 'dam::footprint'],
      p4Bins: { logging: 'doubt' },
    },
  });

  await expect(page.getByRole('heading', { name: '카드를 세 칸으로 나눠' })).toBeVisible();
  // 칸에 들어간 사진 카드에도 돋보기가 남아 있어야 한다 (다시 확대할 길이 막히면 안 됨).
  const sorted = page.locator('.evidence-bin.is-doubt .evidence-card').filter({ hasText: '벌목지 사진' });
  await expect(sorted.locator('.evidence-card__zoom')).toBeVisible();
});

test('the last step hands out the hypothesis card and the stage badge', async ({ page }) => {
  await seed(page, {
    ...baseSave,
    pageData: {
      p4Details: ['stump', 'dam', 'noise-sign'],
      p4Links: ['stump::cctv', 'dam::footprint'],
      p4Bins: { logging: 'sure', stream: 'sure', construction: 'doubt', cctv: 'sure', footprint: 'sure', silence: 'doubt', 'city-night': 'none' },
    },
  });

  await expect(page.getByRole('heading', { name: '앵무새가 사라진 까닭은?' })).toBeVisible();
  await page.locator('.p4-guess').first().click();
  await expect(page.getByRole('button', { name: /앵무새 살피러 가기/ })).toBeVisible();

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(saved.artifacts.hypothesis).toBe('logging');
  expect(saved.stageProgress.completedPages).toContain(4);
});

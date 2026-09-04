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
      allianceTurns: completed ? 3 : null,
    },
    prediction: 'drone',
    abilityStatements: [],
    updatedAt: new Date().toISOString(),
  };
}

async function seed(page: Page, completed = false) {
  await page.goto('/#/page/1');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, makeSave(completed)] as const);
  await page.reload();
}

/** 칩 탭 → 슬롯 탭 (SlotBoard 의 터치 경로) */
async function placePair(page: Page, first: string, second: string) {
  await page.getByRole('button', { name: first, exact: true }).click();
  await page.getByRole('button', { name: '힘 1 자리' }).click();
  await page.getByRole('button', { name: second, exact: true }).click();
  await page.getByRole('button', { name: '힘 2 자리' }).click();
}

test.use({ viewport: { width: 1280, height: 720 } });

test('alliance: three crises in a row, a wrong pair bounces back, the ending hands off to reflection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  await page.goto('/#/page/9');

  await expect(page.getByRole('heading', { name: '힌트에 맞는 힘 두 개를 놓아' })).toBeVisible();
  await expect(page.locator('.v4-bubble span')).toHaveText('탐험단장');
  await expect(page.locator('.p9-crisis h3')).toHaveText('숲 가장자리 화재');
  await expect(page.locator('.p9-hints')).not.toContainText(/드론|방송|돌봄|생태/);

  // 비활성 출동 버튼은 힌트 토스트만 띄운다
  await page.getByRole('button', { name: '출동!' }).click();
  await expect(page.locator('.v4-hint')).toHaveText('배지 두 개를 자리에 놓아');

  // 틀린 짝 → 튕기고 질문 한 줄
  await placePair(page, '드론 현장가', '동물돌봄 전문가');
  await page.getByRole('button', { name: '출동!' }).click();
  await expect(page.locator('.v4-react')).toHaveText('이 힌트는 누구 힘이지?');
  await expect(page.locator('.p9-crisis h3')).toHaveText('숲 가장자리 화재');
  await expect(page.locator('.v4-slot.has-chip')).toHaveCount(0);

  await placePair(page, '드론 현장가', '미래방송기술자');
  await page.getByRole('button', { name: '출동!' }).click();
  await expect(page.locator('.p9-crisis h3')).toHaveText('새 둥지 구역 대피');

  // 새로고침해도 위기 순서와 시도 횟수가 남는다
  await page.reload();
  await expect(page.locator('.p9-crisis h3')).toHaveText('새 둥지 구역 대피');
  await expect(page.locator('.v4-status')).toHaveText('위기 2 / 3');

  await placePair(page, '생태연구가', '동물돌봄 전문가');
  await page.getByRole('button', { name: '출동!' }).click();
  await expect(page.locator('.p9-crisis h3')).toHaveText('시민 오해');

  await placePair(page, '미래방송기술자', '생태연구가');
  await page.getByRole('button', { name: '출동!' }).click();

  await expect(page.getByText('혼자였다면 하나도 못 막았어. 넷이 이어 붙어서 셋을 다 지켰어.')).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(saved.artifacts.allianceTurns).toBe(4);
  expect(saved.stageProgress.completedPages).toContain(9);
  expect(saved.badges).toContain('연합 엠블럼');

  await page.getByRole('button', { name: '탐험 돌아보기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '탐험 돌아보기' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('alliance revisit after completion shows the ending straight away', async ({ page }) => {
  await seed(page, true);
  await page.goto('/#/page/9');
  await expect(page.getByRole('button', { name: '탐험 돌아보기' })).toBeVisible();
  await expect(page.locator('.p9-crisis')).toHaveCount(0);
});

test('reflection: prediction vs actual, then two picture statements unlock the certificate', async ({ page }) => {
  await seed(page, true);
  await page.goto('/#/page/10');

  await expect(page.getByRole('heading', { name: '예측과 실제를 비교해 봐' })).toBeVisible();
  await expect(page.locator('.p10-job').first()).toContainText('드론 현장가');
  await expect(page.locator('.p10-job img').first()).toHaveAttribute('src', '/assets/page-08/slot-05.webp');
  await expect(page.locator('.v4-mentor img')).toHaveAttribute('src', /mentor/);
  await page.getByRole('button', { name: /나는 이제/ }).click();

  await expect(page.getByRole('heading', { name: '내가 해 낸 것 두 개를 골라' })).toBeVisible();
  const next = page.getByRole('button', { name: /수료증 확인하기/ });
  await next.click();
  await expect(page.locator('.v4-hint')).toHaveText('문장을 2개 더 골라');

  const cards = page.locator('.v4-choice');
  await expect(cards).toHaveCount(6);
  await cards.nth(0).click();
  await cards.nth(3).click();
  await expect(page.locator('.v4-status')).toHaveText('2 / 2');
  await cards.nth(5).click();
  await expect(page.locator('.v4-react')).toHaveText('두 개까지만 고를 수 있어');

  await next.click();
  await expect(page.getByLabel('미래 직업실 탐험 수료증')).toBeVisible();
  await expect(page.locator('.certificate-abilities li')).toHaveCount(2);
});

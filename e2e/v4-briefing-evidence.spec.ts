import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

const baseSave = {
  schemaVersion: 2, contentVersion: '2026.09', sessionSeed: 42, playerName: '', lastPage: 2,
  stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [] as number[] },
  badges: [], jobCards: [], traits: { exploration: 0, analysis: 0, creation: 0, care: 0, execution: 0, collaboration: 0 },
  logs: [], pageData: {}, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
  audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
  artifacts: {
    photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }],
    hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null,
  },
  prediction: null, abilityStatements: [], updatedAt: new Date().toISOString(),
};

/** 페이지를 먼저 연 뒤 저장값을 심고 새로고침한다. 순서를 바꾸면 실행 중인 앱이 기본 저장값으로 덮어쓴다. */
async function seed(page: Page, pageNumber: number, save: object) {
  await page.goto(`/#/page/${pageNumber}`);
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, save] as const);
  await page.reload();
}

test.use({ viewport: { width: 1280, height: 720 } });

test('briefing: three steps, then the drone page', async ({ page }) => {
  await seed(page, 2, baseSave);
  const next = page.locator('.v4-next');

  // 1 사건: 말풍선 3줄
  await expect(page.getByRole('heading', { name: '말풍선을 눌러 이야기를 들어' })).toBeVisible();
  await expect(next).toHaveClass(/is-off/);
  const line = page.locator('.brief-line');
  await line.click();
  await line.click();
  await expect(line).toHaveClass(/is-last/);
  await expect(next).not.toHaveClass(/is-off/);
  await next.click();

  // 2 네 직업: 캐릭터 4명 탭
  await expect(page.getByRole('heading', { name: '직업 캐릭터를 하나씩 눌러 봐' })).toBeVisible();
  const characters = page.getByRole('group', { name: '직업 캐릭터' }).getByRole('button');
  await expect(characters).toHaveCount(4);
  await characters.nth(0).click();
  await expect(page.locator('.brief-tools li')).toHaveCount(3);
  await next.click();
  await expect(page.locator('.v4-hint')).toBeVisible();
  for (let index = 1; index < 4; index += 1) await characters.nth(index).click();
  // 진행이 저장돼 새로고침해도 처음부터 다시 누르지 않는다
  const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p2Progress, SAVE_KEY);
  expect(progress).toEqual({ line: 2, met: ['drone', 'care', 'ecology', 'broadcast'] });
  await page.reload();
  await expect(page.getByRole('heading', { name: '이름을 적고 직업 하나를 골라' })).toBeVisible();

  // 3 명찰: 이름 + 직업 아이콘
  await expect(page.getByRole('heading', { name: '이름을 적고 직업 하나를 골라' })).toBeVisible();
  await page.getByPlaceholder('이름을 적어 봐').fill('하늘');
  await page.getByRole('group', { name: '제일 잘 맞을 것 같은 직업' }).getByRole('button').first().click();
  await expect(next).toHaveText(/출발/);
  await next.click();
  await expect(page.getByRole('heading', { level: 1, name: '드론 정찰 비행' })).toBeVisible();
});

test('evidence board: find three details, pick a hypothesis, done', async ({ page }) => {
  await seed(page, 4, baseSave);
  const next = page.locator('.v4-next');
  await expect(page.getByRole('heading', { name: '사진을 눌러 이상한 곳을 찾아' })).toBeVisible();
  await expect(next).toHaveClass(/is-off/);

  // 사진 3장: 확대 → 핫스팟 가운데 탭 (PHOTO_DETAILS 비율)
  const details = [
    { photo: '벌목지', x: .14 + .32 / 2, y: .28 + .36 / 2 },
    { photo: '막힌 물길', x: .24 + .5 / 2, y: .34 + .28 / 2 },
    { photo: '공사장', x: .5 + .12 / 2, y: .54 + .16 / 2 },
  ];
  for (const detail of details) {
    await page.getByRole('button', { name: new RegExp(`^${detail.photo} 사진`) }).click();
    const zoom = page.getByRole('dialog').locator('.zoom-frame img');
    const box = (await zoom.boundingBox())!;
    await zoom.click({ position: { x: box.width * detail.x, y: box.height * detail.y } });
    await expect(page.locator('.zoom-mark')).toBeVisible();
    await page.getByRole('button', { name: '찾았어! 닫기' }).click();
  }
  await expect(page.locator('.p4-photo.is-done')).toHaveCount(3);
  await expect(page.locator('.v4-status')).toHaveText('3 / 3');
  await next.click();

  // 가설 카드 1장
  await expect(page.getByRole('heading', { name: '모모와 루비는 왜 떠났을까?' })).toBeVisible();
  await expect(page.locator('.p4-found li')).toHaveText(['톱 자국 그루터기', '물길 막은 자재', '소음 작업 표지']);
  await page.getByRole('group', { name: '가설 고르기' }).getByRole('button', { name: /소음 때문/ }).click();
  await expect(page.locator('.v4-done')).toContainText('드론 현장가 배지 획득!');
  await expect(page.locator('.v4-done')).toContainText('조용한 깊은 숲에서 모모와 루비를 찾았대!');
  await expect(next).toHaveText(/모모와 루비 살피러/);

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(saved.artifacts.hypothesis).toBe('noise');
  expect(saved.pageData.p4Details).toEqual(['stump', 'dam', 'noise-sign']);
  expect(saved.stageProgress.completedPages).toContain(4);
  expect(saved.badges).toContain('드론 현장가 배지');

  await next.click();
  await expect(page.getByRole('heading', { level: 1, name: /모모와 루비/ })).toBeVisible();
});

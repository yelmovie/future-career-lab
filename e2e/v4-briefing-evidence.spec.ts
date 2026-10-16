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
  updatedAt: new Date().toISOString(),
};

/** 홈 초기화가 끝난 뒤 저장값을 심고, 새로고침한 다음 목표 페이지로 이동한다. */
async function seed(page: Page, pageNumber: number, save: object) {
  await page.goto('/#/page/1');
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, save] as const);
  await page.reload();
  await page.goto(`/#/page/${pageNumber}`);
}

test.use({ viewport: { width: 1280, height: 720 } });

test('briefing: two steps, then the drone page', async ({ page }) => {
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
  await expect(page.getByRole('heading', { name: '직업 캐릭터를 하나씩 눌러 봐' })).toBeVisible();
  await expect(page.getByText('제일 잘 맞을 것 같은 직업을 골라')).toHaveCount(0);
  await expect(next).toHaveText(/출발/);
  await next.click();
  await expect(page.getByRole('heading', { level: 1, name: '드론 정찰 비행' })).toBeVisible();
});

test('evidence board: find three details, pick a hypothesis, done', async ({ page }) => {
  await seed(page, 4, baseSave);
  const next = page.locator('.v4-next');
  await expect(page.getByRole('heading', { name: '사진을 눌러 이상한 곳을 찾아' })).toBeVisible();
  await expect(next).toHaveClass(/is-off/);

  // 사진 3장: 확대 → 실제 관찰 버튼으로 흔적 발견
  for (const photo of ['벌목지', '막힌 물길', '공사장']) {
    await page.getByRole('button', { name: new RegExp(`^${photo} 사진`) }).click();
    await page.getByRole('dialog').locator('button.zoom-observation').click();
    await expect(page.locator('.zoom-mark')).toBeVisible();
    const label = page.locator('.zoom-mark__label');
    await expect(label).toBeVisible();
    const geometry = await label.evaluate((node) => {
      const labelRect = node.getBoundingClientRect();
      const frameRect = node.closest('.zoom-frame')!.getBoundingClientRect();
      const textRange = document.createRange();
      textRange.selectNodeContents(node);
      const textRect = textRange.getBoundingClientRect();
      return {
        noTextOverflow: textRect.left >= labelRect.left && textRect.right <= labelRect.right && textRect.top >= labelRect.top && textRect.bottom <= labelRect.bottom,
        insideFrame: labelRect.left >= frameRect.left && labelRect.right <= frameRect.right && labelRect.top >= frameRect.top && labelRect.bottom <= frameRect.bottom,
      };
    });
    expect(geometry).toEqual({ noTextOverflow: true, insideFrame: true });
    await page.getByRole('button', { name: '찾았어! 닫기' }).click();
  }
  await expect(page.locator('.p4-photo.is-done')).toHaveCount(3);
  await expect(page.locator('.v4-status')).toHaveText('3 / 3');
  await next.click();

  // 가설 카드 1장
  await expect(page.getByRole('heading', { name: '꾸꾸와 앵자 주변, 새가 왜 줄었을까?' })).toBeVisible();
  await expect(page.locator('.p4-found li')).toHaveText(['톱 자국 그루터기', '물길 막은 자재', '소음 작업 표지']);
  await page.getByRole('group', { name: '가설 고르기' }).getByRole('button', { name: /소음 때문/ }).click();
  // 카드를 골라도 바로 끝나지 않는다 — 해설 화면을 읽고 배지를 받는다
  await expect(page.locator('.v4-done')).toHaveCount(0);
  await expect(page.locator('.v4-bubble')).toContainText('공사 소리에 놀랐을 거라고 생각했구나.');
  await next.click();
  await expect(page.getByRole('heading', { name: '흔적을 모아 이유를 짐작했어' })).toBeVisible();
  await expect(page.locator('.p4-explain__answer strong')).toHaveText('소음 때문');
  await expect(next).toHaveText(/배지 받기/);
  await next.click();
  await expect(page.locator('.v4-done')).toContainText('드론 현장가 배지 획득!');
  await expect(page.locator('.v4-done')).toContainText('현장 사진을 단서로');
  await expect(page.locator('.v4-done')).toContainText('새가 떠난 이유는 생태 실험에서 확인');
  await expect(next).toHaveText(/꾸꾸와 앵자 살피러/);

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(saved.artifacts.hypothesis).toBe('noise');
  expect(saved.pageData.p4Details).toEqual(['stump', 'dam', 'noise-sign']);
  expect(saved.stageProgress.completedPages).toContain(4);
  expect(saved.badges).toContain('드론 현장가 배지');

  await next.click();
  await expect(page.getByRole('heading', { level: 1, name: /꾸꾸와 앵자/ })).toBeVisible();
});

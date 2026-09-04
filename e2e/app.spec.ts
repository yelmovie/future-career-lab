import { expect, test } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

test('home loads and a corrupt save recovers safely', async ({ page }) => {
  await page.goto('/#/page/1');
  await expect(page.getByRole('heading', { level: 1, name: '미래 직업실' })).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('안전하게 새 탐험판');
});

test('home exposes start, continue, sound and settings controls with classroom touch sizes', async ({ page }) => {
  await page.goto('/#/page/1');
  const start = page.getByRole('button', { name: '시작하기' });
  const resume = page.getByRole('button', { name: '이어하기' });
  const sound = page.getByRole('button', { name: '소리 끄기' });
  const settings = page.getByRole('button', { name: '설정 열기' });

  await expect(start).toBeVisible();
  await expect(resume).toBeDisabled();
  for (const control of [start, resume, sound, settings]) {
    const box = await control.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
  }

  await sound.click();
  await expect(page.getByRole('button', { name: '소리 켜기' })).toBeVisible();
  await settings.click();
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();

  await start.click();
  await expect(page.getByRole('heading', { level: 1, name: '탐험단 브리핑' })).toBeVisible();
});

test('drone controls keep elementary touch targets on a 1024px tablet', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/#/page/3');
  await page.waitForTimeout(800);

  for (const control of [page.getByRole('button', { name: '메인으로 이동' }), page.getByRole('button', { name: '도움말' })]) {
    const box = await control.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(48);
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(48);
  }

  const map = page.locator('.phaser-stage canvas');
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * .3, y: box.height * .28 } });
  await map.click({ position: { x: box.width * .6, y: box.height * .72 } });
  await page.getByRole('button', { name: /출발!/ }).click();

  const directions = page.locator('.direction-pad button');
  await expect(directions).toHaveCount(4);
  for (const control of await directions.all()) {
    const size = await control.boundingBox();
    expect(Math.round(size?.width ?? 0)).toBeGreaterThanOrEqual(48);
    expect(Math.round(size?.height ?? 0)).toBeGreaterThanOrEqual(48);
  }
  const record = page.getByRole('button', { name: /REC/ });
  const recordBox = await record.boundingBox();
  expect(Math.round(recordBox?.width ?? 0)).toBeGreaterThanOrEqual(48);
  expect(Math.round(recordBox?.height ?? 0)).toBeGreaterThanOrEqual(48);
});

test.skip('briefing flow — superseded by v4-briefing-evidence.spec.ts', () => {});

test('certificate stays locked until five real stage flags are complete', async ({ page }) => {
  await page.goto('/#/page/11');
  await page.reload();
  await expect(page.getByRole('heading', { name: /수료증은 다섯 스테이지/ })).toBeVisible();
});

test('teacher password unlocks every screen at once without changing progress', async ({ page }) => {
  await page.goto('/#/page/1');
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByText('교사용 가이드', { exact: true }).click();

  await expect(page.getByText('수업 35분 운영 예시')).toHaveCount(0);
  await page.getByLabel('교사용 비밀번호').fill('yElSaM');
  await page.getByRole('button', { name: '전체 해금' }).click();

  await expect(page.getByText('교사용 전체 해금됨')).toBeVisible();
  await expect(page.getByText('전체 흐름 바로가기')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '화면 보기' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '정답지·판정 기준' })).toBeVisible();

  await page.getByRole('button', { name: '닫기' }).click();
  await page.getByRole('button', { name: '시작하기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '탐험단 브리핑' })).toBeVisible();

  const nextHeadings = [
    '드론 정찰 비행',
    '현장 증거판',
    '구조된 모모와 루비 살피기',
    '새 정원 다시 만들기',
    '숲 생태 조사',
    '생방송 컨트롤룸',
    '네 직업 연합 작전',
    '탐험 돌아보기',
    '탐험 수료증',
  ];
  for (const heading of nextHeadings) {
    const teacherNext = page.getByRole('button', { name: /교사용 다음 화면:/ });
    await expect(teacherNext).toBeVisible();
    const box = await teacherNext.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
    await teacherNext.click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  await expect(page.getByLabel('미래 직업실 탐험 수료증')).toBeVisible();

  const saved = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const progress = saved ? JSON.parse(saved) : null;
  expect(progress?.stageProgress.completedPages).toEqual([]);
  expect(progress?.certificateUnlocked).toBe(false);
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

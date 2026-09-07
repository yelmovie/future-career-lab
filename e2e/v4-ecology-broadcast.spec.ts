import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

function makeSave() {
  return {
    schemaVersion: 2,
    contentVersion: '2026.09',
    sessionSeed: 42,
    playerName: '테스트 탐험가',
    lastPage: 1,
    stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [] as number[] },
    badges: [] as string[],
    jobCards: [] as string[],
    traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [],
    pageData: {},
    dailyMissionId: 'daily-1',
    certificateUnlocked: false,
    rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: {
      photos: [
        { id: 'logging', quality: 'center' },
        { id: 'stream', quality: 'center' },
        { id: 'construction', quality: 'center' },
      ],
      hypothesis: 'logging',
      careLog: [],
      habitatStars: 3,
      traces: [],
      graphs: [
        { variable: 'logging', verdict: 'main' },
        { variable: 'noise', verdict: 'sub' },
        { variable: 'water', verdict: 'none' },
      ],
      clip: null,
      allianceTurns: 0,
    },
    prediction: 'drone',
    abilityStatements: [],
    updatedAt: new Date().toISOString(),
  };
}

async function seed(page: Page) {
  await page.goto('/#/page/1');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, makeSave()]);
  await page.reload();
}

test.use({ viewport: { width: 1280, height: 720 } });

test('page 7: six traces, shortest bar, outlier, three one-slider trials, main cause', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  await page.goto('/#/page/7');
  // 연결 화면: 지구·젤리 → 숲의 다른 새들
  await expect(page.getByRole('heading', { name: '지구와 젤리 말고, 숲의 다른 새들은?' })).toBeVisible();
  await page.getByRole('button', { name: /숲 둘러보기/ }).click();
  await expect(page.getByRole('heading', { name: '반짝이는 흔적을 눌러 봐' })).toBeVisible();

  // 1단계: 지점 탭 3개 × 흔적 2개. 다 찾기 전엔 다음 버튼이 힌트만 준다.
  const next = page.getByRole('button', { name: /새 세어 보기/ });
  await next.click();
  await expect(page.getByText('흔적 6개를 다 찾으면 켜져요')).toBeVisible();
  for (const tab of ['A 숲 가장자리', 'B 개울가', 'C 깊은 숲']) {
    await page.getByRole('tab', { name: tab }).click();
    const spots = page.locator('.p7-scene .v4-hotspot');
    await expect(spots).toHaveCount(2);
    await spots.nth(0).click();
    await spots.nth(1).click();
    await expect(page.locator('.p7-scene .v4-hotspot.is-done')).toHaveCount(2);
  }
  await expect(page.locator('.p7-stamps li.is-found')).toHaveCount(6);
  await next.click();

  // 2단계: 그림 속 새를 세어 제일 적은 곳. 틀리면 튕기고 한 줄 질문.
  await expect(page.getByRole('heading', { name: '새가 제일 적은 곳은?' })).toBeVisible();
  await page.getByRole('button', { name: /C 깊은 숲 새 8마리/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '새가 제일 적은 곳은 어디야' })).toBeVisible();
  await page.getByRole('button', { name: /A 숲 가장자리 새 1마리/ }).click();
  await expect(page.getByRole('heading', { name: '숲 가장자리엔 새가 거의 없네' })).toBeVisible();
  await page.getByRole('button', { name: /왜 그럴까/ }).click();

  // 3단계: 행동 카드 하나 → 예측 → 해 보기!(다음 버튼 자리) → 원래대로. 세 가지를 각각 한 번씩.
  await expect(page.getByRole('heading', { name: '하나만 골라서 해 보자' })).toBeVisible();
  const run = page.getByRole('button', { name: /해 보기!/ });
  await run.click();
  await expect(page.locator('.v4-hint')).toHaveText('행동 카드 하나를 골라');
  const cards = page.getByRole('group', { name: '행동 카드' });
  const tryAction = async (label: string, guess: string) => {
    await cards.getByRole('button', { name: new RegExp('^' + label) }).click();
    await page.getByRole('button', { name: guess, exact: true }).click();
    await run.click();
    await expect(page.locator('.p7-result')).toBeVisible();
    await page.getByRole('button', { name: /원래대로|원인 고르기/ }).click();
  };
  // 두 번째 카드를 같이 고르면 막히고 질문 한 줄
  await cards.getByRole('button', { name: /^나무 심기/ }).click();
  await cards.getByRole('button', { name: /^물 채우기/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '한 번에 하나만' })).toBeVisible();
  await page.getByRole('button', { name: '새가 돌아올 거야', exact: true }).click();
  await run.click();
  await expect(page.locator('.p7-result')).toContainText('예측이 맞았어');
  await page.getByRole('button', { name: '원래대로' }).click();
  await expect(page.locator('.v4-status')).toHaveText('해 본 것 1/3');
  // 이미 해 본 카드는 다시 못 고른다
  await cards.getByRole('button', { name: /^나무 심기/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '벌써 해 봤어' })).toBeVisible();
  await tryAction('기계 소리 멈추기', '새가 돌아올 거야');
  await expect(page.locator('.v4-status')).toHaveText('해 본 것 2/3');
  await tryAction('물 채우기', '그대로일 거야');

  await expect(page.getByRole('heading', { name: '새를 제일 많이 돌아오게 한 건?' })).toBeVisible();
  await page.getByRole('group', { name: '가장 큰 원인' }).getByRole('button', { name: /나무 심기/ }).click();
  await page.getByRole('button', { name: /결과 확정/ }).click();
  await expect(page.getByText('생태연구가 배지를 얻었어')).toBeVisible();
  const artifacts = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').artifacts, SAVE_KEY);
  expect(artifacts.graphs).toEqual([
    { variable: 'logging', verdict: 'main' },
    { variable: 'noise', verdict: 'sub' },
    { variable: 'water', verdict: 'none' },
  ]);
  expect(artifacts.traces).toHaveLength(6);
  await page.getByRole('button', { name: /생방송으로/ }).click();
  await expect(page).toHaveURL(/page\/8/);
  expect(errors).toEqual([]);
});

test('page 8: audio, four segments of screen + caption, rumor bounces, mic incident, clip saved', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  await page.goto('/#/page/8');
  await expect(page.getByRole('heading', { name: '소리를 초록 칸에 맞춰' })).toBeVisible();
  await page.getByLabel('오디오 레벨').fill('55');
  await page.getByRole('button', { name: /방송 시작/ }).click();

  const captions = () => page.getByRole('group', { name: '자막 고르기' }).getByRole('button');
  // 소문은 "?" 표식이 아니라 출처 글(SNS 제보·익명 댓글…)로만 가려낸다
  const RUMOR = /SNS 제보|익명|그러던데/;
  const airSegment = async (title: string, wrongSource: string, source: string) => {
    await expect(page.getByRole('heading', { name: `${title}: 어떤 화면?` })).toBeVisible();
    await page.getByRole('button', { name: wrongSource, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '보여 줄까' })).toBeVisible();
    await page.getByRole('button', { name: source, exact: true }).click();
    await expect(page.getByRole('heading', { name: '자막 하나를 골라' })).toBeVisible();
    await expect(captions()).toHaveCount(3);
    await expect(captions().filter({ hasText: '?' })).toHaveCount(0);
    await captions().filter({ hasNotText: RUMOR }).first().click();
    await page.getByRole('button', { name: /송출/ }).click();
  };

  // 1 오프닝: 소문을 먼저 내보내면 신뢰 -20, 같은 세그먼트에 머문다
  await expect(page.getByRole('heading', { name: '오프닝: 어떤 화면?' })).toBeVisible();
  await page.getByRole('button', { name: '스튜디오 카메라', exact: true }).click();
  await captions().filter({ hasText: RUMOR }).first().click();
  await page.getByRole('button', { name: /송출/ }).click();
  await expect(page.getByRole('status').filter({ hasText: '출처가 뭐였지' })).toBeVisible();
  await expect(page.locator('.v4-status')).toHaveText('신뢰 80');
  await expect(page.getByRole('heading', { name: '자막 하나를 골라' })).toBeVisible();
  await captions().filter({ hasNotText: RUMOR }).first().click();
  await page.getByRole('button', { name: /송출/ }).click();

  // 2 현장 상황 → 마이크 사고
  await airSegment('현장 상황', '현장 리포터', '드론 사진');
  await expect(page.getByRole('heading', { name: '마이크가 끊겼어!' })).toBeVisible();
  await page.getByRole('button', { name: /예비 마이크로 바꾸기/ }).click();

  await airSegment('원인 설명', '드론 사진', '스튜디오 카메라');
  await airSegment('시민 부탁', '스튜디오 카메라', '현장 리포터');

  await expect(page.getByText('생방송 완료')).toBeVisible();
  await expect(page.getByText('시청자 신뢰 80점', { exact: false })).toBeVisible();
  await expect(page.locator('.v4-status')).toHaveText('신뢰 80');
  await expect(page.locator('.v4-bubble')).toContainText('시민들이 도와주기로 했어!');
  const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);
  expect(save.artifacts.clip).toEqual({ trust: 80, corrections: 1 });
  expect(save.stageProgress.completedPages).toContain(8);
  await page.getByRole('button', { name: /연합 작전으로/ }).click();
  await expect(page).toHaveURL(/page\/9/);
  expect(errors).toEqual([]);
});

import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';

function makeSave() {
  return {
    schemaVersion: 2,
    contentVersion: '2026.09',
    sessionSeed: 42,
    playerName: '테스트 탐험가',
    lastPage: 1,
    stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [3, 4] },
    badges: [],
    jobCards: [],
    traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [],
    pageData: {},
    dailyMissionId: 'daily-1',
    certificateUnlocked: false,
    rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    artifacts: {
      photos: [{ id: 'logging', quality: 'center' }, { id: 'stream', quality: 'center' }, { id: 'construction', quality: 'center' }],
      hypothesis: 'logging',
      careLog: [],
      habitatStars: 0,
      traces: [],
      graphs: [],
      clip: { trust: 0, corrections: 0 },
      allianceTurns: 0,
    },
    prediction: null,
    abilityStatements: [],
    updatedAt: new Date().toISOString(),
  };
}

async function seed(page: Page) {
  await page.addInitScript(() => {
    const played: Array<{ src: string; volume: number }> = [];
    Object.defineProperty(window, '__playedAudio', { value: played, configurable: true });
    HTMLMediaElement.prototype.play = function play() {
      played.push({ src: this.currentSrc || this.src, volume: this.volume });
      return Promise.resolve();
    };
  });
  await page.goto('/#/page/1');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, makeSave()]);
  await page.reload();
}

const readSave = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), SAVE_KEY);

test.use({ viewport: { width: 1280, height: 720 } });

/** 핫스팟 순서대로, 돋보기에 실제로 보이는 진술 */
const GROUNDED: Record<string, string[]> = {
  지구: ['눈은 맑은데 계속 두리번거려', '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어', '숨을 곳이 없고 큰 소리가 계속 들려'],
  젤리: ['눈이 흐리고 반쯤 감겨 있어', '물이 아침 그대로고 부리가 말라 있어', '날개가 처지고 바닥 가까이 웅크려 있어'],
};

/** 핫스팟 제목 순서 (page05Data CARE_ZONES) */
const ZONES: Record<string, string[]> = { 지구: ['눈', '깃털', '주변 환경'], 젤리: ['눈', '물·먹이', '날개·자세'] };

/** 한 마리: 돋보기 3개(보이는 것 고르기) → 소리 비교 → 처치 카드 탭 → 앵무 탭 */
async function careBird(page: Page, name: string, verdict: '같아요' | '달라요', treatment: RegExp) {
  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 반짝이는 곳`) })).toBeVisible();
  const next = page.getByRole('button', { name: /^다음/ });
  await next.click();
  await expect(page.getByText('반짝이는 곳 3개가 남았어')).toBeVisible();
  const zoneNames = ZONES[name]!;
  for (const [index, zoneName] of zoneNames.entries()) {
    await page.getByRole('button', { name: new RegExp(`^${zoneName} 살펴보기`) }).click();
    const text = GROUNDED[name]![index]!;
    if (index === 0) {
      // 안 보이는 쪽을 고르면 기록되지 않고 되묻는다
      await page.locator('.p5-obs .v4-big-button').filter({ hasNotText: text }).click();
      await expect(page.getByText(/그게 정말 보여/)).toBeVisible();
      await expect(page.getByRole('button', { name: /살펴보기 \(봤어\)/ })).toHaveCount(0);
    }
    await page.getByRole('button', { name: text, exact: true }).click();
    await expect(page.getByRole('button', { name: /살펴보기 \(봤어\)/ })).toHaveCount(index + 1);
    // 기록판 스티커가 붙는다
    await expect(page.locator('.p5-board li.is-on')).toHaveCount(index + 1);
  }
  await next.click();

  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 소리를 비교`) })).toBeVisible();
  await page.getByRole('button', { name: '건강한 앵무 소리 듣기' }).click();
  await expect(page.getByRole('button', { name: '소리 끄기' })).toBeVisible();
  await expect.poll(async () => (await readSave(page)).audio).toMatchObject({ muted: false, sfxVolume: 0.7 });
  await page.getByRole('button', { name: `${name} 소리 듣기` }).click();
  const playedAudio = await page.evaluate(() => (window as Window & { __playedAudio?: Array<{ src: string; volume: number }> }).__playedAudio ?? []);
  expect(playedAudio).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: expect.stringMatching(/\/audio\/v2\/parrot-call-audible\.mp3$/), volume: 0.7 }),
    expect.objectContaining({ src: expect.stringMatching(new RegExp(`/audio/v2/${name === '지구' ? 'parrot-alarm' : 'parrot-call'}-audible\\.mp3$`)), volume: 0.7 }),
  ]));
  await expect(page.locator('.p5-sound-hint')).toHaveCount(0);
  await page.getByRole('button', { name: verdict === '같아요' ? '달라요' : '같아요' }).click();
  await expect(page.locator('.v4-big-button.is-wrong')).toHaveCount(1);
  await expect(page.locator('.p5-sound-hint')).toBeVisible();
  await page.getByRole('button', { name: verdict }).click();
  await next.click();

  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 맞는 처치`) })).toBeVisible();
  // 기록판이 3단계에도 그대로 보인다 (관찰이 처치의 근거)
  await expect(page.locator('.p5-board li.is-on')).toHaveCount(4);
  await page.getByRole('button', { name: '깃털 관리' }).click();
  await page.getByRole('button', { name: `${name}에게 고른 처치 주기` }).click();
  await expect(page.locator('.p5-bird.is-stable')).toHaveCount(0);
  await page.getByRole('button', { name: treatment }).click();
  await page.getByRole('button', { name: `${name}에게 고른 처치 주기` }).click();
  await expect(page.locator('.p5-bird.is-stable')).toBeVisible();
}

test('page 5: look, listen, treat 지구 then 젤리, then hand off to the garden', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);
  await page.goto('/#/page/5');

  await careBird(page, '지구', '달라요', /은신처/);
  await page.getByRole('button', { name: /젤리 살피기/ }).click();
  await careBird(page, '젤리', '같아요', /물·전해질/);
  await page.getByRole('button', { name: /돌봄 끝내기/ }).click();

  await expect(page.getByText('지구와 젤리 모두 안정됐어')).toBeVisible();
  const save = await readSave(page);
  expect(save.stageProgress.completedPages).toContain(5);
  expect(save.artifacts.careLog).toEqual([
    { bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' },
    { bird: 'red', issue: '탈수', treatment: '물·전해질' },
  ]);

  await page.getByRole('button', { name: /새 정원 다시 만들기/ }).click();
  await expect(page.getByRole('heading', { name: '필요한 물건 놓기' })).toBeVisible();
});

test('page 6: place chips by tap, test to 3 stars, complete', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);
  await page.goto('/#/page/6');

  const next = page.getByRole('button', { name: /^다음/ });
  await next.click();
  await expect(page.getByText('물건을 4개 더 놓아 봐')).toBeVisible();

  const put = async (chip: string, slot: string) => {
    await page.getByRole('button', { name: chip, exact: true }).click();
    await page.getByRole('button', { name: `${slot} 자리` }).click();
  };
  // 첫 시도는 일부러 틀리게: 물그릇을 사람이 지나는 길에
  await put('물그릇', '사람이 지나는 길');
  await expect(page.getByText(/사람이 지나는 길엔 발소리가 들려/)).toBeVisible();
  await put('숨는 집', '조용히 쉬는 곳');
  await put('놀이 줄', '먹고 노는 곳');
  await put('먹이 나무', '먹고 노는 곳');
  await expect(page.getByText('물건 4/4')).toBeVisible();
  await next.click();

  await expect(page.getByRole('heading', { name: '앵무새 불러 보기' })).toBeVisible();
  await page.getByRole('button', { name: /시험하기/ }).click();
  await expect(page.locator('.p6-stars span.is-on')).toHaveCount(1);
  await expect(page.getByText('물그릇을 조용히 쉬는 곳으로 옮겨 줘')).toBeVisible();

  await page.getByRole('button', { name: /옮겨서 다시/ }).click();
  await expect(page.getByRole('heading', { name: '필요한 물건 놓기' })).toBeVisible();
  // 놓인 칩을 탭하면 돌아오고, 다시 가운데로
  await page.getByRole('button', { name: '물그릇', exact: true }).click();
  await put('물그릇', '조용히 쉬는 곳');
  await expect(page.getByText('다 놓았네! 이제 불러서 정말 편한지 확인해 보자.')).toBeVisible();
  await next.click();
  await page.getByRole('button', { name: /시험하기/ }).click();
  await expect(page.locator('.p6-stars span.is-on')).toHaveCount(3);

  await page.getByRole('button', { name: /새 정원 완성/ }).click();
  await expect(page.getByText('동물돌봄 배지를 얻었어')).toBeVisible();
  await expect(page.getByRole('img', { name: '동물돌봄 배지' })).toBeVisible();
  const completionLayout = await page.evaluate(() => {
    const stage = document.querySelector('.v4-stage')!.getBoundingClientRect();
    const panel = document.querySelector('.v4-done')!.getBoundingClientRect();
    return { stageWidth: stage.width, stageHeight: stage.height, panelWidth: panel.width, panelHeight: panel.height };
  });
  expect(completionLayout.panelWidth).toBeLessThan(completionLayout.stageWidth * 0.6);
  expect(completionLayout.panelHeight).toBeLessThan(completionLayout.stageHeight * 0.55);
  const save = await readSave(page);
  expect(save.stageProgress.completedPages).toContain(6);
  expect(save.artifacts.habitatStars).toBe(3);
  expect(save.badges).toContain('동물돌봄 배지');

  await page.getByRole('button', { name: /숲의 다른 새들 보러 가기/ }).click();
  await expect(page).toHaveURL(/#\/page\/7/);
});

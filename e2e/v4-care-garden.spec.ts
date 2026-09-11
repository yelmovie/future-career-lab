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

/** 한 마리: 돋보기 3개(보이는 것 고르기) → 처치 카드 탭 → 나온 아이콘을 앵무에게 드롭 */
async function careBird(page: Page, name: string, treatment: RegExp, input: 'drag' | 'tap' | 'keyboard' | 'touch-drag' = 'drag') {
  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 반짝이는 곳`) })).toBeVisible();
  const hotspots = page.locator('.p5-bird .v4-hotspot');
  await expect(hotspots).toHaveCount(3);
  for (const hotspot of await hotspots.all()) {
    const box = await hotspot.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(48);
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(48);
    const marker = await hotspot.evaluate((element) => {
      const style = getComputedStyle(element, '::before');
      return { width: style.width, height: style.height, background: style.backgroundColor };
    });
    expect(marker).toEqual({ width: '48px', height: '48px', background: 'rgba(255, 235, 166, 0.58)' });
  }
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

  await expect(page.getByRole('heading', { name: new RegExp(`${name}: 처치 카드를`) })).toBeVisible();
  // 기록판이 처치 단계에도 그대로 보인다 (관찰이 처치의 근거)
  await expect(page.locator('.p5-board li.is-on')).toHaveCount(3);
  await page.getByRole('button', { name: '깃털 관리' }).click();
  await expect(page.locator('.p5-treatment-token')).toBeVisible();
  const treat = async () => {
    if (input === 'drag') await page.locator('.p5-treatment-token').dragTo(page.locator('.p5-bird'));
    else if (input === 'tap') await page.locator('.p5-bird').tap();
    else if (input === 'keyboard') { await page.locator('.p5-bird').focus(); await page.keyboard.press('Enter'); }
    else await dragWithTouch(page, '.p5-treatment-token', '.p5-bird');
  };
  await treat();
  await expect(page.locator('.p5-bird.is-stable')).toHaveCount(0);
  await page.getByRole('button', { name: treatment }).click();
  await treat();
  await expect(page.locator('.p5-bird.is-stable')).toBeVisible();
}

test('page 5: observe and treat 지구 then 젤리, then hand off to the garden', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);
  await page.goto('/#/page/5');

  await careBird(page, '지구', /은신처/);
  await expect(page.locator('.p5-obs.is-done .p5-closeup')).toHaveCSS('background-image', /recovery-green-shelter\.jpg/);
  await page.getByRole('button', { name: /젤리 살피기/ }).click();
  await careBird(page, '젤리', /물·전해질/);
  await page.getByRole('button', { name: /돌봄 끝내기/ }).click();

  await expect(page.getByText('지구와 젤리 모두 안정됐어')).toBeVisible();
  const save = await readSave(page);
  expect(save.stageProgress.completedPages).toContain(5);
  expect(save.artifacts.careLog).toEqual([
    { bird: 'green', issue: '스트레스', treatment: '은신처·조용한 곳' },
    { bird: 'red', issue: '탈수', treatment: '물·전해질' },
  ]);

  await page.getByRole('button', { name: /새 정원 다시 만들기/ }).click();
  await expect(page.getByRole('heading', { name: '아래 물건을 원하는 곳으로 끌어 놓아 봐' })).toBeVisible();
});

test('page 6: drag each object directly into a zone, test to 3 stars, complete', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);
  await page.goto('/#/page/6');

  const next = page.getByRole('button', { name: /^다음/ });
  await next.click();
  await expect(page.getByText('물건을 4개 더 놓아 봐')).toBeVisible();

  const put = async (chip: string, slot: string) => {
    await page.getByRole('button', { name: chip, exact: true }).dragTo(page.getByRole('button', { name: `${slot} 아이콘 놓는 곳` }));
  };
  // 첫 시도는 일부러 틀리게: 물그릇과 먹이 나무의 자리를 바꾼다.
  await put('물그릇', '먹고 노는 곳');
  await expect(page.getByText(/물그릇은 조용한 곳이 좋지 않을까/)).toBeVisible();
  await put('숨는 집', '조용히 쉬는 곳');
  await put('놀이 줄', '먹고 노는 곳');
  await put('먹이 나무', '조용히 쉬는 곳');
  await expect(page.getByText('물건 4/4')).toBeVisible();
  await next.click();

  await expect(page.getByRole('heading', { name: '앵무새 불러 보기' })).toBeVisible();
  await page.getByRole('button', { name: /시험하기/ }).click();
  await expect(page.locator('.p6-stars span.is-on')).toHaveCount(2);
  await expect(page.getByText('물그릇을 조용히 쉬는 곳으로 옮겨 줘')).toBeVisible();

  await page.getByRole('button', { name: /옮겨서 다시/ }).click();
  await expect(page.getByRole('heading', { name: '아래 물건을 원하는 곳으로 끌어 놓아 봐' })).toBeVisible();
  // 놓인 칩을 탭하면 돌아오고, 올바른 자리로 다시 놓을 수 있다.
  await page.getByRole('button', { name: '물그릇 되돌리기' }).click();
  await page.getByRole('button', { name: '먹이 나무 되돌리기' }).click();
  await put('물그릇', '조용히 쉬는 곳');
  await put('먹이 나무', '먹고 노는 곳');
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

/** Chromium receives real touch input, including pointer capture and hit testing. */
async function dragWithTouch(page: Page, source: string, target: string) {
  const start = (await page.locator(source).boundingBox())!;
  const end = (await page.locator(target).boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
  const to = { x: end.x + end.width / 2, y: end.y + end.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let step = 1; step <= 5; step += 1) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 5, y: from.y + (to.y - from.y) * step / 5 }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

test.describe('tablet care and garden alternatives', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test('care accepts touch dragging and keyboard placement with the same correction rule', async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page);
    await page.goto('/#/page/5');
    await careBird(page, '지구', /은신처/, 'touch-drag');
    await page.getByRole('button', { name: /젤리 살피기/ }).click();
    await careBird(page, '젤리', /물·전해질/, 'keyboard');
    await page.getByRole('button', { name: /돌봄 끝내기/ }).click();
    expect((await readSave(page)).stageProgress.completedPages).toContain(5);
  });

  test('garden accepts tap, touch drag and keyboard, preserves an alternative design on reload', async ({ page }) => {
    await seed(page);
    await page.goto('/#/page/6');
    await page.getByRole('button', { name: '물그릇', exact: true }).tap();
    await page.getByRole('button', { name: '조용히 쉬는 곳 아이콘 놓는 곳' }).tap();
    await dragWithTouch(page, '.v4-pool [data-chip="hideout"]', '.v4-slot[data-slot="shade"]');
    await page.getByRole('button', { name: '먹이 나무', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '조용히 쉬는 곳 아이콘 놓는 곳' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '놀이 줄', exact: true }).tap();
    await page.getByRole('button', { name: '먹고 노는 곳 아이콘 놓는 곳' }).tap();
    await page.getByRole('button', { name: /^다음/ }).tap();
    await page.getByRole('button', { name: /시험하기/ }).tap();
    await expect(page.locator('.p6-stars span.is-on')).toHaveCount(3);
    await expect(page.getByText('조용히 먹고, 넓은 곳에서 놀 수 있어')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: '앵무새 불러 보기' })).toBeVisible();
    await expect(page.locator('.p6-stars span.is-on')).toHaveCount(3);
    await page.getByRole('button', { name: /새 정원 완성/ }).tap();
    const saved = await readSave(page);
    expect(saved.pageData.page06Design).toMatchObject({ placed: { shade: ['water', 'hideout', 'feeder'], perch: ['rope'] }, attempts: 1 });
  });
});

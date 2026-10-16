import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';
function fixture(completed: boolean) {
  return {
    schemaVersion: 3, contentVersion: '2026.09', sessionSeed: 42, playerName: '입체 관찰 탐험가', lastPage: 5,
    stageProgress: { completed: { 1: true, 2: completed, 3: false, 4: false, 5: false }, completedPages: completed ? [3, 4, 5] : [3, 4] },
    badges: [], jobCards: [], traits: { exploration: 3, analysis: 4, creation: 2, care: 3, execution: 2, collaboration: 3 },
    logs: [], dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true },
    pageData: { page05Care: {
      records: completed
        ? { green: { eyes: 'eyes-1', feathers: 'feathers-2', behavior: 'behavior-1' }, red: { eyes: 'eyes-2', water: 'water-1', posture: 'posture-1' } }
        : { green: {}, red: {} },
      treatments: completed ? { green: 'shelter', red: 'water' } : { green: null, red: null }, wrongRecords: 0, wrongTreatments: 0,
    } },
    artifacts: { photos: [], hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: { trust: 0, corrections: 0 }, allianceTurns: null },
    updatedAt: new Date().toISOString(),
  };
}

async function seed(page: Page, completed = false) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value: fixture(completed) });
  await page.goto('/#/page/5');
  await expect(page.getByRole('button', { name: '3D로 살펴보기', exact: true })).toBeVisible();
}
const care = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.page05Care, SAVE_KEY);

test.use({ viewport: { width: 1024, height: 768 } });

test('3D button stays clear of the care board before and after treatment at desktop and tablet sizes', async ({ page }) => {
  await seed(page);
  const checkLayout = async (state: string) => {
    for (const viewport of [{ width: 1725, height: 909 }, { width: 1024, height: 576 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => document.fonts.ready);
      const launch = page.getByRole('button', { name: '3D로 살펴보기', exact: true });
      await launch.click({ trial: true });
      const layout = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const button = box('.p5-model-launch');
        const board = box('.p5-board');
        const bird = box('.p5-bird');
        const stage = box('.p5-stage');
        const tabs = [...document.querySelectorAll('.p5-tab')].map((tab) => tab.getBoundingClientRect());
        const hint = document.querySelector('.p5-treat-hint')?.getBoundingClientRect();
        const cards = [...document.querySelectorAll('.p5-treat-card')].map((card) => card.getBoundingClientRect());
        return {
          boardGap: board.top - button.bottom,
          tabGap: button.left - Math.max(...tabs.map((tab) => tab.right)),
          birdGap: stage.bottom - bird.bottom,
          treatmentGap: hint && cards.length ? hint.top - Math.max(...cards.map((card) => card.bottom)) : null,
          buttonHeight: button.height,
        };
      });
      expect(layout.boardGap).toBeGreaterThanOrEqual(8);
      expect(layout.tabGap).toBeGreaterThanOrEqual(8);
      expect(layout.birdGap).toBeGreaterThanOrEqual(0);
      expect(layout.buttonHeight).toBeGreaterThanOrEqual(47.5);
      if (layout.treatmentGap !== null) expect(layout.treatmentGap).toBeGreaterThanOrEqual(4);
      await page.screenshot({ path: test.info().outputPath(`${state}-${viewport.width}.png`), animations: 'disabled' });
    }
  };
  await checkLayout('observation');
  for (const [zone, statement] of [
    ['눈', '눈은 맑은데 계속 두리번거려'],
    ['깃털', '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어'],
    ['주변 환경', '숨을 곳이 없고 큰 소리가 계속 들려'],
  ]) {
    await page.getByRole('button', { name: `${zone} 살펴보기`, exact: true }).click();
    await page.getByRole('button', { name: statement, exact: true }).click();
  }
  await page.getByRole('button', { name: /^다음/ }).click();
  await checkLayout('treatment');
  await page.getByRole('button', { name: /은신처/ }).click();
  await page.locator('.p5-bird').click();
  await expect(page.locator('.p5-bird.is-stable')).toBeVisible();
  await checkLayout('recovered');
});

test('optional preview waits for a click, preserves observation, and falls back without revealing recovery', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.route('**/assets/meshy/*.glb', (route) => route.fulfill({ status: 404, body: 'unavailable' }));
  await seed(page);
  await page.getByRole('button', { name: '눈 살펴보기', exact: true }).click();
  await page.getByRole('button', { name: '눈은 맑은데 계속 두리번거려', exact: true }).click();
  const before = await care(page);
  expect(requests.filter((url) => /\.glb(?:\?|$)|model[_-]viewer|\/three[./]/i.test(url))).toEqual([]);
  await page.getByRole('button', { name: '3D로 살펴보기', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('입체 모형을 열지 못했어. 그림으로 계속 살펴볼 수 있어.')).toBeVisible();
  await expect(page.getByRole('group', { name: '돌봄 전후 비교' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '앵자', exact: true })).toHaveCount(0);
  expect(await care(page)).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '3D로 살펴보기', exact: true })).toBeFocused();
  await expect(page.getByText('눈: 기록했어', { exact: true })).toBeVisible();
});

test('completed care keeps 3D available: actual models, direction buttons, and before/after comparison', async ({ page }) => {
  test.setTimeout(90_000);
  const external: string[] = [];
  const models: string[] = [];
  page.on('request', (request) => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  page.on('request', (request) => { if (/\/assets\/meshy\/[^/]+\.glb$/.test(request.url())) models.push(new URL(request.url()).pathname); });
  await seed(page, true);
  const before = await care(page);
  await page.getByRole('button', { name: '3D로 살펴보기', exact: true }).click();
  const front = page.getByRole('button', { name: '앞모습', exact: true });
  await expect(front).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('model-viewer')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('jelly-healthy.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '오른쪽', exact: true }).click();
  await expect.poll(() => page.locator('model-viewer').evaluate((element) => (element as HTMLElement & { getCameraOrbit: () => { theta: number } }).getCameraOrbit().theta)).toBeCloseTo(Math.PI / 2, 2);
  await page.getByRole('button', { name: '처음으로', exact: true }).click();
  await expect.poll(() => page.locator('model-viewer').evaluate((element) => (element as HTMLElement & { getCameraOrbit: () => { theta: number } }).getCameraOrbit().theta)).toBeCloseTo(20 * Math.PI / 180, 2);
  await page.getByRole('button', { name: '돌봄 전', exact: true }).click();
  await expect(front).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('model-viewer')).toHaveJSProperty('alt', '앵자의 돌봄 전 모습을 표현한 입체 모형');
  await page.screenshot({ path: test.info().outputPath('jelly-sick.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '꾸꾸', exact: true }).click();
  await expect(front).toBeEnabled({ timeout: 45000 });
  await expect(page.getByRole('button', { name: '회복한 모습', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('model-viewer')).toHaveJSProperty('alt', '꾸꾸의 회복한 모습을 표현한 입체 모형');
  await page.screenshot({ path: test.info().outputPath('jigu-healthy.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '돌봄 전', exact: true }).click();
  await expect(front).toBeEnabled({ timeout: 45000 });
  await expect(page.locator('model-viewer')).toHaveJSProperty('alt', '꾸꾸의 돌봄 전 모습을 표현한 입체 모형');
  await page.screenshot({ path: test.info().outputPath('jigu-sick.png'), animations: 'disabled' });
  expect(new Set(models)).toEqual(new Set(['/assets/meshy/jigu-sick.glb', '/assets/meshy/jigu-healthy.glb', '/assets/meshy/jelly-sick.glb', '/assets/meshy/jelly-healthy.glb']));
  await page.getByRole('button', { name: '회복한 모습', exact: true }).click();
  await page.getByRole('button', { name: '두 친구 함께 보기', exact: true }).click();
  await expect(page.getByRole('img', { name: '꾸꾸와 앵자의 회복한 모습을 함께 놓고 비교하는 그림', exact: true })).toBeVisible();
  await page.locator('.parrot-preview__canvas img').evaluate((element) => (element as HTMLImageElement).decode());
  await page.screenshot({ path: test.info().outputPath('healthy-pair.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '돌봄 전', exact: true }).click();
  await expect(page.getByRole('img', { name: '꾸꾸와 앵자의 돌봄 전 모습을 함께 놓고 비교하는 그림', exact: true })).toBeVisible();
  await page.locator('.parrot-preview__canvas img').evaluate((element) => (element as HTMLImageElement).decode());
  await page.screenshot({ path: test.info().outputPath('sick-pair.png'), animations: 'disabled' });
  const buttons = await page.getByRole('dialog').locator('button').evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  expect(buttons.every((box) => box.width >= 47.5 && box.height >= 47.5)).toBe(true);
  expect(external).toEqual([]);
  expect(await care(page)).toEqual(before);
  await page.getByRole('button', { name: '관찰로 돌아가기', exact: true }).click();
  await expect(page.getByText('꾸꾸와 앵자 모두 안정됐어')).toBeVisible();
});

import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'future-career-lab.save.v1';
const COMPLETED_PAGES = [3, 4, 5, 6, 7, 8, 9];

function makeSave(completed = false) {
  return {
    schemaVersion: 2,
    contentVersion: '2026.09',
    sessionSeed: 42,
    playerName: '테스트 탐험가',
    lastPage: completed ? 10 : 1,
    stageProgress: {
      completed: completed
        ? { 1: true, 2: true, 3: true, 4: true, 5: true }
        : { 1: false, 2: false, 3: false, 4: false, 5: false },
      completedPages: completed ? COMPLETED_PAGES : [],
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
      photos: [
        { id: 'logging', quality: 'center' },
        { id: 'stream', quality: 'center' },
        { id: 'construction', quality: 'center' },
      ],
      hypothesis: 'logging',
      careLog: [],
      habitatStars: 3,
      traces: [],
      graphs: [],
      clip: { trust: 90, corrections: 0 },
      allianceTurns: 6,
    },
    prediction: 'drone',
    abilityStatements: [],
    updatedAt: new Date().toISOString(),
  };
}

async function seedSave(page: Page, save: ReturnType<typeof makeSave>) {
  await page.goto('/#/page/1');
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, save]);
  await page.reload();
}

async function seed(page: Page, completed = false) {
  await seedSave(page, makeSave(completed));
}

test('every visible control keeps a 48px touch target on a 1024px tablet', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  const violations: string[] = [];

  const auditVisible = async (screen: string) => {
    const controls = page.locator('button, a[href]:not(.skip-link), input, select, textarea, [role="button"], [tabindex="0"]');
    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      if (!box || (box.width >= 47.5 && box.height >= 47.5)) continue;
      const label = (await control.getAttribute('aria-label')) || (await control.innerText().catch(() => '')) || (await control.getAttribute('placeholder')) || control.toString();
      violations.push(`${screen} ${Math.round(box.width)}x${Math.round(box.height)} ${label.trim().slice(0, 48)}`);
    }
  };

  for (let pageNumber = 1; pageNumber <= 11; pageNumber += 1) {
    await seed(page, pageNumber >= 10);
    await page.goto(`/#/page/${pageNumber}`);
    await page.waitForTimeout(300);
    await auditVisible(`p${pageNumber}`);
  }

  await seed(page);
  await page.goto('/#/page/3');
  await page.waitForTimeout(800);
  const map = page.locator('.phaser-stage canvas');
  const mapBox = (await map.boundingBox())!;
  await map.click({ position: { x: mapBox.width * .3, y: mapBox.height * .28 } });
  await map.click({ position: { x: mapBox.width * .6, y: mapBox.height * .72 } });
  await page.getByRole('button', { name: /출발!/ }).click();
  await auditVisible('p3-flight');

  const tabletSave = makeSave();
  tabletSave.pageData = { page07Ecology: { step: 'tablet', point: 'A', found: [], envSeen: [], chartPick: null, exp: { baseline: { logging: 5, noise: 5, water: 5 }, levels: { logging: 5, noise: 5, water: 5 }, active: null }, trials: [], prediction: null, lastTrial: null, main: null, sub: null } };
  await seedSave(page, tabletSave);
  await page.goto('/#/page/7');
  await auditVisible('p7-tablet');

  const labSave = makeSave();
  labSave.pageData = { page07Ecology: { step: 'experiment', point: 'A', found: [], envSeen: [], chartPick: { point: 'A', variable: 'logging' }, exp: { baseline: { logging: 5, noise: 5, water: 5 }, levels: { logging: 8, noise: 5, water: 5 }, active: 'logging' }, trials: [], prediction: null, lastTrial: null, main: null, sub: null } };
  await seedSave(page, labSave);
  await page.goto('/#/page/7');
  await auditVisible('p7-lab');

  await seed(page);
  await page.goto('/#/page/9');
  await auditVisible('p9-active');

  await seed(page, true);
  await page.goto('/#/page/10');
  await auditVisible('p10-compare');

  expect(violations, violations.join('\n')).toEqual([]);
});

test('small or portrait screens show a clear device guide instead of tiny controls', async ({ page }) => {
  await page.setViewportSize({ width: 915, height: 412 });
  await page.goto('/#/page/1');
  await expect(page.getByText('더 큰 가로 화면에서 열어 줘')).toBeVisible();
  await expect(page.getByText('권장 화면: 가로 1024px 이상')).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByText('태블릿을 가로로 돌리거나 PC에서 열어 줘')).toBeVisible();
});

test.skip('mission order is reinforced with loaded visual assets — superseded by v4 specs', () => {});

test.skip('completed alliance revisit immediately offers the next reflection screen — superseded by v4 specs', () => {});

test.skip('reflection guides plan, two ability statements, then the certificate — superseded by v4 specs', () => {});

test.skip('every mission screen keeps one visible current-action cue — superseded by v4 specs', () => {});

test.skip('completed missions hand off from the drone through reflection without a dead end — superseded by v4 specs', () => {});

import { expect, test, type Page } from '@playwright/test';
import { buildCaptionCards, createBroadcast, type SourceId } from '../src/pages/page08BroadcastModel';

const SAVE_KEY = 'future-career-lab.save.v1';
const artifacts = { photos: [{ id: 'logging' as const, quality: 'center' as const }, { id: 'stream' as const, quality: 'center' as const }, { id: 'construction' as const, quality: 'center' as const }], hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null };
const captions = buildCaptionCards(artifacts);

async function seed(page: Page, route = 8, pageData: Record<string, unknown> = {}) {
  const save = {
    schemaVersion: 3, contentVersion: '2026.09', sessionSeed: 42, playerName: '화면 점검', lastPage: route,
    stageProgress: { completed: { 1: false, 2: false, 3: false, 4: false, 5: false }, completedPages: [] },
    badges: [], jobCards: [], traits: { exploration: 0, analysis: 0, creation: 0, care: 0, execution: 0, collaboration: 0 },
    logs: [], pageData, dailyMissionId: 'daily-1', certificateUnlocked: false, rewardGranted: [],
    audio: { bgmVolume: 0, sfxVolume: 0, muted: true }, artifacts, updatedAt: new Date().toISOString(),
  };
  await page.goto('/#/page/1');
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE_KEY, value: save });
  await page.reload();
  await page.goto(`/#/page/${route}`);
  await expect(page.locator(`.game-shell.page-${route}`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test.use({ reducedMotion: 'reduce' });

test('skip links focus each mission without changing its hash route', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const route of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]) {
    await page.goto(`/#/page/${route}`);
    const skip = page.getByRole('link', { name: '본문으로 건너뛰기' });
    await skip.focus();
    const address = page.url();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    expect(page.url()).toBe(address);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('main')?.contains(document.activeElement))).toBe(true);
  }
});

test('modal inputs retain focus across state updates, trap Tab and restore the opener', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await seed(page, 2);
  const opener = page.getByRole('button', { name: '설정 열기' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '설정', exact: true });
  const volume = dialog.locator('.settings-slider input').first();
  await volume.focus();
  await page.keyboard.press('Home');
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('ArrowRight');
    await expect(volume).toBeFocused();
  }
  await expect(volume).toHaveValue('15');
  const close = dialog.getByRole('button', { name: '닫기', exact: true });
  await close.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('tab', { name: '소리', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('small and portrait screens show a full-size guide and hide keyboard controls until rotation', async ({ page }) => {
  for (const viewport of [{ width: 915, height: 412 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/#/page/3');
    await expect(page.locator('.device-notice')).toBeVisible();
    await expect(page.locator('.game-shell')).toBeHidden();
    const notice = (await page.locator('.device-notice').boundingBox())!;
    expect(notice.width).toBeCloseTo(viewport.width, 0);
    expect(notice.height).toBeCloseTo(viewport.height, 0);
    for (let index = 0; index < 4; index += 1) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.game-shell')))).toBe(false);
    await page.screenshot({ path: `artifacts/ui-accessibility-guide-${viewport.width}.png` });
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('.device-notice')).toBeHidden();
  await expect(page.locator('.phaser-stage canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Number(document.documentElement.style.getPropertyValue('--stage-scale')))).toBeCloseTo(.8, 4);
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 1920, height: 1080 }, { width: 1024, height: 768 }]) {
  test(`broadcast titles, descriptions and controls stay readable at ${viewport.width}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    for (const [index, source] of [[0, 'studio'], [1, 'drone'], [2, 'studio'], [3, 'reporter']] as const) {
      const state = { ...createBroadcast(42), index, draft: { source: source as SourceId, captionId: null, level: 55 } };
      await seed(page, 8, { p8Broadcast: state });
      const choices = page.getByRole('group', { name: '자막 고르기' }).getByRole('button');
      await expect(choices).toHaveCount(3);
      const statement = (await choices.first().getAttribute('aria-label'))!;
      const selected = captions.find((caption) => caption.text === statement)!;
      expect(selected).toBeTruthy();
      await choices.first().focus();
      await page.keyboard.press('Enter');
      await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.p8-screen__caption')).toHaveText(selected.announce ?? selected.text);
      const issues = await page.evaluate(() => {
        const errors: string[] = [];
        const stage = document.querySelector<HTMLElement>('.stage')!;
        const scale = stage.getBoundingClientRect().width / stage.clientWidth;
        const outside = (a: DOMRect, b: DOMRect) => a.left < b.left - 2 || a.right > b.right + 2 || a.top < b.top - 2 || a.bottom > b.bottom + 2;
        for (const button of document.querySelectorAll<HTMLElement>('button,input,select,a[href]:not(.skip-link)')) {
          if (!button.checkVisibility({ checkVisibilityCSS: true })) continue;
          const rect = button.getBoundingClientRect();
          if (rect.width < 47.5 || rect.height < 47.5) errors.push(`small control: ${button.textContent}`);
        }
        for (const card of document.querySelectorAll('.p8-captions .v4-choice-card')) {
          const frame = card.getBoundingClientRect();
          const title = card.querySelector('strong')!;
          if (card.querySelector('button .v4-choice__description')) errors.push('long statement inside button');
          if (card.querySelector('button')!.getAttribute('aria-describedby') !== card.querySelector('.v4-choice__description')!.id) errors.push('unlinked statement');
          if (title.getBoundingClientRect().height > parseFloat(getComputedStyle(title).lineHeight) * scale * 2.1) errors.push('title exceeds two lines');
          for (const copy of card.querySelectorAll('strong,.v4-choice__description,small')) {
            if (parseFloat(getComputedStyle(copy).fontSize) * scale < 15.9) errors.push('small copy');
            const range = document.createRange(); range.selectNodeContents(copy);
            for (const glyph of range.getClientRects()) if (outside(glyph, frame)) errors.push(`clipped caption: ${copy.textContent}`);
          }
          if (card.querySelector('.v4-choice__art')!.getBoundingClientRect().height < 32) errors.push('caption image collapsed');
        }
        const topbar = document.querySelector('.topbar')!.getBoundingClientRect();
        for (const child of document.querySelectorAll('.topbar button,.title-lockup')) if (outside(child.getBoundingClientRect(), topbar)) errors.push('header overflow');
        const controls = document.querySelector('.p8-controls')!.getBoundingClientRect();
        for (const card of document.querySelectorAll('.p8-captions .v4-choice-card,.p8-source-review')) if (outside(card.getBoundingClientRect(), controls)) errors.push('caption area overflow');
        return errors;
      });
      await page.screenshot({ path: `artifacts/ui-accessibility-broadcast-${viewport.width}-${index}.png` });
      expect(issues).toEqual([]);
      await page.getByRole('button', { name: '방송으로 내보내기', exact: true }).click();
      await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').pageData.p8Broadcast.log.at(-1).captionId, SAVE_KEY)).toBe(selected.id);
    }
  });
}

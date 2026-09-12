import { expect, test } from '@playwright/test';
import { createDefaultSave } from '../src/state/defaultSave';
const KEY = 'future-career-lab.save.v1';

for (const width of [1024, 1280, 1920]) test(`optional school garden: reconsider, hold/tap and resume at ${width}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: width === 1920 ? 1080 : 800 });
  const save = createDefaultSave();
  save.stageProgress.completedPages = [3, 4, 5, 6, 7, 8, 9];
  save.audio = { muted: true, bgmVolume: 0, sfxVolume: 0 };
  await page.goto('/');
  await expect(page.getByRole('button', { name: '시작하기', exact: true })).toBeVisible();
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: KEY, data: save });
  await page.reload(); await page.goto('/#/page/9');
  await expect(page.getByRole('button', { name: '수료증 확인하기' })).toBeEnabled();
  await page.getByRole('button', { name: '학교 화단도 도와볼까?' }).click();
  await page.getByRole('button', { name: '나무 더 심기', exact: true }).click();
  await expect(page.locator('.school-garden__cue')).toContainText('나무는 이미');
  await page.getByRole('button', { name: '깨끗한 물 주기', exact: true }).click();
  const pour = page.getByRole('button', { name: '꾹 눌러 물 주기', exact: true });
  const rect = (await pour.boundingBox())!;
  expect(rect.height).toBeGreaterThanOrEqual(48); expect(rect.width).toBeGreaterThanOrEqual(48);
  await pour.focus(); await page.keyboard.down('Space'); await page.waitForTimeout(450); await page.keyboard.up('Space');
  const partial = Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'));
  expect(partial).toBeGreaterThan(0); expect(partial).toBeLessThan(100);
  await page.reload(); await page.getByRole('button', { name: '학교 화단도 도와볼까?' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(partial));
  // Short clicks are an alternative to holding; neither can award twice.
  for (let n = 0; n < 4 && await pour.count(); n++) await pour.click();
  await expect(page.locator('.school-garden__success')).toContainText('다시 살펴보고');
  await expect(page.locator('.school-garden__picture img')).toHaveAttribute('src', /school-garden-after.webp/);
  const geometry = await page.locator('.school-garden').evaluate(el => {
    const r = el.getBoundingClientRect();
    return [...el.querySelectorAll('button, .school-garden__success, .school-garden__cue')].every(node => { const b = node.getBoundingClientRect(); return b.left >= r.left && b.top >= r.top && b.right <= r.right + 1 && b.bottom <= r.bottom + 1; });
  });
  expect(geometry).toBe(true);
  await page.screenshot({ path: `artifacts/school-garden-${width}.png` });
  await page.reload(); await page.getByRole('button', { name: '학교 화단도 도와볼까?' }).click();
  const logs = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').logs.filter((log: { type: string }) => log.type === 'school-garden-help'), KEY);
  expect(logs).toHaveLength(1);
  await page.getByRole('button', { name: '수료증 확인하기' }).click();
  await expect(page.locator('.page-11')).toBeVisible();
});

test('all photo observations and hypothesis can be completed by keyboard', async ({ page }) => {
  const save = createDefaultSave(); save.stageProgress.completedPages = [3]; save.audio.muted = true;
  await page.goto('/');
  await expect(page.locator('.game-shell')).toBeVisible();
  await page.evaluate(({key, data}) => localStorage.setItem(key, JSON.stringify(data)), {key: KEY, data: save});
  await page.reload(); await page.goto('/#/page/4');
  for (let n = 0; n < 3; n++) {
    await page.locator('.p4-photo').nth(n).focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.zoom-observation')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', {name:'찾았어! 닫기'})).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await page.getByRole('button', {name:'다음', exact:true}).focus(); await page.keyboard.press('Enter');
  await page.locator('.p4-guess .v4-choice').first().focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', {name:'이 가설로 정하기'}).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', {name:'배지 받기'}).focus(); await page.keyboard.press('Enter');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), KEY);
  expect(saved.stageProgress.completedPages).toContain(4); expect(saved.pageData.p4Details).toHaveLength(3);
});

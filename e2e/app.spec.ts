import { expect, test } from '@playwright/test';
import { stat } from 'node:fs/promises';

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
  const homeLayout = await page.evaluate(() => {
    const stage = document.querySelector('.stage')!.getBoundingClientRect();
    const logoFrame = document.querySelector('.home-logo-frame')!.getBoundingClientRect();
    const actions = document.querySelector('.home-actions')!.getBoundingClientRect();
    return {
      logoInside: logoFrame.top >= stage.top && logoFrame.left >= stage.left && logoFrame.right <= stage.right,
      actionsInside: actions.bottom <= stage.bottom && actions.left >= stage.left && actions.right <= stage.right,
    };
  });
  expect(homeLayout).toEqual({ logoInside: true, actionsInside: true });
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

test('drone controls stay separate from the map and each other at delivery sizes', async ({ page }) => {
  for (const viewport of [{ width: 1024, height: 576 }, { width: 1280, height: 720 }, { width: 1600, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/#/page/3');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);

    for (const control of [page.getByRole('button', { name: '메인으로 이동' }), page.getByRole('button', { name: '도움말' })]) {
      const box = await control.boundingBox();
      expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(48);
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(48);
    }

    const map = page.locator('.phaser-stage canvas');
    const box = (await map.boundingBox())!;
    await map.click({ position: { x: box.width * .36, y: box.height * .4 } });
    await map.click({ position: { x: box.width * .61, y: box.height * .66 } });
    await page.getByRole('button', { name: /출발!/ }).click();

    await expect(page.locator('.direction-pad button')).toHaveCount(0);
    const record = page.getByRole('button', { name: /REC/ });
    const recordBox = await record.boundingBox();
    expect(Math.round(recordBox?.width ?? 0)).toBeGreaterThanOrEqual(48);
    expect(Math.round(recordBox?.height ?? 0)).toBeGreaterThanOrEqual(48);

    const flightLayout = await page.locator('.game-shell.page-3').evaluate((root) => {
      const canvas = root.querySelector('.phaser-stage');
      const controls = root.querySelector('.drone-v4__flight-controls');
      const record = root.querySelector('.drone-v4__rec');
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter((button) => {
        const style = getComputedStyle(button);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      const overlaps = (a: DOMRect, b: DOMRect) =>
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const buttonOverlaps: string[] = [];
      buttons.forEach((button, index) => {
        buttons.slice(index + 1).forEach((other) => {
          if (overlaps(button.getBoundingClientRect(), other.getBoundingClientRect())) {
            buttonOverlaps.push(`${button.getAttribute('aria-label') ?? button.textContent}/${other.getAttribute('aria-label') ?? other.textContent}`);
          }
        });
      });
      const canvasRect = canvas?.getBoundingClientRect();
      const controlsRect = controls?.getBoundingClientRect();
      const recordRect = record?.getBoundingClientRect();
      return {
        buttonOverlaps,
        mapSeparatedFromControls: Boolean(canvasRect && controlsRect && canvasRect.bottom <= controlsRect.top + 1),
        recCentered: Boolean(controlsRect && recordRect && Math.abs((recordRect.left + recordRect.right) / 2 - (controlsRect.left + controlsRect.right) / 2) <= 2),
      };
    });
    expect(flightLayout).toEqual({ buttonOverlaps: [], mapSeparatedFromControls: true, recCentered: true });
  }
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
  await expect(page.getByRole('heading', { name: '정답지·판정 기준' })).toHaveCount(0);
  await expect(page.getByText('수업 자료 준비', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '운영 준비' })).toHaveCount(0);
  await expect(page.locator('.settings-standard')).toHaveCount(4);
  await expect(page.locator('.settings-standard').first()).toBeVisible();
  await expect(page.locator('.settings table')).toHaveCount(0);
  await expect(page.getByText(/2022 개정 교육과정과의 연계안/)).toHaveCount(0);
  await page.getByRole('tab', { name: '학생용 가이드', exact: true }).click();
  await expect(page.getByText('왜 네 직업이나 해?', { exact: true })).toHaveCount(0);
  await expect(page.getByText('무슨 게임이야?', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '닫기' }).click();
  await page.getByRole('button', { name: '시작하기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '탐험단 브리핑' })).toBeVisible();

  const nextHeadings = [
    '드론 정찰 비행',
    '현장 증거판',
    '구조된 지구와 젤리 살피기',
    '새 정원 다시 만들기',
    '숲 생태 조사',
    '생방송 컨트롤룸',
    '함께 살리는 숲',
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

test('unlocked certificate saves as PNG and has a clean print view', async ({ page }) => {
  await page.goto('/#/page/1');
  await expect(page.locator('.game-shell')).toBeVisible();
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
      abilityStatements: ['조건을 하나씩 바꿔서 원인을 찾을 수 있다'],
    }));
  }, SAVE_KEY);
  await page.reload();
  await page.goto('/#/page/11');
  await expect(page.getByLabel('미래 직업실 탐험 수료증')).toBeVisible();
  await expect(page.getByText('테스트 탐험가', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/나는 이제 조건을 하나씩/)).toHaveCount(0);
  await expect(page.locator('.certificate-abilities')).toHaveCount(0);
  await expect(page.getByText('다섯 스테이지 탐험 완료!')).toHaveCount(0);
  await expect(page.getByText(/담임교사/)).toHaveCount(0);
  const certificateLines = [
    '위 학생은 「미래 직업실」에서',
    '드론 현장가·동물돌봄 전문가·생태연구가·방송기술자의',
    '일을 직접 해 보고, 네 직업의 힘을 모아',
    '푸른솔 숲의 새들을 지켰기에 이 증서를 수여합니다.',
  ];
  await expect(page.locator('.certificate-copy > span')).toHaveText(certificateLines);
  await expect(page.locator('.certificate-copy')).not.toContainText('지구와 젤리를 찾고');
  await page.evaluate(() => {
    const drawText = CanvasRenderingContext2D.prototype.fillText;
    (window as unknown as { certificateDrawnText: string[] }).certificateDrawnText = [];
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      (window as unknown as { certificateDrawnText: string[] }).certificateDrawnText.push(text);
      if (maxWidth === undefined) drawText.call(this, text, x, y);
      else drawText.call(this, text, x, y, maxWidth);
    };
  });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '수료증 이미지로 저장하기' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('미래-직업실-수료증.png');
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (downloadPath) expect((await stat(downloadPath)).size).toBeGreaterThan(10_000);
  const drawnText = await page.evaluate(() => (window as unknown as { certificateDrawnText: string[] }).certificateDrawnText);
  expect(drawnText).toEqual(expect.arrayContaining(certificateLines));
  expect(drawnText.join(' ')).not.toContain('지구와 젤리를 찾고');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.certificate-sheet')).toBeVisible();
  await expect(page.locator('.certificate-copy > span')).toHaveText(certificateLines);
});

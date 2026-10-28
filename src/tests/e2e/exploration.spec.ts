import { expect, test } from '@playwright/test';

test.describe('explorer', () => {
  test('switches cell type and selects an organelle from the accessible list', async ({ page }) => {
    await page.goto('/#/explore');
    await expect(page.getByRole('heading', { name: '세포를 열어 보세요' })).toBeVisible();
    await expect(page.getByTestId('cell-scene')).toBeVisible();

    await page.getByTestId('cell-toggle-plant').click();
    await expect(page.getByTestId('cell-toggle-plant')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('organelle-item-cell-wall')).toBeVisible();

    await page.getByTestId('organelle-item-chloroplast').click();
    await expect(page.getByTestId('info-card-name')).toHaveText('엽록체');
    await expect(page.locator('#viewport-summary')).toContainText('엽록체');
    await expect(page.locator('#viewport-summary')).toContainText('식물세포');
  });

  test('supports keyboard selection through the organelle buttons', async ({ page }) => {
    await page.goto('/#/explore');
    const nucleus = page.getByTestId('organelle-item-nucleus');
    await nucleus.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('info-card-name')).toHaveText('핵');
    await expect(nucleus).toHaveAttribute('aria-pressed', 'true');
  });

  test('moves the clipping plane and toggles labels and microscope views', async ({ page }) => {
    await page.goto('/#/explore');
    const slider = page.getByTestId('clipping-slider');
    await slider.fill('70');
    await expect(page.locator('#clipping-output')).toHaveText('70%');
    await expect(page.locator('#viewport-summary')).toContainText('절단 70%');

    const labels = page.getByTestId('labels-toggle');
    await labels.click();
    await expect(labels).toHaveAttribute('aria-pressed', 'false');

    const microscope = page.getByTestId('microscope-toggle');
    await microscope.click();
    await expect(page.getByTestId('microscope-inset')).toBeVisible();
    await expect(page.locator('.microscope-warning')).toContainText('실제 현미경 사진이 아닙니다');
    await microscope.click();
    await expect(page.getByTestId('microscope-inset')).toBeHidden();
  });

  test('shows the concept model warning and mission strip', async ({ page }) => {
    await page.goto('/#/explore');
    await expect(page.locator('.view-head')).toContainText('개념 모형 · 축척 아님');
    await expect(page.locator('.mission-strip')).toContainText('소기관을 찾아라');
    await expect(page.locator('.mission-strip')).toContainText('물은 어디로 갈까?');
  });

  test('uses the skip link without leaving the current route', async ({ page }) => {
    await page.goto('/#/explore');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
    await expect(page).toHaveURL(/#\/explore$/);
  });
});

test.describe('comfort and storage migration', () => {
  test('keeps auto-rotation off by default', async ({ page }) => {
    await page.goto('/#/explore');
    await expect(page.locator('[data-action="toggle-rotate"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('migrates v1 progress while turning auto-rotation off', async ({ page }) => {
    await page.goto('/#/explore');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'cellscope.progress.v1',
        JSON.stringify({
          completed: ['organelle-hunt'],
          answers: { 'organelle-hunt': '단백질을 만든다' },
          lastCellType: 'plant',
          view: { showLabels: true, showMicroscopeInset: false, autoRotate: true },
          reducedMotion: false,
        }),
      );
    });
    await page.reload();
    await expect(page.getByTestId('header-progress')).toContainText('미션 1 / 6');
    await expect(page.locator('[data-action="toggle-rotate"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('cell-scene')).toBeVisible();
    const saved = await page.evaluate(() => localStorage.getItem('cellscope.progress.v2'));
    expect(saved).toContain('"completed":["organelle-hunt"]');
    expect(saved).toContain('"autoRotate":false');
  });
});

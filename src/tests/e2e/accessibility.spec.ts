import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function scan(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(path);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test.describe('accessibility', () => {
  test('explorer has no critical or serious axe violations', async ({ page }) => {
    await scan(page, '/#/explore');
  });

  test('mission list has no critical or serious axe violations', async ({ page }) => {
    await scan(page, '/#/missions');
  });

  test('mission detail has no critical or serious axe violations', async ({ page }) => {
    await scan(page, '/#/missions/organelle-hunt');
  });

  test('teacher mode has no critical or serious axe violations', async ({ page }) => {
    await scan(page, '/#/teacher');
  });

  test('respects the system reduced motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/explore');
    await page.locator('[data-action="help"]').click();
    await expect(page.locator('#help-reduced-motion')).toBeChecked();
    await expect(page.locator('[data-action="toggle-rotate"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('persists the reduced motion override from the help dialog', async ({ page }) => {
    await page.goto('/#/explore');
    await page.locator('[data-action="help"]').click();
    const toggle = page.locator('#help-reduced-motion');
    await toggle.check();
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
    const saved = await page.evaluate(() => localStorage.getItem('cellscope.progress.v1'));
    expect(saved).toContain('"reducedMotion":true');
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
  });
});

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const OUTPUT = join(process.cwd(), 'test-results', 'screenshots');
mkdirSync(OUTPUT, { recursive: true });

async function shot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.screenshot({ path: join(OUTPUT, name), fullPage, animations: 'disabled' });
}

test.describe('visual states and viewports', () => {
  test.setTimeout(120_000);

  test('explorer animal and plant cells at three viewports', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900, label: '1440' },
      { width: 1024, height: 768, label: '1024' },
      { width: 390, height: 844, label: '390' },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/?viewport=${viewport.label}#/explore`);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByText('개념 모형 · 축척 아님').first()).toBeVisible();
      await expect(page.getByTestId('cell-scene')).toBeVisible();
      await page.waitForTimeout(400);
      await shot(page, `explore-animal-${viewport.label}.png`, true);

      if (viewport.width <= 1100) {
        await page.locator('.panel-left > summary').click();
        await expect(page.getByTestId('cell-toggle-plant')).toBeVisible();
      }
      await page.getByTestId('cell-toggle-plant').click();
      await page.getByTestId('clipping-slider').fill('55');
      await expect(page.locator('.viewport-summary')).toContainText('식물세포');
      await page.waitForTimeout(400);
      await shot(page, `explore-plant-cutaway-${viewport.label}.png`, true);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });

  test('osmosis lab in three concentration states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/osmosis');
    await expect(page.getByTestId('osmosis-state')).toHaveText('안정');
    await shot(page, 'osmosis-isotonic.png', true);

    await page.getByTestId('preset-600').click();
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('쭈그러짐', { timeout: 20_000 });
    await shot(page, 'osmosis-animal-crenated.png', true);

    await page.getByTestId('osmosis-cell-plant').click();
    await page.getByTestId('preset-150').click();
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('팽만', { timeout: 20_000 });
    await shot(page, 'osmosis-plant-turgid.png', true);

    await page.getByTestId('preset-600').click();
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('원형질 분리', { timeout: 20_000 });
    await shot(page, 'osmosis-plant-plasmolyzed.png', true);
  });

  test('mitosis stages for screenshot review', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/mitosis');
    await expect(page.getByText('간단화 모형 · 4염색체').first()).toBeVisible();
    for (let stage = 0; stage < 6; stage += 1) {
      await page.getByTestId(`stage-btn-${stage}`).click();
      await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(350);
      await page.locator('.lab-viewport').screenshot({
        path: join(OUTPUT, `mitosis-stage-${stage + 1}.png`),
        animations: 'disabled',
      });
    }
  });
});

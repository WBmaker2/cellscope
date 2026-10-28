import { expect, test } from '@playwright/test';

test.describe('osmosis lab', () => {
  test('stays stable in an isotonic solution', async ({ page }) => {
    await page.goto('/#/osmosis');
    await page.getByTestId('preset-300').click();
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('안정');
    await expect(page.getByTestId('osmosis-volume')).toHaveText('1.00×');
    await expect(page.getByTestId('osmosis-internal')).toContainText('300');
  });

  test('crenates an animal cell in a hypertonic solution', async ({ page }) => {
    await page.goto('/#/osmosis');
    await page.getByTestId('preset-600').click();
    await expect(page.locator('#osmosis-external-tag')).toContainText('600 mOsm/L');
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('쭈그러짐', { timeout: 20_000 });
    await expect(page.getByTestId('osmosis-volume')).toHaveText('0.65×');
    await expect(page.locator('[data-element="state-detail"]')).toContainText('물을 잃어');
  });

  test('lyses an animal cell in a strongly hypotonic solution', async ({ page }) => {
    await page.goto('/#/osmosis');
    await page.getByTestId('osmosis-concentration').fill('0');
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('세포막 파열', { timeout: 20_000 });
    await expect(page.getByTestId('osmosis-volume')).toHaveText('1.45×');
  });

  test('makes a plant cell turgid without lysing', async ({ page }) => {
    await page.goto('/#/osmosis');
    await page.getByTestId('osmosis-cell-plant').click();
    await page.getByTestId('preset-150').click();
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('팽만', { timeout: 20_000 });
    await expect(page.getByTestId('osmosis-volume')).toHaveText('1.12×');
    await expect(page.locator('[data-element="turgor-value"]')).toHaveText('100%');
    await expect(page.getByTestId('osmosis-state')).not.toHaveText('세포막 파열');
  });

  test('plasmolyzes a plant cell in a strongly hypertonic solution', async ({ page }) => {
    await page.goto('/#/osmosis');
    await page.getByTestId('osmosis-cell-plant').click();
    await page.getByTestId('preset-600').click();
    await page.getByTestId('osmosis-play').click();
    await expect(page.getByTestId('osmosis-state')).toHaveText('원형질 분리', { timeout: 20_000 });
    await expect(page.getByTestId('osmosis-volume')).toHaveText('0.72×');
    await expect(page.locator('[data-element="turgor-value"]')).toHaveText('0%');
  });
});

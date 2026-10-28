import { expect, test } from '@playwright/test';

test.describe('mitosis lab', () => {
  test('moves through the six stages and updates counts', async ({ page }) => {
    await page.goto('/#/mitosis');
    await expect(page.getByTestId('stage-title')).toHaveText('간기');
    await expect(page.getByTestId('stage-btn-3')).toBeVisible();

    await page.getByTestId('stage-btn-3').click();
    await expect(page.getByTestId('stage-title')).toHaveText('후기');
    await expect(page.getByTestId('stage-chip')).toHaveText('4. 후기');
    await expect(page.locator('[data-element="chromosome-count"]')).toContainText('8개가 양극으로 이동');

    await page.getByTestId('stage-btn-5').click();
    await expect(page.getByTestId('stage-title')).toHaveText('세포질 분열');
    await expect(page.locator('[data-element="cell-count"]')).toHaveText('2개');
    await expect(page.locator('[data-element="chromosome-count"]')).toContainText('딸세포 2개');
    await expect(page.locator('[data-element="envelope-state"]')).toHaveText('유지');
  });

  test('orders the six stage cards correctly', async ({ page }) => {
    await page.goto('/#/mitosis');
    for (const id of ['interphase', 'prophase', 'metaphase', 'anaphase', 'telophase', 'cytokinesis']) {
      await page.locator(`[data-order="${id}"]`).click();
    }
    await page.locator('[data-action="quiz-check"]').click();
    await expect(page.locator('[data-element="quiz-message"]')).toContainText('정답입니다');
    await expect(page.locator('[data-element="quiz-message"]')).toHaveAttribute('data-tone', 'success');
  });

  test('rejects an incorrect stage order', async ({ page }) => {
    await page.goto('/#/mitosis');
    for (const id of ['metaphase', 'interphase', 'cytokinesis', 'anaphase', 'prophase', 'telophase']) {
      await page.locator(`[data-order="${id}"]`).click();
    }
    await page.locator('[data-action="quiz-check"]').click();
    await expect(page.locator('[data-element="quiz-message"]')).toContainText('다시 확인해 보세요');
  });

  test('shows the simplified model note', async ({ page }) => {
    await page.goto('/#/mitosis');
    await expect(page.locator('.view-head')).toContainText('간단화 모형 · 4염색체');
    await expect(page.locator('.model-note')).toContainText('사람의 세포는 46개의 염색체');
  });
});

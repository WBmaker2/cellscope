import { expect, test, type Page } from '@playwright/test';

const HUNT_TARGETS = ['nucleus', 'mitochondria', 'ribosomes', 'golgi', 'lysosome'];

async function selectPrediction(page: Page, label: string): Promise<void> {
  await page.getByTestId('mission-panel').locator('label').filter({ hasText: label }).first().click();
  await page.getByTestId('prediction-submit').click();
}

async function completeOrganelleHunt(page: Page, keyboard = false): Promise<void> {
  await page.goto('/#/missions/organelle-hunt');
  if (keyboard) {
    const radio = page.getByRole('radio', { name: '핵', exact: true });
    await radio.focus();
    await page.keyboard.press('Space');
    await expect(radio).toBeChecked();
    await page.getByTestId('prediction-submit').focus();
    await page.keyboard.press('Enter');
  } else {
    await selectPrediction(page, '핵');
  }

  await expect(page.getByRole('heading', { name: '다섯 소기관을 찾아 선택하세요.' })).toBeVisible();
  for (const id of HUNT_TARGETS) {
    const target = page.locator(`[data-testid="mission-panel"] [data-target="${id}"]`);
    if (keyboard) {
      await target.focus();
      await page.keyboard.press('Enter');
    } else {
      await target.click();
    }
  }

  await expect(page.getByRole('heading', { name: '리보솜의 역할로 알맞은 것은 무엇일까요?' })).toBeVisible();
  if (keyboard) {
    const answer = page.getByRole('radio', { name: '단백질을 만든다', exact: true });
    await answer.focus();
    await page.keyboard.press('Space');
    await page.getByTestId('explain-submit').focus();
    await page.keyboard.press('Enter');
  } else {
    await page.getByTestId('mission-panel').locator('label').filter({ hasText: '단백질을 만든다' }).first().click();
    await page.getByTestId('explain-submit').click();
  }
  await expect(page.getByTestId('mission-complete')).toBeVisible();
}

test.describe('missions', () => {
  test('completes the organelle hunt and saves progress', async ({ page }) => {
    await completeOrganelleHunt(page);
    await expect(page.getByTestId('header-progress')).toContainText('미션 1 / 6');
    await expect(page.getByTestId('mission-next')).toContainText('다음 미션');

    await page.goto('/#/missions');
    await expect(page.getByTestId('mission-card-organelle-hunt')).toHaveClass(/is-done/);
    await expect(page.getByTestId('header-progress')).toContainText('미션 1 / 6');
  });

  test('keeps completion after a reload', async ({ page }) => {
    await completeOrganelleHunt(page);
    await page.reload();
    await expect(page.getByTestId('header-progress')).toContainText('미션 1 / 6');
    await expect(page.locator('.badge-success')).toContainText('이전에 완료');
  });

  test('shows a hint for an incorrect prediction and allows a retry', async ({ page }) => {
    await page.goto('/#/missions/organelle-hunt');
    await selectPrediction(page, '리보솜');
    await expect(page.locator('.feedback.is-warn')).toContainText('핵 안에는 세포의 설계 정보인 DNA');
    await expect(page.getByRole('heading', { name: '다섯 소기관을 찾아 선택하세요.' })).toHaveCount(0);

    await page.getByRole('radio', { name: '핵', exact: true }).check();
    await page.getByTestId('prediction-submit').click();
    await expect(page.getByRole('heading', { name: '다섯 소기관을 찾아 선택하세요.' })).toBeVisible();
  });

  test('can be completed with keyboard activation only', async ({ page }) => {
    await completeOrganelleHunt(page, true);
    await expect(page.getByTestId('mission-complete')).toBeVisible();
  });

  test('completes the plant wall mission through both scenarios', async ({ page }) => {
    await page.goto('/#/missions/plant-wall');
    await selectPrediction(page, '팽팽해지지만 터지지 않는다');
    await expect(page.getByRole('heading', { name: '저장액과 고장액을 차례로 실행해 보세요.' })).toBeVisible();

    await page.locator('[data-scenario="0"]').click();
    await expect(page.locator('.scenario-card.is-observed')).toHaveCount(1);
    await page.locator('[data-scenario="1"]').click();
    await expect(page.locator('.scenario-card.is-observed')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: '고장액에서 세포막이 세포벽에서 떨어지는 현상을 무엇이라고 할까요?' })).toBeVisible();

    await page
      .getByTestId('mission-panel')
      .locator('label')
      .filter({ hasText: '원형질 분리' })
      .first()
      .click();
    await page.getByTestId('explain-submit').click();
    await expect(page.getByTestId('mission-complete')).toBeVisible();
    await expect(page.getByTestId('mission-complete')).toContainText('세포벽 덕분에');
    await expect(page.getByTestId('header-progress')).toContainText('미션 1 / 6');
  });

  test('resets progress in teacher mode after confirmation', async ({ page }) => {
    await completeOrganelleHunt(page);
    await page.goto('/#/teacher');
    await page.getByTestId('reset-progress').click();
    await page.locator('dialog').getByRole('button', { name: '모두 지우기' }).click();
    await expect(page.getByTestId('header-progress')).toContainText('미션 0 / 6');

    await page.goto('/#/missions');
    await expect(page.getByTestId('mission-card-organelle-hunt')).not.toHaveClass(/is-done/);
  });

  test('shows teacher answers only after toggling', async ({ page }) => {
    await page.goto('/#/teacher');
    await expect(page.locator('.answer-body')).toHaveCount(0);
    await page.locator('.teacher-actions [data-action="toggle-answers"]').click();
    await expect(page.locator('.answer-body')).toHaveCount(6);
    await expect(page.locator('.answer-body').first()).toContainText('단백질을 만든다');
  });

  test('prepares a printable worksheet with blank labels', async ({ page }) => {
    await page.goto('/#/teacher');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.worksheet')).toBeVisible();
    await expect(page.locator('.worksheet')).toContainText('세포의 구조와 기능');
    await expect(page.locator('.worksheet')).toContainText('동물세포');
    await expect(page.locator('.worksheet')).toContainText('식물세포');
    await expect(page.locator('.blank-name')).toHaveCount(14);
    await expect(page.locator('.worksheet-svg')).toHaveCount(2);
  });
});

test.describe('all missions are playable', () => {
  async function answerChoices(page: Page, answers: string[]): Promise<void> {
    const panel = page.getByTestId('mission-panel');
    for (const answer of answers) {
      await panel.locator('label').filter({ hasText: answer }).first().click();
      await page.getByTestId('explain-submit').click();
    }
  }

  test('animal vs plant', async ({ page }) => {
    await page.goto('/#/missions/animal-vs-plant');
    await selectPrediction(page, '세포벽, 엽록체, 중심 액포');
    for (const id of ['cell-wall', 'chloroplast', 'central-vacuole']) {
      await page.locator(`[data-testid="mission-panel"] [data-target="${id}"]`).click();
    }
    await answerChoices(page, ['리소좀과 중심체']);
    await expect(page.getByTestId('mission-complete')).toBeVisible();
  });

  test('osmosis predictions with three cases', async ({ page }) => {
    await page.goto('/#/missions/osmosis-predict');
    await selectPrediction(page, '용질 농도가 높은 쪽');
    await page.locator('[data-case="0"]').filter({ hasText: '팽창한다' }).click();
    await page.locator('[data-case="1"]').filter({ hasText: '변화 없다' }).click();
    await page.locator('[data-case="2"]').filter({ hasText: '수축한다' }).click();
    await page.locator('[data-testid="mission-panel"] label').filter({ hasText: '세포 밖 용질 농도가 세포 안보다 낮을 때' }).first().click();
    await page.getByTestId('explain-submit').click();
    await expect(page.getByTestId('mission-complete')).toBeVisible();
  });

  test('mitosis order', async ({ page }) => {
    await page.goto('/#/missions/mitosis-order');
    await selectPrediction(page, '간기');
    for (const id of ['interphase', 'prophase', 'metaphase', 'anaphase', 'telophase', 'cytokinesis']) {
      await page.locator(`[data-order="${id}"]`).click();
    }
    await page.locator('[data-action="order-check"]').click();
    await expect(page.locator('.feedback.is-success').filter({ hasText: '순서가 맞습니다' })).toBeVisible();
    await answerChoices(page, ['자매 염색분체가 분리되어 양극으로 이동한다']);
    await expect(page.getByTestId('mission-complete')).toBeVisible();
  });

  test('mitosis explanation', async ({ page }) => {
    await page.goto('/#/missions/mitosis-explain');
    await selectPrediction(page, '분리되어 반대쪽 극으로 이동한다');
    await page.locator('[data-action="observe-anaphase"]').click();
    await answerChoices(page, ['염색체를 잡아당겨 극으로 이동시킨다']);
    await expect(page.getByTestId('mission-complete')).toBeVisible();
    await expect(page.getByTestId('header-progress')).toContainText('미션 1 / 6');
  });
});

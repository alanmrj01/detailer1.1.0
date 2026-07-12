import { expect, test, type Page } from '@playwright/test';

const RUN_KEY = 'detailer-lab-run-v2';
const THEME_KEY = 'detailer-lab-theme-v2';

const decisions = [
  { choice: 'garage', decision: 'operation-model', grants: ['setup_garage'] },
  { choice: 'essential', decision: 'equipment-plan', grants: ['eq_washer', 'eq_vacuum'] },
  { choice: 'wash', decision: 'service-focus', grants: ['service_wash'] },
  { choice: 'balanced-price', decision: 'first-quote', grants: [] },
  { choice: 'content-routine', decision: 'slow-week', grants: [] },
  { choice: 'preserve-quality', decision: 'execution-pressure', grants: [] },
  { choice: 'redo', decision: 'customer-complaint', grants: [] },
  { choice: 'reserve', decision: 'growth-choice', grants: [] },
];

function runAt(index: number, metrics = baseMetrics()) {
  const selected = decisions.slice(0, index);
  return {
    runId: `visual-${index}`,
    startedAt: '2026-07-11T12:00:00.000Z',
    currentDecisionIndex: index,
    metrics,
    flags: selected.flatMap((item) => item.grants),
    choices: Object.fromEntries(selected.map((item) => [item.decision, item.choice])),
    ledger: [],
    ...(index >= decisions.length ? { completedAt: '2026-07-11T13:00:00.000Z' } : {}),
  };
}

function baseMetrics() {
  return {
    cash: 4758.41,
    reputation: 48,
    quality: 52,
    capacity: 13,
    risk: 0,
    customers: 9,
    fatigue: 26.47,
  };
}

async function openWithState(page: Page, run: ReturnType<typeof runAt> | null, theme: 'dark' | 'light' = 'dark') {
  await page.addInitScript(({ runState, selectedTheme, runKey, themeKey }) => {
    localStorage.clear();
    localStorage.setItem(themeKey, JSON.stringify(selectedTheme));
    if (runState) localStorage.setItem(runKey, JSON.stringify(runState));
  }, { runState: run, selectedTheme: theme, runKey: RUN_KEY, themeKey: THEME_KEY });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('main').first().waitFor();
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
}

async function expectPageScreenshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

test('capa nos temas escuro e claro', async ({ page }) => {
  await openWithState(page, null, 'dark');
  await expectPageScreenshot(page, '01-capa-dark.png');

  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expectPageScreenshot(page, '02-capa-light.png');
});

for (let index = 0; index < decisions.length; index += 1) {
  test(`fase 1 — tela ${index + 1}/8`, async ({ page }) => {
    const theme = index === 0 ? 'light' : 'dark';
    await openWithState(page, runAt(index), theme);
    await expect(page.locator(`[data-scene]`)).toHaveCount(1);
    const choiceVisuals = page.locator('[data-choice-visual]');
    const expectedChoices = index === 1 || index === 2 || index === 7 ? 4 : 3;
    await expect(choiceVisuals).toHaveCount(expectedChoices);
    const choiceSources = await choiceVisuals.locator('img').evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).currentSrc),
    );
    expect(new Set(choiceSources).size).toBe(expectedChoices);
    await expect(page.locator('[data-testid="ambient-particles"]')).toHaveCount(0);
    await expectPageScreenshot(page, `${String(index + 3).padStart(2, '0')}-fase-1-${index + 1}-de-8.png`);
  });
}

const resultCases = [
  { name: '1-estrela', metrics: { cash: 1200, reputation: 10, quality: 20, capacity: 4, risk: 65, customers: 4, fatigue: 48 } },
  { name: '2-estrelas', metrics: { cash: 2100, reputation: 22, quality: 30, capacity: 6, risk: 52, customers: 5, fatigue: 42 } },
  { name: '3-estrelas', metrics: { cash: 3300, reputation: 32, quality: 40, capacity: 8, risk: 34, customers: 7, fatigue: 34 } },
  { name: '4-estrelas', metrics: { cash: 4300, reputation: 42, quality: 49, capacity: 11, risk: 16, customers: 8, fatigue: 24 } },
  { name: '5-estrelas', metrics: { cash: 5400, reputation: 50, quality: 55, capacity: 13, risk: 0, customers: 10, fatigue: 8 } },
];

for (const [index, resultCase] of resultCases.entries()) {
  test(`resultado dinâmico — ${resultCase.name}`, async ({ page }) => {
    await openWithState(page, runAt(8, resultCase.metrics));
    await expect(page.locator(`[data-scene="result-${index + 1}star"]`)).toHaveCount(1);
    await expectPageScreenshot(page, `${String(index + 11).padStart(2, '0')}-resultado-${resultCase.name}.png`);
  });
}

test('fase 2 e painel de validação', async ({ page }) => {
  await openWithState(page, runAt(8, resultCases[3].metrics));
  await page.getByRole('button', { name: 'Ir para a fase 2' }).click();
  await expectPageScreenshot(page, '16-fase-2.png');

  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByLabel('PIN do criador').fill('2468');
  await page.getByRole('button', { name: 'Acessar configurações' }).click();
  await page.getByRole('button', { name: 'Dados e validação' }).click();
  await expect(page.getByText(/régua absoluta/i)).toBeVisible();
  await expectPageScreenshot(page, '17-configuracoes-validacao.png');
});

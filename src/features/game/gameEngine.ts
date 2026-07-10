import type { AppConfig, DecisionChoice, MetricKey, NumericMetrics } from '../../types/config';
import type { GameResult, GameRun } from '../../types/game';
import { clamp } from '../../utils/format';

const boundedMetrics: MetricKey[] = ['reputation', 'quality', 'risk', 'fatigue'];

export function createRun(config: AppConfig): GameRun {
  return {
    runId: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    currentDecisionIndex: 0,
    metrics: { ...config.scenario.initialMetrics },
    flags: [],
    choices: {},
    ledger: [],
  };
}

export function equipmentCost(choice: DecisionChoice, config: AppConfig): number {
  if (!choice.costEquipmentIds?.length) return 0;
  return choice.costEquipmentIds.reduce((total, id) => {
    const equipment = config.scenario.equipment.find((item) => item.id === id);
    return total + (equipment?.price ?? 0);
  }, 0);
}

export function choiceAvailability(
  choice: DecisionChoice,
  run: GameRun,
  config: AppConfig,
): { available: boolean; reason?: string; effectiveCashDelta: number } {
  const directCash = choice.effects.cash ?? 0;
  const cost = equipmentCost(choice, config);
  const effectiveCashDelta = directCash - cost;
  const requirements = choice.requirements;

  if (requirements?.requiredFlags?.some((flag) => !run.flags.includes(flag))) {
    return { available: false, reason: 'Você não possui todos os recursos exigidos por esta escolha.', effectiveCashDelta };
  }

  if (
    requirements?.requiredAnyFlags?.length &&
    !requirements.requiredAnyFlags.some((flag) => run.flags.includes(flag))
  ) {
    return { available: false, reason: 'Esta escolha exige ao menos um equipamento compatível.', effectiveCashDelta };
  }

  if (requirements?.forbiddenFlags?.some((flag) => run.flags.includes(flag))) {
    return { available: false, reason: 'Esta escolha é incompatível com uma decisão anterior.', effectiveCashDelta };
  }

  const minimumCash = requirements?.minCashAfter ?? 0;
  if (run.metrics.cash + effectiveCashDelta < minimumCash) {
    return {
      available: false,
      reason: `A escolha deixaria o caixa abaixo da reserva mínima de R$ ${minimumCash.toFixed(2)}.`,
      effectiveCashDelta,
    };
  }

  return { available: true, effectiveCashDelta };
}

export function applyChoice(
  run: GameRun,
  decisionId: string,
  choice: DecisionChoice,
  config: AppConfig,
): GameRun {
  const availability = choiceAvailability(choice, run, config);
  if (!availability.available) return run;

  const before = { ...run.metrics };
  const after = { ...run.metrics };
  const delta: Partial<Record<MetricKey, number>> = {};

  (Object.keys(choice.effects) as MetricKey[]).forEach((metric) => {
    if (metric === 'cash') return;
    const amount = choice.effects[metric] ?? 0;
    after[metric] += amount;
    delta[metric] = amount;
  });

  after.cash += availability.effectiveCashDelta;
  delta.cash = availability.effectiveCashDelta;

  boundedMetrics.forEach((metric) => {
    after[metric] = clamp(after[metric], 0, 100);
  });
  after.capacity = Math.max(0, after.capacity);
  after.customers = Math.max(0, after.customers);
  after.cash = Math.round(after.cash * 100) / 100;

  return {
    ...run,
    currentDecisionIndex: run.currentDecisionIndex + 1,
    metrics: after,
    flags: Array.from(new Set([...run.flags, ...(choice.grants ?? [])])),
    choices: { ...run.choices, [decisionId]: choice.id },
    completedAt:
      run.currentDecisionIndex + 1 >= config.scenario.decisions.length
        ? new Date().toISOString()
        : undefined,
    ledger: [
      ...run.ledger,
      {
        id: crypto.randomUUID(),
        decisionId,
        choiceId: choice.id,
        title: choice.label,
        consequence: choice.consequence,
        before,
        after,
        delta,
      },
    ],
  };
}

export function calculateResult(run: GameRun, config: AppConfig): GameResult {
  const initial = config.scenario.initialMetrics;
  const weights = config.scenario.scoreWeights;
  const cashScore = clamp(((run.metrics.cash - initial.cash + 3000) / 6000) * 100, 0, 100);
  const capacityScore = clamp((run.metrics.capacity / 14) * 100, 0, 100);

  const score = Math.round(
    cashScore * weights.cash +
      run.metrics.reputation * weights.reputation +
      run.metrics.quality * weights.quality +
      capacityScore * weights.capacity +
      (100 - run.metrics.risk) * weights.risk +
      (100 - run.metrics.fatigue) * weights.fatigue,
  );

  const band =
    config.scenario.resultBands.find((item) => score >= item.minScore && score <= item.maxScore) ??
    config.scenario.resultBands[0];

  const strengths: string[] = [];
  const alerts: string[] = [];
  if (run.metrics.cash >= initial.cash * 0.65) strengths.push('Você preservou uma reserva relevante de caixa.');
  else alerts.push('O caixa final ficou baixo para absorver imprevistos e sazonalidade.');
  if (run.metrics.reputation >= 55) strengths.push('Sua postura gerou confiança e reputação.');
  else alerts.push('A reputação ainda depende de processos mais consistentes.');
  if (run.metrics.quality >= 60) strengths.push('O padrão de entrega terminou acima do nível inicial.');
  else alerts.push('A qualidade sofreu com pressão, variedade ou decisões de curto prazo.');
  if (run.metrics.risk <= 35) strengths.push('O risco operacional ficou sob controle.');
  else alerts.push('Há exposição elevada a retrabalho, custo fixo ou promessas difíceis de cumprir.');
  if (run.metrics.fatigue <= 40) strengths.push('A carga de trabalho permaneceu sustentável.');
  else alerts.push('A operação depende demais do esforço pessoal do proprietário.');

  return { score, bandId: band.id, strengths, alerts };
}

export function resolveAnimation(run: GameRun, configured: AppConfig['scenario']['decisions'][number]['animation']) {
  if (configured === 'polishing') {
    if (run.flags.includes('service_interior')) return 'interior';
    if (run.flags.includes('service_wash')) return 'washing';
  }
  if (configured === 'garage') {
    if (run.flags.includes('setup_mobile')) return 'mobile';
    if (run.flags.includes('setup_store')) return 'store';
  }
  return configured;
}

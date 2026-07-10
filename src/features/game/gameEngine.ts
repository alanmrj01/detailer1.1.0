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
    phase2Unlocked: false,
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

export function calculateScoreFromMetrics(metrics: NumericMetrics, config: AppConfig): number {
  const initial = config.scenario.initialMetrics;
  const weights = config.scenario.scoreWeights;
  const cashScore = clamp(((metrics.cash - initial.cash + 3000) / 6000) * 100, 0, 100);
  const capacityScore = clamp((metrics.capacity / 14) * 100, 0, 100);

  return Math.round(
    cashScore * weights.cash +
      metrics.reputation * weights.reputation +
      metrics.quality * weights.quality +
      capacityScore * weights.capacity +
      (100 - metrics.risk) * weights.risk +
      (100 - metrics.fatigue) * weights.fatigue,
  );
}

export function scoreToStars(score: number): number {
  return Math.round(clamp((score / 100) * 5, 0, 5) * 10) / 10;
}

export function calculateStepStarGain(before: NumericMetrics, after: NumericMetrics, config: AppConfig): number {
  const beforeStars = scoreToStars(calculateScoreFromMetrics(before, config));
  const afterStars = scoreToStars(calculateScoreFromMetrics(after, config));
  return Math.max(0, Math.round((afterStars - beforeStars) * 10) / 10);
}

export function calculateResult(run: GameRun, config: AppConfig): GameResult {
  const initial = config.scenario.initialMetrics;
  const score = calculateScoreFromMetrics(run.metrics, config);
  const stars = scoreToStars(score);

  const band =
    config.scenario.resultBands.find((item) => score >= item.minScore && score <= item.maxScore) ??
    config.scenario.resultBands[0];

  const strengths: string[] = [];
  const alerts: string[] = [];
  if (run.metrics.cash >= initial.cash * 0.65) strengths.push('Boa reserva de caixa para seguir operando.');
  else alerts.push('Caixa final apertado para lidar com imprevistos.');
  if (run.metrics.reputation >= 55) strengths.push('Sua reputação terminou em bom nível.');
  else alerts.push('A reputação ainda precisa de mais consistência.');
  if (run.metrics.quality >= 60) strengths.push('O padrão da entrega ficou acima do ponto de partida.');
  else alerts.push('A qualidade foi pressionada em escolhas-chave.');
  if (run.metrics.risk <= 35) strengths.push('O risco operacional ficou bem controlado.');
  else alerts.push('O risco operacional terminou acima do ideal.');
  if (run.metrics.fatigue <= 40) strengths.push('A carga de trabalho segue sustentável.');
  else alerts.push('A operação está muito dependente do seu esforço pessoal.');

  return { score, stars, bandId: band.id, strengths, alerts };
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

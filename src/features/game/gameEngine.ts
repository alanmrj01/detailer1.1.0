import type {
  AppConfig,
  ChoiceEffects,
  DecisionChoice,
  MetricKey,
  NumericMetrics,
} from '../../types/config';
import type { GameResult, GameRun } from '../../types/game';
import { clamp } from '../../utils/format';

const boundedMetrics: MetricKey[] = ['reputation', 'quality', 'risk', 'fatigue'];
const SCORE_CURVE_EXPONENT = 1.8;
const calibrationCache = new WeakMap<AppConfig, ScoreCalibration>();
const balanceCache = new WeakMap<AppConfig, GameBalanceAnalysis>();

interface SimulationState {
  metrics: NumericMetrics;
  flags: string[];
  choices: Record<string, string>;
  choiceIds: string[];
}

interface RawPathSnapshot extends SimulationState {
  rawScore: number;
}

interface ScoreCalibration {
  minRawScore: number;
  maxRawScore: number;
}

export interface EnumeratedGamePath {
  choiceIds: string[];
  metrics: NumericMetrics;
  score: number;
  stars: number;
  bandId: string;
}

export interface GameBalanceAnalysis {
  totalPaths: number;
  minScore: number;
  maxScore: number;
  recommendedScore: number | null;
  recommendedStars: number | null;
  recommendedChoiceIds: string[];
  reachableBandIds: string[];
  bandCounts: Record<string, number>;
}

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
  run: Pick<GameRun, 'metrics' | 'flags'>,
  config: AppConfig,
  decisionId?: string,
): { available: boolean; reason?: string; effectiveCashDelta: number } {
  const resolvedDecisionId = decisionId ?? findDecisionIdForChoice(choice, config);
  const adjustedEffects = getAdjustedChoiceEffects(resolvedDecisionId, choice, config);
  const directCash = adjustedEffects.cash ?? 0;
  const cost = equipmentCost(choice, config);
  const effectiveCashDelta = directCash - cost;
  const requirements = choice.requirements;

  if (requirements?.requiredFlags?.some((flag) => !run.flags.includes(flag))) {
    return {
      available: false,
      reason: 'Você não possui todos os recursos exigidos por esta escolha.',
      effectiveCashDelta,
    };
  }

  if (
    requirements?.requiredAnyFlags?.length &&
    !requirements.requiredAnyFlags.some((flag) => run.flags.includes(flag))
  ) {
    return {
      available: false,
      reason: 'Esta escolha exige ao menos um equipamento compatível.',
      effectiveCashDelta,
    };
  }

  if (requirements?.forbiddenFlags?.some((flag) => run.flags.includes(flag))) {
    return {
      available: false,
      reason: 'Esta escolha é incompatível com uma decisão anterior.',
      effectiveCashDelta,
    };
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
  const availability = choiceAvailability(choice, run, config, decisionId);
  if (!availability.available) return run;

  const before = { ...run.metrics };
  const adjustedEffects = getAdjustedChoiceEffects(decisionId, choice, config);
  const after = applyEffects(run.metrics, adjustedEffects, availability.effectiveCashDelta);
  const delta = calculateDelta(before, after);

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

/**
 * Pontuação calibrada contra todos os caminhos válidos da configuração atual.
 * Isso preserva os pesos editáveis do criador, mas garante que o pior e o melhor
 * conjunto de decisões ocupem a escala completa de 0 a 100.
 */
export function calculateScoreFromMetrics(metrics: NumericMetrics, config: AppConfig): number {
  const rawScore = calculateRawScoreFromMetrics(metrics, config);
  const calibration = getScoreCalibration(config);
  return normalizeRawScore(rawScore, calibration);
}

export function scoreToStars(score: number): number {
  return Math.round(clamp((score / 100) * 5, 0, 5) * 10) / 10;
}

export function calculateStepStarGain(
  before: NumericMetrics,
  after: NumericMetrics,
  config: AppConfig,
): number {
  const beforeStars = scoreToStars(calculateScoreFromMetrics(before, config));
  const afterStars = scoreToStars(calculateScoreFromMetrics(after, config));
  return Math.max(0, Math.round((afterStars - beforeStars) * 10) / 10);
}

export function calculateResult(run: GameRun, config: AppConfig): GameResult {
  const initial = config.scenario.initialMetrics;
  const score = calculateScoreFromMetrics(run.metrics, config);
  const stars = scoreToStars(score);
  const band = findResultBand(score, config);

  const strengths: string[] = [];
  const alerts: string[] = [];
  if (run.metrics.cash >= initial.cash * 0.65) {
    strengths.push('Boa reserva de caixa para seguir operando e absorver ajustes da próxima rodada.');
  } else {
    alerts.push('Caixa final apertado: vale revisar decisões que tiraram fôlego antes da reta final.');
  }
  if (run.metrics.reputation >= 55) {
    strengths.push('Sua reputação terminou em bom nível, sinal de promessa e entrega mais coerentes.');
  } else {
    alerts.push('A reputação ainda pede mais consistência entre oferta, prazo e experiência do cliente.');
  }
  if (run.metrics.quality >= 60) {
    strengths.push('O padrão da entrega ficou acima do ponto de partida e sustentou melhor percepção de valor.');
  } else {
    alerts.push('A qualidade foi pressionada em escolhas-chave e merece mais atenção na próxima tentativa.');
  }
  if (run.metrics.risk <= 35) {
    strengths.push('O risco operacional ficou bem controlado, indicando decisões mais seguras.');
  } else {
    alerts.push('O risco operacional terminou acima do ideal: observe onde velocidade ou economia cobraram um preço oculto.');
  }
  if (run.metrics.fatigue <= 40) {
    strengths.push('A carga de trabalho segue sustentável, sem depender demais do seu esforço pessoal.');
  } else {
    alerts.push('A operação ficou muito dependente do seu esforço pessoal; procure mais equilíbrio operacional.');
  }

  return { score, stars, bandId: band.id, strengths, alerts };
}

export function enumerateValidGamePaths(config: AppConfig): EnumeratedGamePath[] {
  const rawPaths = enumerateRawPaths(config);
  const calibration = calibrationFromPaths(rawPaths);

  return rawPaths.map((path) => {
    const score = normalizeRawScore(path.rawScore, calibration);
    return {
      choiceIds: path.choiceIds,
      metrics: path.metrics,
      score,
      stars: scoreToStars(score),
      bandId: findResultBand(score, config).id,
    };
  });
}

export function analyzeGameBalance(config: AppConfig): GameBalanceAnalysis {
  const cached = balanceCache.get(config);
  if (cached) return cached;

  const paths = enumerateValidGamePaths(config);
  const bandCounts = Object.fromEntries(config.scenario.resultBands.map((band) => [band.id, 0]));
  paths.forEach((path) => {
    bandCounts[path.bandId] = (bandCounts[path.bandId] ?? 0) + 1;
  });

  const recommendedState = simulateRecommendedPath(config);
  const recommendedScore = recommendedState
    ? calculateScoreFromMetrics(recommendedState.metrics, config)
    : null;

  const analysis: GameBalanceAnalysis = {
    totalPaths: paths.length,
    minScore: paths.length ? Math.min(...paths.map((path) => path.score)) : 0,
    maxScore: paths.length ? Math.max(...paths.map((path) => path.score)) : 0,
    recommendedScore,
    recommendedStars: recommendedScore === null ? null : scoreToStars(recommendedScore),
    recommendedChoiceIds: recommendedState?.choiceIds ?? [],
    reachableBandIds: Object.entries(bandCounts)
      .filter(([, count]) => count > 0)
      .map(([bandId]) => bandId),
    bandCounts,
  };
  balanceCache.set(config, analysis);
  return analysis;
}

export function resolveAnimation(
  run: GameRun,
  configured: AppConfig['scenario']['decisions'][number]['animation'],
) {
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

export function getDecisionVehicle(
  decisionId: string,
  config: AppConfig,
): AppConfig['scenario']['cars'][number] | null {
  const decision = config.scenario.decisions.find((item) => item.id === decisionId);
  const fallbackVehicleId = decisionId === 'first-quote'
    ? 't-cross'
    : decisionId === 'customer-complaint'
      ? 'onix'
      : undefined;
  const vehicleId = decision?.vehicleId ?? fallbackVehicleId;
  if (!vehicleId) return null;
  return config.scenario.cars.find((car) => car.id === vehicleId) ?? null;
}

function calculateRawScoreFromMetrics(metrics: NumericMetrics, config: AppConfig): number {
  const initial = config.scenario.initialMetrics;
  const weights = config.scenario.scoreWeights;
  const cashScore = clamp(((metrics.cash - initial.cash + 3000) / 6000) * 100, 0, 100);
  const capacityScore = clamp((metrics.capacity / 14) * 100, 0, 100);

  return (
    cashScore * weights.cash +
    metrics.reputation * weights.reputation +
    metrics.quality * weights.quality +
    capacityScore * weights.capacity +
    (100 - metrics.risk) * weights.risk +
    (100 - metrics.fatigue) * weights.fatigue
  );
}

function getScoreCalibration(config: AppConfig): ScoreCalibration {
  const cached = calibrationCache.get(config);
  if (cached) return cached;
  const calibration = calibrationFromPaths(enumerateRawPaths(config));
  calibrationCache.set(config, calibration);
  return calibration;
}

function calibrationFromPaths(paths: RawPathSnapshot[]): ScoreCalibration {
  if (!paths.length) return { minRawScore: 0, maxRawScore: 100 };
  return {
    minRawScore: Math.min(...paths.map((path) => path.rawScore)),
    maxRawScore: Math.max(...paths.map((path) => path.rawScore)),
  };
}

function normalizeRawScore(rawScore: number, calibration: ScoreCalibration): number {
  const range = calibration.maxRawScore - calibration.minRawScore;
  if (range <= 0.0001) return 50;
  const ratio = clamp((rawScore - calibration.minRawScore) / range, 0, 1);
  return Math.round(Math.pow(ratio, SCORE_CURVE_EXPONENT) * 100);
}

function enumerateRawPaths(config: AppConfig): RawPathSnapshot[] {
  const paths: RawPathSnapshot[] = [];
  const initialState: SimulationState = {
    metrics: { ...config.scenario.initialMetrics },
    flags: [],
    choices: {},
    choiceIds: [],
  };

  const visit = (decisionIndex: number, state: SimulationState) => {
    if (decisionIndex >= config.scenario.decisions.length) {
      paths.push({
        ...state,
        metrics: { ...state.metrics },
        flags: [...state.flags],
        choices: { ...state.choices },
        choiceIds: [...state.choiceIds],
        rawScore: calculateRawScoreFromMetrics(state.metrics, config),
      });
      return;
    }

    const decision = config.scenario.decisions[decisionIndex];
    decision.choices.forEach((choice) => {
      const availability = choiceAvailability(choice, state, config, decision.id);
      if (!availability.available) return;
      visit(
        decisionIndex + 1,
        simulateChoice(state, decision.id, choice, config, availability.effectiveCashDelta),
      );
    });
  };

  visit(0, initialState);
  return paths;
}

function simulateRecommendedPath(config: AppConfig): SimulationState | null {
  let state: SimulationState = {
    metrics: { ...config.scenario.initialMetrics },
    flags: [],
    choices: {},
    choiceIds: [],
  };

  for (const decision of config.scenario.decisions) {
    const recommended = decision.choices.find((choice) => choice.recommended);
    if (!recommended) return null;
    const availability = choiceAvailability(recommended, state, config, decision.id);
    if (!availability.available) return null;
    state = simulateChoice(state, decision.id, recommended, config, availability.effectiveCashDelta);
  }

  return state;
}

function simulateChoice(
  state: SimulationState,
  decisionId: string,
  choice: DecisionChoice,
  config: AppConfig,
  effectiveCashDelta: number,
): SimulationState {
  const adjustedEffects = getAdjustedChoiceEffects(decisionId, choice, config);
  return {
    metrics: applyEffects(state.metrics, adjustedEffects, effectiveCashDelta),
    flags: Array.from(new Set([...state.flags, ...(choice.grants ?? [])])),
    choices: { ...state.choices, [decisionId]: choice.id },
    choiceIds: [...state.choiceIds, choice.id],
  };
}

function applyEffects(
  metrics: NumericMetrics,
  effects: ChoiceEffects,
  effectiveCashDelta: number,
): NumericMetrics {
  const after = { ...metrics };
  (Object.keys(effects) as MetricKey[]).forEach((metric) => {
    if (metric === 'cash') return;
    after[metric] += effects[metric] ?? 0;
  });
  after.cash += effectiveCashDelta;

  boundedMetrics.forEach((metric) => {
    after[metric] = clamp(after[metric], 0, 100);
  });
  after.capacity = Math.max(0, after.capacity);
  after.customers = Math.max(0, after.customers);
  after.cash = Math.round(after.cash * 100) / 100;
  return after;
}

function calculateDelta(
  before: NumericMetrics,
  after: NumericMetrics,
): Partial<Record<MetricKey, number>> {
  return (Object.keys(before) as MetricKey[]).reduce<Partial<Record<MetricKey, number>>>((delta, metric) => {
    const value = Math.round((after[metric] - before[metric]) * 100) / 100;
    if (value !== 0) delta[metric] = value;
    return delta;
  }, {});
}

function getAdjustedChoiceEffects(
  decisionId: string | undefined,
  choice: DecisionChoice,
  config: AppConfig,
): ChoiceEffects {
  const effects = { ...choice.effects };
  if (!decisionId || !['first-quote', 'customer-complaint'].includes(decisionId)) {
    return effects;
  }

  const vehicle = getDecisionVehicle(decisionId, config);
  if (!vehicle) return effects;

  const segmentFactor = {
    hatch: 0.96,
    sedan: 1,
    suv: 1.08,
    pickup: 1.12,
  }[vehicle.segment];
  const workload = clamp(
    vehicle.sizeFactor * 0.55 + vehicle.soilFactor * 0.3 + segmentFactor * 0.15,
    0.75,
    1.5,
  );

  if (effects.fatigue) effects.fatigue = roundEffect(effects.fatigue * workload);
  if (effects.risk) effects.risk = roundEffect(effects.risk * workload);
  if (decisionId === 'customer-complaint' && effects.cash && effects.cash < 0) {
    effects.cash = roundEffect(effects.cash * workload);
  }
  return effects;
}

function roundEffect(value: number): number {
  return Math.round(value * 100) / 100;
}

function findDecisionIdForChoice(choice: DecisionChoice, config: AppConfig): string | undefined {
  return config.scenario.decisions.find((decision) => decision.choices.some((item) => item === choice || item.id === choice.id))?.id;
}

function findResultBand(score: number, config: AppConfig) {
  return (
    config.scenario.resultBands.find((item) => score >= item.minScore && score <= item.maxScore) ??
    config.scenario.resultBands[0]
  );
}

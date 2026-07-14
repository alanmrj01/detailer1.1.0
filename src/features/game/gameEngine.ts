import type {
  AppConfig,
  ChoiceEffects,
  DecisionChoice,
  MetricKey,
  NumericMetrics,
} from '../../types/config';
import type { GameResult, GameRun, LedgerEntry } from '../../types/game';
import { clamp, formatCurrency } from '../../utils/format';
import { cloneValue, createUniqueId } from '../../utils/compat';
import { migrateNarrativeConsistency } from '../../utils/configTransfer';

const boundedMetrics: MetricKey[] = ['reputation', 'quality', 'risk', 'fatigue'];
const metricKeys: MetricKey[] = ['cash', 'reputation', 'quality', 'capacity', 'risk', 'customers', 'fatigue'];

const balanceCache = new WeakMap<AppConfig, GameBalanceAnalysis>();

interface SimulationState {
  metrics: NumericMetrics;
  flags: string[];
  choices: Record<string, string>;
  choiceIds: string[];
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

export interface ScoreBreakdown {
  cash: number;
  reputation: number;
  quality: number;
  capacity: number;
  risk: number;
  fatigue: number;
}

export function createRun(config: AppConfig): GameRun {
  return {
    runId: createUniqueId(),
    startedAt: new Date().toISOString(),
    currentDecisionIndex: 0,
    metrics: { ...config.scenario.initialMetrics },
    flags: [],
    choices: {},
    ledger: [],
    scenarioSnapshot: cloneValue(config.scenario),
  };
}

export function restoreRun(value: unknown, config: AppConfig): GameRun | null {
  if (!isRecord(value)) return null;
  if (typeof value.runId !== 'string' || typeof value.startedAt !== 'string') return null;
  if (!Number.isInteger(value.currentDecisionIndex) || value.currentDecisionIndex < 0) return null;
  if (!hasValidMetrics(value.metrics)) return null;
  if (!Array.isArray(value.flags) || !value.flags.every((item) => typeof item === 'string')) return null;
  if (!isStringRecord(value.choices) || !Array.isArray(value.ledger) || !value.ledger.every(isLedgerEntry)) return null;

  const snapshot = isScenarioSnapshot(value.scenarioSnapshot)
    ? cloneValue(value.scenarioSnapshot)
    : cloneValue(config.scenario);
  const snapshotConfig = { ...config, scenario: snapshot };
  migrateNarrativeConsistency(snapshotConfig);

  if (value.currentDecisionIndex > snapshot.decisions.length) return null;

  return {
    runId: value.runId,
    startedAt: value.startedAt,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : undefined,
    currentDecisionIndex: value.currentDecisionIndex,
    metrics: { ...value.metrics },
    flags: [...value.flags],
    choices: { ...value.choices },
    ledger: cloneValue(value.ledger) as GameRun['ledger'],
    scenarioSnapshot: snapshot,
  };
}

export function ensureRunScenarioSnapshot(run: GameRun, config: AppConfig): GameRun {
  if (run.scenarioSnapshot) return run;
  return { ...run, scenarioSnapshot: cloneValue(config.scenario) };
}

export function resolveRunConfig(run: GameRun, currentConfig: AppConfig): AppConfig {
  if (!run.scenarioSnapshot) return currentConfig;
  return { ...currentConfig, scenario: run.scenarioSnapshot };
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
      reason: `A escolha deixaria o caixa abaixo da reserva mínima de ${formatCurrency(minimumCash, config.scenario.currency)}.`,
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
        id: createUniqueId(),
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
 * Índice absoluto de saúde da operação: cada indicador é comparado com benchmarks fixos do método.
 * A nota de uma mesma operação permanece igual mesmo que escolhas ou caminhos
 * sejam adicionados/removidos da configuração.
 */
export function calculateScoreFromMetrics(metrics: NumericMetrics, config: AppConfig): number {
  const breakdown = calculateScoreBreakdown(metrics, config);
  const weights = config.scenario.scoreWeights;
  const totalWeight = Object.values(weights).reduce((total, value) => total + value, 0);
  if (totalWeight <= 0) return 0;

  const weightedScore =
    breakdown.cash * weights.cash +
    breakdown.reputation * weights.reputation +
    breakdown.quality * weights.quality +
    breakdown.capacity * weights.capacity +
    breakdown.risk * weights.risk +
    breakdown.fatigue * weights.fatigue;

  const baseHealth = weightedScore / totalWeight;
  const weakestIndicator = Math.min(...Object.values(breakdown));
  // Uma operação saudável não pode depender de um único indicador forte.
  // O bônus é pequeno e só aparece quando nenhum pilar permanece crítico.
  const balanceBonus = clamp((weakestIndicator - 72) / 8, 0, 1) * 5;

  return Math.round(clamp(baseHealth + balanceBonus, 0, 100));
}

export function calculateScoreBreakdown(metrics: NumericMetrics, config: AppConfig): ScoreBreakdown {
  const benchmarks = config.scenario.scoreBenchmarks;
  const initialCash = Math.max(1, config.scenario.initialMetrics.cash);
  return {
    cash: normalizeAgainstBenchmark(metrics.cash / initialCash, benchmarks.cashReserveRatio),
    reputation: normalizeAgainstBenchmark(metrics.reputation, benchmarks.reputation),
    quality: normalizeAgainstBenchmark(metrics.quality, benchmarks.quality),
    capacity: normalizeAgainstBenchmark(metrics.capacity, benchmarks.capacity),
    risk: normalizeAgainstBenchmark(metrics.risk, benchmarks.risk),
    fatigue: normalizeAgainstBenchmark(metrics.fatigue, benchmarks.fatigue),
  };
}

export function scoreToStars(score: number): number {
  // A régua visual representa saúde da operação, não uma recompensa linear.
  // Nos patamares altos, pequenos avanços exigem equilíbrio entre todos os pilares.
  const normalized = clamp(score / 100, 0, 1);
  return Math.round(5 * Math.pow(normalized, 1.7) * 10) / 10;
}

export function calculateStepStarChange(
  before: NumericMetrics,
  after: NumericMetrics,
  config: AppConfig,
): number {
  const beforeStars = scoreToStars(calculateScoreFromMetrics(before, config));
  const afterStars = scoreToStars(calculateScoreFromMetrics(after, config));
  return Math.round((afterStars - beforeStars) * 10) / 10;
}

export function calculateResult(run: GameRun, config: AppConfig): GameResult {
  const score = calculateScoreFromMetrics(run.metrics, config);
  const stars = scoreToStars(score);
  const band = findResultBand(score, config);
  const breakdown = calculateScoreBreakdown(run.metrics, config);
  const diagnostics = buildDiagnostics(breakdown);

  const strengthDiagnostics = diagnostics
    .filter((item) => item.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const attentionThreshold = band.id === 'excellent' ? 75 : band.id === 'sustainable' ? 65 : 60;
  const attentionDiagnostics = diagnostics
    .filter((item) => item.score < attentionThreshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, band.id === 'excellent' ? 2 : 3);

  const strengths = strengthDiagnostics.map((item) => item.strength);
  const strengthMetricKeys = strengthDiagnostics.map((item) => item.key);
  let attentions = attentionDiagnostics.map((item) => band.id === 'excellent' ? item.refinement : item.warning);
  let alertMetricKeys = attentionDiagnostics.map((item) => item.key);

  if (stars >= 5) {
    attentions = [
      'A saúde da operação atingiu 5,0: mantenha os padrões que criaram este equilíbrio e acompanhe-os para repetir o resultado.',
    ];
    alertMetricKeys = [];
  } else if (!attentions.length) {
    const nextRefinement = [...diagnostics].sort((a, b) => a.score - b.score)[0];
    if (nextRefinement) {
      attentions = [nextRefinement.refinement];
      alertMetricKeys = [nextRefinement.key];
    }
  }

  if (!strengths.length) {
    const strongest = [...diagnostics].sort((a, b) => b.score - a.score)[0];
    if (strongest) {
      strengths.push(strongest.strength);
      strengthMetricKeys.push(strongest.key);
    }
  }

  return {
    score,
    stars,
    bandId: band.id,
    strengths,
    alerts: attentions,
    strengthMetricKeys,
    alertMetricKeys,
  };
}

export function enumerateValidGamePaths(config: AppConfig): EnumeratedGamePath[] {
  return enumerateSimulationPaths(config).map((path) => {
    const score = calculateScoreFromMetrics(path.metrics, config);
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
  const bandCounts = config.scenario.resultBands.reduce<Record<string, number>>((counts, band) => {
    counts[band.id] = 0;
    return counts;
  }, {});
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

interface DiagnosticItem {
  key: Exclude<MetricKey, 'customers'>;
  score: number;
  strength: string;
  warning: string;
  refinement: string;
}

function buildDiagnostics(breakdown: ScoreBreakdown): DiagnosticItem[] {
  return [
    {
      key: 'cash',
      score: breakdown.cash,
      strength: 'O caixa preservado oferece margem para absorver ajustes e manter a operação estável.',
      warning: 'O caixa ficou pressionado; reveja decisões que consumiram reserva antes de validar a demanda.',
      refinement: 'Para elevar a saúde da operação, preserve ainda mais folga de caixa para os próximos ciclos.',
    },
    {
      key: 'reputation',
      score: breakdown.reputation,
      strength: 'A reputação avançou de forma consistente, reforçando confiança e percepção de profissionalismo.',
      warning: 'A confiança do cliente ainda precisa de mais consistência entre promessa, prazo e entrega.',
      refinement: 'Para elevar a saúde da operação, transforme a boa percepção em rotina de indicação e recorrência.',
    },
    {
      key: 'quality',
      score: breakdown.quality,
      strength: 'O padrão de qualidade sustentou a percepção de valor e reduziu a chance de retrabalho.',
      warning: 'A qualidade oscilou em escolhas importantes; priorize padrão antes de acelerar o volume.',
      refinement: 'Para elevar a saúde da operação, documente o padrão de execução e torne-o repetível.',
    },
    {
      key: 'capacity',
      score: breakdown.capacity,
      strength: 'A capacidade operacional ficou compatível com a demanda construída ao longo da fase.',
      warning: 'A capacidade não acompanhou o ritmo das decisões comerciais e pode gerar atrasos.',
      refinement: 'Para elevar a saúde da operação, aumente capacidade somente onde a demanda já estiver comprovada.',
    },
    {
      key: 'risk',
      score: breakdown.risk,
      strength: 'Os riscos operacionais ficaram bem controlados, preservando caixa, prazo e confiança.',
      warning: 'O risco terminou elevado; observe onde pressa, desconto ou improviso criaram custo oculto.',
      refinement: 'Para elevar a saúde da operação, mantenha o risco baixo mesmo ao buscar mais crescimento.',
    },
    {
      key: 'fatigue',
      score: breakdown.fatigue,
      strength: 'A carga de trabalho permaneceu sustentável e menos dependente de esforço excessivo.',
      warning: 'A rotina ficou pesada demais; busque processo, agenda e capacidade mais equilibrados.',
      refinement: 'Para elevar a saúde da operação, reduza a dependência do seu esforço pessoal com mais padronização.',
    },
  ];
}

function normalizeAgainstBenchmark(
  value: number,
  benchmark: { poor: number; excellent: number },
): number {
  const range = benchmark.excellent - benchmark.poor;
  if (Math.abs(range) <= 0.0001) return value >= benchmark.excellent ? 100 : 0;
  return clamp(((value - benchmark.poor) / range) * 100, 0, 100);
}

function enumerateSimulationPaths(config: AppConfig): SimulationState[] {
  const paths: SimulationState[] = [];
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
function hasValidMetrics(value: unknown): value is NumericMetrics {
  if (!isRecord(value)) return false;
  return metricKeys.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]));
}

function isScenarioSnapshot(value: unknown): value is AppConfig['scenario'] {
  if (!isRecord(value)) return false;
  return hasValidMetrics(value.initialMetrics) &&
    typeof value.durationDays === 'number' &&
    typeof value.currency === 'string' &&
    Array.isArray(value.decisions) &&
    value.decisions.length > 0 &&
    value.decisions.every(isStoredDecision) &&
    Array.isArray(value.equipment) &&
    Array.isArray(value.cars) &&
    Array.isArray(value.resultBands) &&
    value.resultBands.length > 0 &&
    isRecord(value.scoreWeights) &&
    isRecord(value.scoreBenchmarks);
}

function isStoredDecision(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.module === 'string' &&
    Array.isArray(value.choices) &&
    value.choices.length > 0 &&
    value.choices.every((choice) =>
      isRecord(choice) &&
      typeof choice.id === 'string' &&
      typeof choice.label === 'string' &&
      typeof choice.consequence === 'string' &&
      isRecord(choice.effects),
    );
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' &&
    typeof value.decisionId === 'string' &&
    typeof value.choiceId === 'string' &&
    typeof value.title === 'string' &&
    typeof value.consequence === 'string' &&
    hasValidMetrics(value.before) &&
    hasValidMetrics(value.after) &&
    isNumericMetricDelta(value.delta);
}

function isNumericMetricDelta(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.keys(value).every((key) =>
    metricKeys.includes(key as MetricKey) &&
    typeof value[key] === 'number' &&
    Number.isFinite(value[key]),
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false;
  return Object.keys(value).every((key) => typeof value[key] === 'string');
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}


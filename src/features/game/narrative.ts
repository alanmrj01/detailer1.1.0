import type { AppConfig, DecisionChoice, DecisionConfig, MetricKey } from '../../types/config';
import type { GameResult, GameRun, LedgerEntry } from '../../types/game';
import { formatCurrency } from '../../utils/format';
import { calculateScoreBreakdown } from './gameEngine';

const metricLabels: Record<MetricKey, string> = {
  cash: 'Caixa',
  reputation: 'Reputação',
  quality: 'Qualidade',
  capacity: 'Capacidade',
  risk: 'Risco',
  customers: 'Clientes',
  fatigue: 'Carga',
};

export function getMetricLabel(key: string): string {
  return metricLabels[key as MetricKey] ?? key;
}

export function getPrimaryServiceLabel(run: GameRun): string {
  const serviceChoice = run.choices['service-focus'];
  switch (serviceChoice) {
    case 'wash':
      return 'lavagem detalhada';
    case 'polish':
      return 'polimento comercial';
    case 'interior-service':
      return 'higienização interna';
    case 'balanced':
      return 'catálogo enxuto com pacote premium';
    default:
      return 'serviço de entrada';
  }
}

export function getOperationLabel(run: GameRun): string {
  const operationChoice = run.choices['operation-model'];
  switch (operationChoice) {
    case 'garage':
      return 'garagem adaptada';
    case 'store':
      return 'ponto comercial';
    case 'mobile':
      return 'atendimento delivery';
    default:
      return 'operação inicial';
  }
}

export function personalizeScenarioCopy(text: string, config: AppConfig): string {
  const withMoney = text.replace(/\{\{money:([-+]?\d+(?:\.\d+)?)\}\}/g, (_, rawValue: string) =>
    formatCurrency(Number(rawValue), config.scenario.currency),
  );
  const contextMap: Record<string, string> = {
    '{{durationDays}}': String(config.scenario.durationDays),
    '{{initialCash}}': String(config.scenario.initialMetrics.cash),
    '{{initialCashFormatted}}': formatCurrency(config.scenario.initialMetrics.cash, config.scenario.currency),
    '{{currency}}': config.scenario.currency,
    '{{currencyCode}}': config.scenario.currency,
  };

  return Object.entries(contextMap).reduce(
    (current, [token, value]) => current.replaceAll(token, value),
    withMoney,
  );
}

export function personalizeText(
  text: string,
  run: GameRun,
  config: AppConfig,
  vehicleId?: string,
): string {
  const primaryService = getPrimaryServiceLabel(run);
  const scenarioText = personalizeScenarioCopy(text, config);
  const operationModel = getOperationLabel(run);
  const vehicle = vehicleId
    ? config.scenario.cars.find((item) => item.id === vehicleId)
    : null;
  const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'veículo do cliente';
  const contextMap: Record<string, string> = {
    '{{primaryService}}': primaryService,
    '{{primaryServiceCap}}': capitalize(primaryService),
    '{{operationModel}}': operationModel,
    '{{vehicle}}': vehicleLabel,
    '{{vehicleModel}}': vehicle?.model ?? 'veículo',
  };

  return Object.entries(contextMap).reduce(
    (current, [token, value]) => current.replaceAll(token, value),
    scenarioText,
  );
}

export function personalizeDecision(decision: DecisionConfig, run: GameRun, config: AppConfig): DecisionConfig {
  return {
    ...decision,
    title: personalizeText(decision.title, run, config, decision.vehicleId),
    situation: personalizeText(decision.situation, run, config, decision.vehicleId),
    mentorTip: personalizeText(decision.mentorTip, run, config, decision.vehicleId),
    choices: decision.choices.map((choice) => personalizeChoice(choice, run, config, decision.vehicleId)),
  };
}

export function personalizeChoice(
  choice: DecisionChoice,
  run: GameRun,
  config: AppConfig,
  vehicleId?: string,
): DecisionChoice {
  return {
    ...choice,
    label: personalizeText(choice.label, run, config, vehicleId),
    description: personalizeText(choice.description, run, config, vehicleId),
    consequence: personalizeText(choice.consequence, run, config, vehicleId),
  };
}

export function describeChoiceImpact(
  effects: DecisionChoice['effects'],
): Array<{ key: string; label: string }> {
  return Object.entries(effects)
    .filter(([, value]) => value)
    .sort(([, left], [, right]) => Math.abs(right ?? 0) - Math.abs(left ?? 0))
    .slice(0, 2)
    .map(([key]) => ({
      key,
      label: getMetricLabel(key),
    }));
}

export function describeFeedback(delta: Partial<Record<MetricKey, number>>): Array<{ key: string; positive: boolean; title: string; description: string }> {
  return Object.entries(delta)
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const positive = key === 'risk' ? (value ?? 0) < 0 : (value ?? 0) > 0;
      const label = getMetricLabel(key);
      return {
        key,
        positive,
        title: positive ? `${label} em alta` : `${label} pressionado`,
        description: positive
          ? positiveCopy(key)
          : negativeCopy(key),
      };
    });
}

export function explainResultCard(
  kind: 'strengths' | 'alerts' | 'method',
  run: GameRun,
  config: AppConfig,
  result: GameResult,
): string[] {
  const relevantMetrics = kind === 'strengths'
    ? result.strengthMetricKeys
    : kind === 'alerts'
      ? result.alertMetricKeys
      : (['cash', 'reputation', 'quality', 'capacity', 'risk', 'fatigue'] as MetricKey[]);

  if (kind === 'alerts' && relevantMetrics.length === 0) {
    return ['Nenhuma decisão reduziu o diagnóstico final: a prioridade agora é manter o padrão alcançado.'];
  }

  const lines = run.ledger
    .map((entry) => ({ entry, score: scoreEntry(entry, kind, config, relevantMetrics) }))
    .filter((item) => item.score > 0.0001)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ entry }) => describeEntryInfluence(entry, kind, config, relevantMetrics));

  if (lines.length) return lines;

  if (kind === 'alerts') {
    return ['Este ponto de atenção veio do equilíbrio acumulado da rodada, sem uma única escolha negativa isolada.'];
  }
  if (kind === 'method') {
    return run.ledger.slice(-3).map((entry) => `${entry.title}: ${entry.consequence}`);
  }
  return ['A fortaleza foi construída pelo conjunto das decisões, sem depender de uma única escolha isolada.'];
}

function describeEntryInfluence(
  entry: LedgerEntry,
  kind: 'strengths' | 'alerts' | 'method',
  config: AppConfig,
  relevantMetrics: MetricKey[],
): string {
  if (kind === 'method') return `${entry.title}: ${entry.consequence}`;

  const before = calculateScoreBreakdown(entry.before, config);
  const after = calculateScoreBreakdown(entry.after, config);
  const influencedMetrics = relevantMetrics.filter((key) => {
    if (key === 'customers') return false;
    const delta = after[key] - before[key];
    return kind === 'strengths' ? delta > 0.0001 : delta < -0.0001;
  });
  const labels = influencedMetrics.map((key) => getMetricLabel(key));
  const joined = joinLabels(labels);

  if (kind === 'strengths') {
    return `${entry.title}: contribuiu positivamente para ${joined} no diagnóstico final.`;
  }
  return `${entry.title}: trouxe um trade-off em ${joined}, ponto que merece acompanhamento no resultado final.`;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? 'o equilíbrio da operação';
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

function scoreEntry(
  entry: LedgerEntry,
  kind: 'strengths' | 'alerts' | 'method',
  config: AppConfig,
  relevantMetrics: MetricKey[],
): number {
  const before = calculateScoreBreakdown(entry.before, config);
  const after = calculateScoreBreakdown(entry.after, config);
  const weights = config.scenario.scoreWeights;

  return relevantMetrics.reduce((total, key) => {
    if (key === 'customers') return total;
    const delta = after[key] - before[key];
    const weightedDelta = delta * weights[key];
    if (kind === 'strengths') return total + Math.max(0, weightedDelta);
    if (kind === 'alerts') return total + Math.max(0, -weightedDelta);
    return total + Math.abs(weightedDelta);
  }, 0);
}

function positiveCopy(metric: string): string {
  const map: Record<string, string> = {
    cash: 'Mais folga financeira.',
    reputation: 'Mais confiança do cliente.',
    quality: 'Entrega mais consistente.',
    capacity: 'Mais fôlego operacional.',
    risk: 'Menor chance de problema.',
    customers: 'Mais clientes no radar.',
    fatigue: 'Rotina mais leve.',
  };
  return map[metric] ?? 'Este indicador melhorou.';
}

function negativeCopy(metric: string): string {
  const map: Record<string, string> = {
    cash: 'Caixa mais pressionado.',
    reputation: 'Menos confiança do cliente.',
    quality: 'Queda no padrão da entrega.',
    capacity: 'Operação mais travada.',
    risk: 'Mais chance de problema.',
    customers: 'Menos tração comercial.',
    fatigue: 'Rotina mais pesada.',
  };
  return map[metric] ?? 'Este indicador piorou.';
}


export function summarizeConsequence(text: string): string {
  const cleaned = text.trim();
  const firstChunk = cleaned.split(/(?<=[.!?])\s|,\s|;\s/)[0]?.trim() ?? cleaned;
  if (firstChunk.length <= 92) return firstChunk;
  return `${firstChunk.slice(0, 89).trimEnd()}...`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

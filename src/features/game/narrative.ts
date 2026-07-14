import type { AppConfig, DecisionChoice, DecisionConfig, MetricKey } from '../../types/config';
import type { GameResult, GameRun, LedgerEntry } from '../../types/game';
import { formatCurrency } from '../../utils/format';
import { firstClause, lastItem, replaceAllText } from '../../utils/compat';
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
      return 'pacote combinado de lavagem e cuidados internos';
    default:
      return 'serviço de entrada';
  }
}

export function getPrimaryServiceWithArticle(run: GameRun): string {
  const serviceChoice = run.choices['service-focus'];
  switch (serviceChoice) {
    case 'wash':
      return 'uma lavagem detalhada';
    case 'polish':
      return 'um polimento comercial';
    case 'interior-service':
      return 'uma higienização interna';
    case 'balanced':
      return 'um pacote combinado de lavagem e cuidados internos';
    default:
      return 'um serviço de entrada';
  }
}

export function getComplaintContext(run: GameRun): string {
  const pressureChoice = run.choices['execution-pressure'];
  switch (pressureChoice) {
    case 'rush':
      return 'Depois de acelerar uma entrega para cumprir dois horários,';
    case 'renegotiate':
      return 'Após reorganizar os prazos da agenda,';
    case 'preserve-quality':
      return 'Dias depois, em outro atendimento,';
    default:
      return 'Em um atendimento recente,';
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
    (current, [token, value]) => replaceAllText(current, token, value),
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
  const primaryServiceWithArticle = getPrimaryServiceWithArticle(run);
  const complaintContext = getComplaintContext(run);
  const scenarioText = personalizeScenarioCopy(text, config);
  const operationModel = getOperationLabel(run);
  const vehicle = vehicleId
    ? config.scenario.cars.find((item) => item.id === vehicleId)
    : null;
  const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'veículo do cliente';
  const contextMap: Record<string, string> = {
    '{{primaryService}}': primaryService,
    '{{primaryServiceCap}}': capitalize(primaryService),
    '{{primaryServiceWithArticle}}': primaryServiceWithArticle,
    '{{complaintContext}}': complaintContext,
    '{{operationModel}}': operationModel,
    '{{vehicle}}': vehicleLabel,
    '{{vehicleModel}}': vehicle?.model ?? 'veículo',
  };

  return Object.entries(contextMap).reduce(
    (current, [token, value]) => replaceAllText(current, token, value),
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

export interface FeedbackItem {
  key: MetricKey;
  positive: boolean;
  title: string;
  description: string;
  deltaLabel: string;
  magnitude: number;
}

export function describeFeedback(
  delta: Partial<Record<MetricKey, number>>,
  currency = 'BRL',
): FeedbackItem[] {
  return Object.entries(delta)
    .filter(([, value]) => value)
    .map(([rawKey, rawValue]) => {
      const key = rawKey as MetricKey;
      const value = rawValue ?? 0;
      const positive = key === 'risk' || key === 'fatigue' ? value < 0 : value > 0;
      return {
        key,
        positive,
        title: positive ? positiveCopy(key) : negativeCopy(key),
        description: feedbackContext(key, positive),
        deltaLabel: formatFeedbackDelta(key, value, currency),
        magnitude: normalizedFeedbackMagnitude(key, value),
      };
    })
    .sort((left, right) => right.magnitude - left.magnitude);
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
  return `${labels.slice(0, -1).join(', ')} e ${lastItem(labels)}`;
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

function positiveCopy(metric: MetricKey): string {
  const map: Record<MetricKey, string> = {
    cash: 'Capital de giro ganhou fôlego',
    reputation: 'Confiança do cliente reforçada',
    quality: 'Padrão técnico mais consistente',
    capacity: 'Capacidade operacional ampliada',
    risk: 'Exposição operacional reduzida',
    customers: 'Demanda gerada',
    fatigue: 'Carga da rotina reduzida',
  };
  return map[metric];
}

function negativeCopy(metric: MetricKey): string {
  const map: Record<MetricKey, string> = {
    cash: 'Capital de giro pressionado',
    reputation: 'Confiança do cliente afetada',
    quality: 'Padrão técnico exposto',
    capacity: 'Capacidade operacional reduzida',
    risk: 'Exposição operacional maior',
    customers: 'Tração comercial reduzida',
    fatigue: 'Carga da rotina aumentou',
  };
  return map[metric];
}

function feedbackContext(metric: MetricKey, positive: boolean): string {
  const positiveMap: Record<MetricKey, string> = {
    cash: 'Mais margem para insumos, correções e imprevistos.',
    reputation: 'A promessa ficou mais alinhada à experiência entregue.',
    quality: 'O processo ficou mais próximo de um padrão repetível.',
    capacity: 'Há mais fôlego para atender sem comprimir o tempo de ciclo.',
    risk: 'Diminuiu a chance de atraso, retrabalho ou perda de margem.',
    customers: 'A ação criou novas oportunidades de agenda.',
    fatigue: 'A execução ficou menos dependente de esforço excessivo.',
  };
  const negativeMap: Record<MetricKey, string> = {
    cash: 'Sobrou menos margem para corrigir desvios ou absorver sazonalidade.',
    reputation: 'A percepção de segurança e profissionalismo ficou mais frágil.',
    quality: 'A variação de acabamento e retrabalho ficou mais provável.',
    capacity: 'A agenda pode crescer mais rápido que a entrega.',
    risk: 'A decisão aumentou a chance de atraso, falha ou custo oculto.',
    customers: 'A escolha gerou menos tração comercial no curto prazo.',
    fatigue: 'A operação ficou mais dependente do esforço do próprio detailer.',
  };
  return positive ? positiveMap[metric] : negativeMap[metric];
}

function formatFeedbackDelta(metric: MetricKey, value: number, currency: string): string {
  if (metric === 'cash') {
    const prefix = value > 0 ? '+' : '−';
    return `${prefix}${formatCurrency(Math.abs(value), currency)}`;
  }
  const rounded = Math.abs(value) % 1 === 0 ? Math.abs(value).toFixed(0) : Math.abs(value).toFixed(1);
  return `${value > 0 ? '+' : '−'}${rounded}`;
}

function normalizedFeedbackMagnitude(metric: MetricKey, value: number): number {
  if (metric === 'cash') return Math.abs(value) / 100;
  if (metric === 'customers') return Math.abs(value) * 2.5;
  return Math.abs(value);
}


export function summarizeConsequence(text: string): string {
  const cleaned = text.trim();
  const firstChunk = firstClause(cleaned) || cleaned;
  if (firstChunk.length <= 92) return firstChunk;
  return `${firstChunk.slice(0, 89).trimEnd()}...`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

import type { AppConfig, DecisionChoice, DecisionConfig, MetricKey } from '../../types/config';
import type { GameRun, LedgerEntry } from '../../types/game';

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

export function personalizeText(text: string, run: GameRun, config: AppConfig): string {
  const primaryService = getPrimaryServiceLabel(run);
  const operationModel = getOperationLabel(run);
  const contextMap: Record<string, string> = {
    '{{primaryService}}': primaryService,
    '{{primaryServiceCap}}': capitalize(primaryService),
    '{{operationModel}}': operationModel,
    '{{currency}}': config.scenario.currency,
  };

  return Object.entries(contextMap).reduce(
    (current, [token, value]) => current.replaceAll(token, value),
    text,
  );
}

export function personalizeDecision(decision: DecisionConfig, run: GameRun, config: AppConfig): DecisionConfig {
  return {
    ...decision,
    title: personalizeText(decision.title, run, config),
    situation: personalizeText(decision.situation, run, config),
    mentorTip: personalizeText(decision.mentorTip, run, config),
    choices: decision.choices.map((choice) => personalizeChoice(choice, run, config)),
  };
}

export function personalizeChoice(choice: DecisionChoice, run: GameRun, config: AppConfig): DecisionChoice {
  return {
    ...choice,
    label: personalizeText(choice.label, run, config),
    description: personalizeText(choice.description, run, config),
    consequence: personalizeText(choice.consequence, run, config),
  };
}

export function describeChoiceImpact(effects: DecisionChoice['effects']): Array<{ key: string; positive: boolean; label: string }> {
  return Object.entries(effects)
    .filter(([, value]) => value)
    .slice(0, 4)
    .map(([key, value]) => ({
      key,
      positive: key === 'risk' ? (value ?? 0) < 0 : (value ?? 0) > 0,
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

export function explainResultCard(kind: 'strengths' | 'alerts' | 'method', run: GameRun): string[] {
  const lines = run.ledger
    .map((entry) => ({ entry, score: scoreEntry(entry, kind) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ entry }) => `${entry.title}: ${entry.consequence}`);

  if (kind === 'method' && lines.length === 0) {
    return run.ledger.slice(-3).map((entry) => `${entry.title}: ${entry.consequence}`);
  }

  return lines;
}

function scoreEntry(entry: LedgerEntry, kind: 'strengths' | 'alerts' | 'method') {
  if (kind === 'method') {
    return Object.values(entry.delta).reduce((total, value) => total + Math.abs(value ?? 0), 0);
  }

  return Object.entries(entry.delta).reduce((total, [key, value]) => {
    const amount = value ?? 0;
    if (key === 'risk' || key === 'fatigue') {
      const benefit = amount < 0 ? Math.abs(amount) : 0;
      const penalty = amount > 0 ? amount : 0;
      return total + (kind === 'strengths' ? benefit : penalty);
    }
    const benefit = amount > 0 ? amount : 0;
    const penalty = amount < 0 ? Math.abs(amount) : 0;
    return total + (kind === 'strengths' ? benefit : penalty);
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

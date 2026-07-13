import type { AppConfig } from '../types/config';
import { DEFAULT_SCORE_BENCHMARKS } from '../data/scoringDefaults';
import { cloneValue } from './compat';

export function serializeConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

export function parseConfigJson(text: string): AppConfig {
  const parsed: unknown = JSON.parse(text);
  if (!isAppConfig(parsed)) {
    throw new Error('O arquivo não possui a estrutura esperada do Detailer Business.');
  }
  return migrateConfig(parsed);
}

export function downloadConfig(config: AppConfig): void {
  const blob = new Blob([serializeConfig(config)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = config.brand.appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'detailer-business';
  anchor.href = url;
  anchor.download = `${safeName}-config.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


export function migrateConfig(config: AppConfig): AppConfig {
  const migrated = cloneValue(config);

  if (migrated.version < 3) {
    const firstQuote = migrated.scenario.decisions.find((decision) => decision.id === 'first-quote');
    if (firstQuote) {
      firstQuote.vehicleId ??= 't-cross';
      firstQuote.situation = firstQuote.situation.replace('Volkswagen T-Cross', '{{vehicle}}');
    }

    const complaint = migrated.scenario.decisions.find((decision) => decision.id === 'customer-complaint');
    if (complaint) complaint.vehicleId ??= 'onix';
  }

  migrated.scenario.scoreBenchmarks ??= cloneValue(DEFAULT_SCORE_BENCHMARKS);

  if (migrated.version < 5) {
    migrateScenarioTokens(migrated);
    migrateDefaultDifficultyBands(migrated);
  }

  if (migrated.version < 6) {
    migrateNarrativeConsistency(migrated);
  }

  migrated.version = 6;
  return migrated;
}

function migrateScenarioTokens(config: AppConfig): void {
  const migrateText = (text: string) => {
    const withDuration = text.replace(/\b90 dias\b/gi, '{{durationDays}} dias');
    return withDuration.replace(/R\$\s*([\d.]+(?:,\d{1,2})?)/g, (_, rawValue: string) => {
      const value = Number(rawValue.replace(/\./g, '').replace(',', '.'));
      if (!Number.isFinite(value)) return `R$ ${rawValue}`;
      if (Math.abs(value - config.scenario.initialMetrics.cash) < 0.001) {
        return '{{initialCashFormatted}}';
      }
      return `{{money:${value}}}`;
    });
  };

  config.brand.tagline = migrateText(config.brand.tagline);
  config.brand.introTitle = migrateText(config.brand.introTitle);
  config.brand.introDescription = migrateText(config.brand.introDescription);
  config.brand.supportText = migrateText(config.brand.supportText);

  config.scenario.decisions.forEach((decision) => {
    decision.title = migrateText(decision.title);
    decision.situation = migrateText(decision.situation);
    decision.mentorTip = migrateText(decision.mentorTip);
    decision.choices.forEach((choice) => {
      choice.label = migrateText(choice.label);
      choice.description = migrateText(choice.description);
      choice.consequence = migrateText(choice.consequence);
    });
  });
}

function migrateDefaultDifficultyBands(config: AppConfig): void {
  const oldRanges = [[0, 44], [45, 64], [65, 79], [80, 100]];
  const isOriginalDistribution = config.scenario.resultBands.length === oldRanges.length &&
    config.scenario.resultBands.every((band, index) =>
      band.minScore === oldRanges[index][0] && band.maxScore === oldRanges[index][1],
    );
  if (!isOriginalDistribution) return;

  const newRanges = [[0, 54], [55, 69], [70, 84], [85, 100]];
  config.scenario.resultBands.forEach((band, index) => {
    band.minScore = newRanges[index][0];
    band.maxScore = newRanges[index][1];
  });
}

export function migrateNarrativeConsistency(config: AppConfig): void {
  const replacements: Record<string, string> = {
    'Chegou o primeiro orçamento de {{primaryService}}': 'Chegou o primeiro orçamento para {{primaryService}}',
    'Um cliente com {{vehicle}} quer contratar sua {{primaryService}}. Ele está comparando orçamentos e quer perceber segurança, clareza e valor na sua proposta.':
      'Um cliente com {{vehicle}} quer contratar {{primaryServiceWithArticle}}. Ele está comparando orçamentos e quer perceber segurança, clareza e valor na sua proposta.',
    'Os valores desta etapa podem ser ajustados pelo criador. O objetivo é mostrar como o preço da {{primaryService}} altera margem, demanda e risco.':
      'Os valores desta etapa podem ser ajustados pelo criador. O objetivo é mostrar como o preço escolhido para {{primaryService}} altera margem, demanda e risco.',
    'A {{primaryService}} atrasou e o próximo cliente já chegou': 'O serviço se estendeu e o próximo cliente já chegou',
    'O carro atual exigiu mais trabalho que o previsto. Atrasar, correr ou renegociar muda a experiência do cliente e a segurança da entrega.':
      'Durante a execução de {{primaryService}}, o carro atual exigiu mais trabalho que o previsto. Correr, manter o padrão ou renegociar o prazo muda a experiência do cliente e a segurança da entrega.',
    'Um cliente voltou após a {{primaryService}}': 'Um cliente voltou após o serviço',
    'O cliente do {{vehicle}} percebeu uma área abaixo do padrão combinado na sua {{primaryService}}. A solução precisa equilibrar responsabilidade, reputação e custo.':
      '{{complaintContext}} o cliente do {{vehicle}} percebeu uma área abaixo do padrão combinado na entrega de {{primaryService}}. A solução precisa equilibrar responsabilidade, reputação e custo.',
    'O cliente do {{vehicle}} percebeu uma área abaixo do padrão combinado na entrega de {{primaryService}}. A solução precisa equilibrar responsabilidade, reputação e custo.':
      '{{complaintContext}} o cliente do {{vehicle}} percebeu uma área abaixo do padrão combinado na entrega de {{primaryService}}. A solução precisa equilibrar responsabilidade, reputação e custo.',
  };

  const replaceIfOriginal = (text: string) => replacements[text] ?? text;
  config.scenario.decisions.forEach((decision) => {
    decision.title = replaceIfOriginal(decision.title);
    decision.situation = replaceIfOriginal(decision.situation);
    decision.mentorTip = replaceIfOriginal(decision.mentorTip);
  });
}

function isAppConfig(value: unknown): value is AppConfig {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'number') return false;
  if (!isRecord(value.brand) || !isRecord(value.security) || !isRecord(value.scenario)) return false;
  if (typeof value.brand.appName !== 'string' || typeof value.brand.accentColor !== 'string') return false;
  if (typeof value.security.creatorPin !== 'string') return false;
  if (!isRecord(value.scenario.initialMetrics)) return false;
  if (!Array.isArray(value.scenario.decisions)) return false;
  if (!Array.isArray(value.scenario.equipment)) return false;
  if (!Array.isArray(value.scenario.cars)) return false;
  if (!Array.isArray(value.scenario.resultBands)) return false;
  if (!isRecord(value.scenario.scoreWeights)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

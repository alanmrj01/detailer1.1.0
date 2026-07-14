import type { AppConfig } from '../types/config';
import { DEFAULT_SCORE_BENCHMARKS } from '../data/scoringDefaults';
import { defaultConfig } from '../data/defaultConfig';
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

  if (migrated.version < 7) {
    migrateEducationalCalibration(migrated);
  }

  migrated.version = 7;
  return migrated;
}


const LEGACY_V6_BENCHMARKS = {
  cashReserveRatio: { poor: 0.15, excellent: 0.9 },
  reputation: { poor: 5, excellent: 50 },
  quality: { poor: 15, excellent: 55 },
  capacity: { poor: 3, excellent: 13 },
  risk: { poor: 70, excellent: 0 },
  fatigue: { poor: 50, excellent: 8 },
};

const LEGACY_V6_EFFECTS: Record<string, Record<string, number>> = {
  'operation-model/garage': { cash: -450, reputation: 3, capacity: 1, risk: -7, fatigue: 2 },
  'operation-model/store': { cash: -1800, reputation: 10, capacity: 3, risk: 12, fatigue: 3 },
  'operation-model/mobile': { cash: -950, reputation: 4, capacity: 2, risk: 3, fatigue: 7 },
  'equipment-plan/essential': { quality: 5, capacity: 3, risk: -4 },
  'equipment-plan/polishing': { quality: 14, capacity: 1, risk: 3, fatigue: 2 },
  'equipment-plan/interior': { quality: 10, capacity: 2, risk: 1, fatigue: 2 },
  'equipment-plan/complete': { quality: 18, capacity: 5, risk: 10, fatigue: 4 },
  'service-focus/wash': { capacity: 4, quality: -2, customers: 4, reputation: 2, risk: -2, fatigue: 2 },
  'service-focus/polish': { customers: 1, reputation: 5, quality: 8, capacity: -1, risk: 4, fatigue: 4 },
  'service-focus/interior-service': { customers: 2, reputation: 4, quality: 6, capacity: 1, risk: 2, fatigue: 3 },
  'service-focus/balanced': { customers: 3, reputation: 4, quality: 4, capacity: 1, risk: 5, fatigue: 3 },
  'first-quote/low': { cash: 290, customers: 4, reputation: 2, quality: -2, fatigue: 6, risk: 7 },
  'first-quote/balanced-price': { cash: 520, customers: 2, reputation: 5, quality: 2, fatigue: 3, risk: -1 },
  'first-quote/premium-price': { cash: 720, customers: 1, reputation: 4, quality: 5, fatigue: 4, risk: 5 },
  'slow-week/discount-blast': { cash: 180, customers: 3, reputation: -1, quality: -1, fatigue: 2, risk: 4 },
  'slow-week/local-partnership': { cash: -90, customers: 2, reputation: 5, quality: 1, risk: -2 },
  'slow-week/content-routine': { cash: -60, customers: 2, reputation: 4, quality: 2, risk: -1, fatigue: 1 },
  'execution-pressure/preserve-quality': { cash: -80, reputation: 6, quality: 5, fatigue: 4, risk: -6 },
  'execution-pressure/rush': { reputation: -6, quality: -7, capacity: 2, fatigue: 7, risk: 9 },
  'execution-pressure/renegotiate': { cash: -40, reputation: 3, quality: 2, fatigue: -1, risk: -2 },
  'customer-complaint/redo': { cash: -180, reputation: 8, quality: 5, fatigue: 5, risk: -7 },
  'customer-complaint/partial-refund': { cash: -120, reputation: 2, quality: -1, risk: -2 },
  'customer-complaint/contest': { reputation: -10, quality: -2, risk: 12, fatigue: 2 },
  'growth-choice/marketing': { cash: -450, customers: 5, reputation: 3, capacity: -1, risk: 4 },
  'growth-choice/reserve': { customers: 1, risk: -8, fatigue: -1 },
  'growth-choice/training': { cash: -600, quality: 8, capacity: 2, risk: -6, reputation: 2 },
  'growth-choice/helper': { cash: -900, capacity: 5, fatigue: -8, risk: 5, reputation: 2 },
};

const LEGACY_V6_DECISION_TEXT: Record<string, Partial<Record<'situation' | 'mentorTip', string>>> = {
  'operation-model': {
    situation: 'Você tem pouco capital e precisa escolher uma estrutura compatível com sua capacidade de atrair clientes nos primeiros {{durationDays}} dias.',
    mentorTip: 'Estrutura maior aumenta percepção e capacidade, mas também eleva o risco antes da demanda estar comprovada.',
  },
  'equipment-plan': {
    situation: 'Os valores são calculados automaticamente pela média das fontes cadastradas em Configurações. O sistema bloqueia escolhas que deixariam o caixa abaixo da reserva mínima.',
    mentorTip: 'Comprar tudo cedo demais pode deixar uma boa operação sem capital de giro. O melhor conjunto depende do serviço que será vendido primeiro.',
  },
  'service-focus': {
    situation: 'Seu catálogo precisa caber na estrutura e nos equipamentos que você comprou. Opções incompatíveis ficam indisponíveis.',
    mentorTip: 'Catálogo curto facilita padronização, comunicação e controle de tempo. Variedade não significa necessariamente maior lucro.',
  },
  'first-quote': {
    situation: 'Um cliente com {{vehicle}} quer contratar {{primaryServiceWithArticle}}. Ele está comparando orçamentos e quer perceber segurança, clareza e valor na sua proposta.',
    mentorTip: 'Os valores desta etapa podem ser ajustados pelo criador. O objetivo é mostrar como o preço escolhido para {{primaryService}} altera margem, demanda e risco.',
  },
  'slow-week': {
    mentorTip: 'Quando a demanda cai, a resposta precisa gerar tração sem comprometer posicionamento e caixa.',
  },
  'execution-pressure': {
    situation: 'Durante a execução de {{primaryService}}, o carro atual exigiu mais trabalho que o previsto. Correr, manter o padrão ou renegociar o prazo muda a experiência do cliente e a segurança da entrega.',
    mentorTip: 'Capacidade real é limitada pelo processo. Aceitar mais serviços do que a operação suporta transforma faturamento aparente em retrabalho.',
  },
  'customer-complaint': {
    mentorTip: 'O objetivo não é agradar a qualquer custo, mas ter um processo claro para verificar, corrigir e registrar falhas.',
  },
  'growth-choice': {
    situation: 'A operação já possui histórico. Agora você precisa escolher entre acelerar aquisição, fortalecer processo, contratar ajuda ou proteger capital de giro.',
    mentorTip: 'Crescimento sustentável exige que demanda, capacidade e padrão avancem juntos.',
  },
};

const LEGACY_V6_CONSEQUENCES: Record<string, string> = {
  'operation-model/garage': 'Você preserva caixa e reduz pressão, mas terá capacidade e presença visual limitadas.',
  'operation-model/store': 'A operação ganha aparência profissional, porém começa pressionada por custo fixo e necessidade de volume.',
  'operation-model/mobile': 'A mobilidade amplia alcance, mas deslocamento e condições do local diminuem previsibilidade.',
  'equipment-plan/essential': 'Você ganha produtividade nos serviços de entrada e preserva caixa para validar demanda.',
  'equipment-plan/polishing': 'Você abre espaço para ticket maior, mas depende de domínio técnico e possui menor volume inicial.',
  'equipment-plan/interior': 'Você cria um serviço percebido como especializado sem imobilizar tanto capital quanto um conjunto completo.',
  'equipment-plan/complete': 'A variedade aumenta, mas o caixa fica vulnerável antes de haver clientes recorrentes.',
  'service-focus/wash': 'Você aumenta volume e velocidade, porém precisa controlar preço e qualidade para não competir apenas por desconto.',
  'service-focus/polish': 'A reputação técnica cresce, mas o volume é menor e falhas de acabamento possuem impacto elevado.',
  'service-focus/interior-service': 'Você cria valor claro para o cliente, mas precisa controlar tempo de secagem, consumo e expectativa.',
  'service-focus/balanced': 'O catálogo atrai perfis diferentes, porém aumenta treinamento, estoque e risco de prometer mais do que consegue entregar.',
  'first-quote/balanced-price': 'Você equilibra fechamento, margem e capacidade de entregar o que prometeu.',
  'first-quote/premium-price': 'A margem cresce, mas a exigência de acabamento e comunicação também aumenta.',
  'slow-week/local-partnership': 'A aquisição é mais lenta, porém chega com confiança e chance maior de recorrência.',
  'slow-week/content-routine': 'A construção é mais consistente e fortalece posicionamento, mesmo sem pico imediato de demanda.',
  'execution-pressure/preserve-quality': 'Você protege o padrão, mas assume desgaste e pequeno custo operacional.',
  'execution-pressure/rush': 'A capacidade aparente sobe, porém a chance de defeito e reclamação aumenta muito.',
  'execution-pressure/renegotiate': 'A comunicação preserva confiança e reduz pressão, embora nem todo cliente aceite bem.',
  'customer-complaint/redo': 'O caixa sofre no curto prazo, mas sua postura recupera confiança e melhora o processo.',
  'customer-complaint/partial-refund': 'Você reduz conflito, mas pode deixar a causa técnica sem tratamento.',
  'growth-choice/marketing': 'Mais pessoas chegam, mas a operação sente pressão se ainda não estiver padronizada.',
  'growth-choice/reserve': 'O crescimento é mais lento, porém a operação ganha estabilidade para enfrentar oscilações.',
  'growth-choice/training': 'Você reduz falhas e melhora produtividade, mas adia parte da expansão comercial.',
  'growth-choice/helper': 'A capacidade cresce, mas supervisão, custo e padronização viram novas responsabilidades.',
};

function migrateEducationalCalibration(config: AppConfig): void {
  if (sameObject(config.scenario.scoreBenchmarks, LEGACY_V6_BENCHMARKS)) {
    config.scenario.scoreBenchmarks = cloneValue(DEFAULT_SCORE_BENCHMARKS);
  }

  const legacyBands = [[0, 54], [55, 69], [70, 84], [85, 100]];
  const newBands = [[0, 59], [60, 74], [75, 89], [90, 100]];
  if (config.scenario.resultBands.length === legacyBands.length && config.scenario.resultBands.every((band, index) =>
    band.minScore === legacyBands[index][0] && band.maxScore === legacyBands[index][1]
  )) {
    config.scenario.resultBands.forEach((band, index) => {
      band.minScore = newBands[index][0];
      band.maxScore = newBands[index][1];
    });
  }

  config.scenario.decisions.forEach((decision) => {
    const targetDecision = defaultConfig.scenario.decisions.find((item) => item.id === decision.id);
    if (!targetDecision) return;

    const legacyText = LEGACY_V6_DECISION_TEXT[decision.id];
    if (legacyText?.situation && decision.situation === legacyText.situation) decision.situation = targetDecision.situation;
    if (legacyText?.mentorTip && decision.mentorTip === legacyText.mentorTip) decision.mentorTip = targetDecision.mentorTip;

    decision.choices.forEach((choice) => {
      const key = `${decision.id}/${choice.id}`;
      const targetChoice = targetDecision.choices.find((item) => item.id === choice.id);
      if (!targetChoice) return;
      if (LEGACY_V6_EFFECTS[key] && sameObject(choice.effects, LEGACY_V6_EFFECTS[key])) {
        choice.effects = cloneValue(targetChoice.effects);
      }
      if (LEGACY_V6_CONSEQUENCES[key] && choice.consequence === LEGACY_V6_CONSEQUENCES[key]) {
        choice.consequence = targetChoice.consequence;
      }
    });
  });
}

function sameObject(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
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

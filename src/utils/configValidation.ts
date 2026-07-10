import type { AppConfig } from '../types/config';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

export function validateConfig(config: AppConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const decisionIds = new Set<string>();
  const equipmentIds = new Set(config.scenario.equipment.map((item) => item.id));

  if (!config.brand.appName.trim()) {
    issues.push({ level: 'error', message: 'O nome do aplicativo não pode ficar vazio.' });
  }

  if (!/^#[0-9a-f]{6}$/i.test(config.brand.accentColor)) {
    issues.push({ level: 'error', message: 'A cor de destaque precisa estar no formato hexadecimal #RRGGBB.' });
  }

  if (!/^\d{4,12}$/.test(config.security.creatorPin)) {
    issues.push({ level: 'warning', message: 'Use um PIN numérico entre 4 e 12 dígitos.' });
  }

  config.scenario.equipment.forEach((item) => {
    if (item.price <= 0) {
      issues.push({ level: 'error', message: `${item.shortName}: o preço precisa ser maior que zero.` });
    }
    if (item.sources.length < 6) {
      issues.push({ level: 'warning', message: `${item.shortName}: existem menos de seis fontes de preço cadastradas.` });
    }
    if (item.sources.length) {
      const average = item.sources.reduce((total, source) => total + source.price, 0) / item.sources.length;
      if (Math.abs(average - item.price) > 0.02) {
        issues.push({ level: 'warning', message: `${item.shortName}: o preço usado não corresponde à média atual das fontes.` });
      }
    }
  });

  const weightTotal = Object.values(config.scenario.scoreWeights).reduce((total, value) => total + value, 0);
  if (Math.abs(weightTotal - 1) > 0.001) {
    issues.push({ level: 'warning', message: `Os pesos do resultado somam ${weightTotal.toFixed(2)}; o recomendado é 1,00.` });
  }

  config.scenario.decisions.forEach((decision) => {
    if (decisionIds.has(decision.id)) {
      issues.push({ level: 'error', message: `ID de decisão duplicado: ${decision.id}.` });
    }
    decisionIds.add(decision.id);
    const choiceIds = new Set<string>();

    if (decision.choices.length < 2) {
      issues.push({ level: 'warning', message: `${decision.title}: cadastre ao menos duas escolhas.` });
    }

    decision.choices.forEach((choice) => {
      if (choiceIds.has(choice.id)) {
        issues.push({ level: 'error', message: `${decision.title}: ID de escolha duplicado (${choice.id}).` });
      }
      choiceIds.add(choice.id);
      choice.costEquipmentIds?.forEach((equipmentId) => {
        if (!equipmentIds.has(equipmentId)) {
          issues.push({ level: 'error', message: `${choice.label}: equipamento inexistente (${equipmentId}).` });
        }
      });
    });
  });

  const orderedBands = [...config.scenario.resultBands].sort((a, b) => a.minScore - b.minScore);
  if (!orderedBands.length || orderedBands[0].minScore !== 0 || orderedBands.at(-1)?.maxScore !== 100) {
    issues.push({ level: 'warning', message: 'As faixas de resultado devem cobrir a pontuação de 0 a 100.' });
  }
  orderedBands.forEach((band, index) => {
    const next = orderedBands[index + 1];
    if (next && next.minScore !== band.maxScore + 1) {
      issues.push({ level: 'warning', message: `Há lacuna ou sobreposição entre as faixas ${band.title} e ${next.title}.` });
    }
  });

  return issues;
}

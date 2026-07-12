import type { AppConfig } from '../types/config';
import { analyzeGameBalance } from '../features/game/gameEngine';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

export function validateConfig(config: AppConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const decisionIds = new Set<string>();
  const equipmentIds = new Set(config.scenario.equipment.map((item) => item.id));
  const vehicleIds = new Set<string>();

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

  config.scenario.cars.forEach((car) => {
    if (vehicleIds.has(car.id)) {
      issues.push({ level: 'error', message: `ID de veículo duplicado: ${car.id}.` });
    }
    vehicleIds.add(car.id);
    if (!car.brand.trim() || !car.model.trim()) {
      issues.push({ level: 'error', message: `${car.id}: marca e modelo do veículo são obrigatórios.` });
    }
    if (car.sizeFactor <= 0 || car.soilFactor <= 0) {
      issues.push({ level: 'error', message: `${car.brand} ${car.model}: os fatores de tamanho e sujeira precisam ser maiores que zero.` });
    }
  });

  const weightTotal = Object.values(config.scenario.scoreWeights).reduce((total, value) => total + value, 0);
  if (Math.abs(weightTotal - 1) > 0.001) {
    issues.push({ level: 'warning', message: `Os pesos do resultado somam ${weightTotal.toFixed(2)}; o recomendado é 1,00.` });
  }

  Object.entries(config.scenario.scoreBenchmarks).forEach(([key, benchmark]) => {
    if (!Number.isFinite(benchmark.poor) || !Number.isFinite(benchmark.excellent)) {
      issues.push({ level: 'error', message: `A régua absoluta de ${key} contém um valor inválido.` });
      return;
    }
    if (Math.abs(benchmark.excellent - benchmark.poor) <= 0.0001) {
      issues.push({ level: 'error', message: `A régua absoluta de ${key} precisa ter patamares frágil e excelente diferentes.` });
    }
  });
  const cashBenchmark = config.scenario.scoreBenchmarks.cashReserveRatio;
  if (cashBenchmark.poor < 0 || cashBenchmark.excellent < 0) {
    issues.push({ level: 'error', message: 'Os patamares de reserva de caixa não podem ser negativos.' });
  }

  config.scenario.decisions.forEach((decision) => {
    if (decisionIds.has(decision.id)) {
      issues.push({ level: 'error', message: `ID de decisão duplicado: ${decision.id}.` });
    }
    decisionIds.add(decision.id);
    const choiceIds = new Set<string>();

    if (decision.vehicleId && !vehicleIds.has(decision.vehicleId)) {
      issues.push({ level: 'error', message: `${decision.title}: o veículo configurado (${decision.vehicleId}) não existe.` });
    }

    if (decision.choices.length < 2) {
      issues.push({ level: 'warning', message: `${decision.title}: cadastre ao menos duas escolhas.` });
    }

    const recommendedCount = decision.choices.filter((choice) => choice.recommended).length;
    if (recommendedCount !== 1) {
      issues.push({
        level: 'warning',
        message: `${decision.title}: defina exatamente uma escolha recomendada para calibrar o caminho do método.`,
      });
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

  if (!issues.some((issue) => issue.level === 'error')) {
    try {
      const balance = analyzeGameBalance(config);
      if (!balance.totalPaths) {
        issues.push({ level: 'error', message: 'Nenhum caminho completo está disponível com as regras atuais.' });
      }
      orderedBands.forEach((band) => {
        if (!balance.reachableBandIds.includes(band.id)) {
          issues.push({ level: 'warning', message: `A faixa “${band.title}” não é alcançável por nenhum caminho válido.` });
        }
      });
      if (balance.recommendedStars === null) {
        issues.push({ level: 'warning', message: 'O caminho recomendado está incompleto ou contém uma escolha indisponível.' });
      } else if (balance.recommendedStars < 4.3 || balance.recommendedStars > 4.7) {
        issues.push({
          level: 'warning',
          message: `O caminho recomendado termina com ${balance.recommendedStars.toFixed(1)} estrelas; a referência pedagógica é aproximadamente 4,5.`,
        });
      }
    } catch {
      issues.push({ level: 'error', message: 'Não foi possível analisar todos os caminhos com a configuração atual.' });
    }
  }

  return issues;
}

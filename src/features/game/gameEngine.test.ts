import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../data/defaultConfig';
import {
  analyzeGameBalance,
  applyChoice,
  calculateResult,
  calculateScoreFromMetrics,
  calculateStepStarChange,
  choiceAvailability,
  createRun,
  enumerateValidGamePaths,
  equipmentCost,
  resolveRunConfig,
} from './gameEngine';
import { explainResultCard } from './narrative';

describe('gameEngine', () => {
  it('calcula o custo de equipamentos diretamente pelo catálogo configurável', () => {
    const decision = defaultConfig.scenario.decisions.find((item) => item.id === 'equipment-plan')!;
    const choice = decision.choices.find((item) => item.id === 'essential')!;
    const expected = defaultConfig.scenario.equipment
      .filter((item) => choice.costEquipmentIds?.includes(item.id))
      .reduce((total, item) => total + item.price, 0);

    expect(equipmentCost(choice, defaultConfig)).toBeCloseTo(expected, 2);
  });

  it('bloqueia uma compra quando a reserva mínima não pode ser preservada', () => {
    const run = createRun(defaultConfig);
    run.metrics.cash = 1000;
    const decision = defaultConfig.scenario.decisions[1];
    const choice = decision.choices[3];
    const availability = choiceAvailability(choice, run, defaultConfig, decision.id);

    expect(availability.available).toBe(false);
    expect(availability.reason).toContain('reserva mínima');
  });

  it('respeita requisitos de equipamento para serviços', () => {
    const run = createRun(defaultConfig);
    const decision = defaultConfig.scenario.decisions[2];
    const polish = decision.choices.find((item) => item.id === 'polish')!;

    expect(choiceAvailability(polish, run, defaultConfig, decision.id).available).toBe(false);
    run.flags.push('eq_polisher');
    expect(choiceAvailability(polish, run, defaultConfig, decision.id).available).toBe(true);
  });

  it('mantém indicadores percentuais dentro de 0 e 100', () => {
    const run = createRun(defaultConfig);
    run.metrics.reputation = 99;
    const choice = defaultConfig.scenario.decisions[0].choices[1];
    const next = applyChoice(run, 'operation-model', choice, defaultConfig);

    expect(next.metrics.reputation).toBe(100);
    expect(next.metrics.risk).toBeLessThanOrEqual(100);
  });

  it('conclui um caminho completo com pontuação válida', () => {
    let run = createRun(defaultConfig);
    const selectedIds = ['garage', 'essential', 'wash', 'balanced-price', 'content-routine', 'preserve-quality', 'redo', 'reserve'];

    defaultConfig.scenario.decisions.forEach((decision, index) => {
      const choice = decision.choices.find((item) => item.id === selectedIds[index])!;
      run = applyChoice(run, decision.id, choice, defaultConfig);
    });

    const result = calculateResult(run, defaultConfig);
    expect(run.completedAt).toBeTruthy();
    expect(run.currentDecisionIndex).toBe(defaultConfig.scenario.decisions.length);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('mantém pelo menos seis fontes para cada equipamento padrão', () => {
    defaultConfig.scenario.equipment.forEach((item) => {
      expect(item.sources.length).toBeGreaterThanOrEqual(6);
      expect(item.price).toBeCloseTo(
        item.sources.reduce((total, source) => total + source.price, 0) / item.sources.length,
        2,
      );
    });
  });

  it('testa automaticamente todos os 12.636 caminhos válidos do jogo', () => {
    const paths = enumerateValidGamePaths(defaultConfig);

    expect(paths).toHaveLength(12636);
    paths.forEach((path) => {
      expect(path.choiceIds).toHaveLength(defaultConfig.scenario.decisions.length);
      expect(path.score).toBeGreaterThanOrEqual(0);
      expect(path.score).toBeLessThanOrEqual(100);
      expect(path.stars).toBeGreaterThanOrEqual(0);
      expect(path.stars).toBeLessThanOrEqual(5);
    });
  });

  it('mantém todas as faixas de resultado alcançáveis com régua absoluta', () => {
    const balance = analyzeGameBalance(defaultConfig);

    expect(balance.minScore).toBe(38);
    expect(balance.maxScore).toBe(92);
    defaultConfig.scenario.resultBands.forEach((band) => {
      expect(balance.reachableBandIds).toContain(band.id);
      expect(balance.bandCounts[band.id]).toBeGreaterThan(0);
    });
    expect(balance.bandCounts).toEqual({
      fragile: 1060,
      promising: 6213,
      sustainable: 5079,
      excellent: 284,
    });
    expect(balance.bandCounts.sustainable / balance.totalPaths).toBeLessThan(0.5);
  });

  it('mantém a nota de uma mesma operação independente dos demais caminhos', () => {
    const metrics = {
      cash: 4200,
      reputation: 42,
      quality: 50,
      capacity: 11,
      risk: 18,
      customers: 8,
      fatigue: 24,
    };
    const alteredConfig = structuredClone(defaultConfig);
    alteredConfig.scenario.decisions[0].choices[0].effects = {
      cash: -5000,
      reputation: -50,
      quality: -50,
      risk: 90,
    };
    alteredConfig.scenario.decisions.at(-1)!.choices.push({
      id: 'extra-path-for-test',
      label: 'Caminho adicional',
      description: 'Caminho criado apenas para provar que a régua não muda.',
      consequence: 'Não altera a nota da operação usada no teste.',
      effects: { cash: 9000, reputation: 80, quality: 80, capacity: 30, risk: -80, fatigue: -20 },
    });

    expect(calculateScoreFromMetrics(metrics, alteredConfig)).toBe(
      calculateScoreFromMetrics(metrics, defaultConfig),
    );
  });

  it('faz o caminho recomendado terminar próximo de 4,5 estrelas', () => {
    const balance = analyzeGameBalance(defaultConfig);

    expect(balance.recommendedChoiceIds).toHaveLength(defaultConfig.scenario.decisions.length);
    expect(balance.recommendedStars).not.toBeNull();
    expect(balance.recommendedStars).toBe(4.5);
  });

  it('mantém o diagnóstico do caminho recomendado coerente com 4,5 estrelas', () => {
    let run = createRun(defaultConfig);
    defaultConfig.scenario.decisions.forEach((decision) => {
      const choice = decision.choices.find((item) => item.recommended)!;
      run = applyChoice(run, decision.id, choice, defaultConfig);
    });

    const result = calculateResult(run, defaultConfig);
    expect(result.stars).toBe(4.5);
    expect(result.strengths.length).toBeGreaterThanOrEqual(3);
    expect(result.alerts.length).toBeGreaterThanOrEqual(1);
    result.alerts.forEach((message) => {
      expect(message).toMatch(/^Para se aproximar de 5 estrelas,/);
    });
  });

  it('mantém a configuração da rodada imutável mesmo após alterações no painel', () => {
    const run = createRun(defaultConfig);
    const editedConfig = structuredClone(defaultConfig);
    editedConfig.scenario.initialMetrics.cash = 12000;
    editedConfig.scenario.decisions[0].choices[0].effects.cash = -5000;

    const runConfig = resolveRunConfig(run, editedConfig);
    expect(runConfig.scenario.initialMetrics.cash).toBe(6000);
    expect(runConfig.scenario.decisions[0].choices[0].effects.cash).toBe(-450);
    expect(runConfig.scenario).toEqual(run.scenarioSnapshot);
  });

  it('comunica perda de classificação quando uma decisão reduz a nota', () => {
    let run = createRun(defaultConfig);
    const selectedIds = ['garage', 'essential', 'wash', 'balanced-price', 'content-routine', 'preserve-quality'];
    selectedIds.forEach((choiceId, index) => {
      const decision = defaultConfig.scenario.decisions[index];
      const choice = decision.choices.find((item) => item.id === choiceId)!;
      run = applyChoice(run, decision.id, choice, defaultConfig);
    });

    const complaint = defaultConfig.scenario.decisions.find((item) => item.id === 'customer-complaint')!;
    const contest = complaint.choices.find((item) => item.id === 'contest')!;
    const next = applyChoice(run, complaint.id, contest, defaultConfig);
    expect(calculateStepStarChange(run.metrics, next.metrics, defaultConfig)).toBeLessThan(0);
  });

  it('usa nos detalhes das atenções os mesmos indicadores do diagnóstico principal', () => {
    let run = createRun(defaultConfig);
    defaultConfig.scenario.decisions.forEach((decision) => {
      run = applyChoice(run, decision.id, decision.choices.find((choice) => choice.recommended)!, defaultConfig);
    });
    const result = calculateResult(run, defaultConfig);
    const details = explainResultCard('alerts', run, defaultConfig, result);

    expect(result.alertMetricKeys).toEqual(['fatigue']);
    expect(details.length).toBeGreaterThan(0);
    details.forEach((line) => expect(line).toMatch(/trade-off em Carga|equilíbrio acumulado/));
  });

  it('não orienta a se aproximar de cinco estrelas quando a nota já é máxima', () => {
    const run = createRun(defaultConfig);
    run.metrics = {
      cash: 5400,
      reputation: 50,
      quality: 55,
      capacity: 13,
      risk: 0,
      customers: 10,
      fatigue: 8,
    };
    const result = calculateResult(run, defaultConfig);

    expect(result.stars).toBe(5);
    expect(result.alertMetricKeys).toEqual([]);
    expect(result.alerts.join(' ')).toMatch(/atingiu 5 estrelas/i);
    expect(result.alerts.join(' ')).not.toMatch(/se aproximar de 5 estrelas/i);
  });

  it('usa fatores do veículo para ajustar esforço e risco da situação vinculada', () => {
    const regularConfig = structuredClone(defaultConfig);
    const demandingConfig = structuredClone(defaultConfig);
    const demandingVehicle = demandingConfig.scenario.cars.find((car) => car.id === 't-cross')!;
    demandingVehicle.sizeFactor = 1.5;
    demandingVehicle.soilFactor = 1.4;

    const regularRun = createRun(regularConfig);
    const demandingRun = createRun(demandingConfig);
    const decision = regularConfig.scenario.decisions.find((item) => item.id === 'first-quote')!;
    const choice = decision.choices.find((item) => item.id === 'low')!;

    const regularResult = applyChoice(regularRun, decision.id, choice, regularConfig);
    const demandingResult = applyChoice(demandingRun, decision.id, choice, demandingConfig);

    expect(demandingResult.metrics.fatigue).toBeGreaterThan(regularResult.metrics.fatigue);
    expect(demandingResult.metrics.risk).toBeGreaterThan(regularResult.metrics.risk);
  });
});

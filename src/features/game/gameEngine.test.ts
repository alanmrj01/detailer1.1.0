import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../data/defaultConfig';
import { applyChoice, calculateResult, choiceAvailability, createRun, equipmentCost } from './gameEngine';

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
    const choice = defaultConfig.scenario.decisions[1].choices[3];
    const availability = choiceAvailability(choice, run, defaultConfig);

    expect(availability.available).toBe(false);
    expect(availability.reason).toContain('reserva mínima');
  });

  it('respeita requisitos de equipamento para serviços', () => {
    const run = createRun(defaultConfig);
    const polish = defaultConfig.scenario.decisions[2].choices.find((item) => item.id === 'polish')!;

    expect(choiceAvailability(polish, run, defaultConfig).available).toBe(false);
    run.flags.push('eq_polisher');
    expect(choiceAvailability(polish, run, defaultConfig).available).toBe(true);
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
});

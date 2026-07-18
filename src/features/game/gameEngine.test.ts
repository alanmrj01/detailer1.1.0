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
import { explainResultCard, personalizeDecision } from './narrative';
import { migrateConfig } from '../../utils/configTransfer';

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

  it('conclui um caminho completo com índice de saúde válido', () => {
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

    expect(balance.minScore).toBe(34);
    expect(balance.maxScore).toBe(98);
    defaultConfig.scenario.resultBands.forEach((band) => {
      expect(balance.reachableBandIds).toContain(band.id);
      expect(balance.bandCounts[band.id]).toBeGreaterThan(0);
    });
    expect(balance.bandCounts).toEqual({
      fragile: 3136,
      promising: 6615,
      sustainable: 2819,
      excellent: 66,
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

  it('faz o caminho recomendado terminar com saúde alta sem atingir o teto', () => {
    const balance = analyzeGameBalance(defaultConfig);

    expect(balance.recommendedChoiceIds).toHaveLength(defaultConfig.scenario.decisions.length);
    expect(balance.recommendedStars).not.toBeNull();
    expect(balance.recommendedStars).toBe(4.3);
  });

  it('mantém o diagnóstico do caminho recomendado coerente com a saúde da operação', () => {
    let run = createRun(defaultConfig);
    defaultConfig.scenario.decisions.forEach((decision) => {
      const choice = decision.choices.find((item) => item.recommended)!;
      run = applyChoice(run, decision.id, choice, defaultConfig);
    });

    const result = calculateResult(run, defaultConfig);
    expect(result.stars).toBe(4.3);
    expect(result.strengths.length).toBeGreaterThanOrEqual(3);
    expect(result.alerts.length).toBeGreaterThanOrEqual(1);
    result.alerts.forEach((message) => {
      expect(message).toMatch(/^Para elevar a saúde da operação,/);
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

  it('comunica queda na saúde quando uma decisão desequilibra a operação', () => {
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

  it('não orienta a elevar a saúde quando o patamar já é máximo', () => {
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
    expect(result.alerts.join(' ')).toMatch(/saúde da operação atingiu 5,0/i);
    expect(result.alerts.join(' ')).not.toMatch(/elevar a saúde da operação/i);
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

  it('mantém a narrativa coerente em todas as variações de serviço que alimentam os desafios', () => {
    const narrativeBranches = [
      ['garage', 'essential', 'wash', undefined, undefined, 'preserve-quality'],
      ['garage', 'polishing', 'polish', undefined, undefined, 'rush'],
      ['garage', 'interior', 'interior-service', undefined, undefined, 'renegotiate'],
      ['garage', 'essential', 'balanced', undefined, undefined, 'preserve-quality'],
    ];
    const forbiddenPatterns = [
      /catálogo[^.?!]{0,40}(atrasou|atrasado)/i,
      /a catálogo/i,
      /sua pacote/i,
      /sua polimento/i,
      /sua lavagem/i,
      /sua higienização/i,
      /\{\{[^}]+\}\}/,
    ];
    const failures: string[] = [];

    for (const branch of narrativeBranches) {
      let run = createRun(defaultConfig);
      for (let index = 0; index < defaultConfig.scenario.decisions.length; index += 1) {
        const decision = defaultConfig.scenario.decisions[index];
        const personalized = personalizeDecision(decision, run, defaultConfig);
        const texts = [
          personalized.title,
          personalized.situation,
          personalized.mentorTip,
          ...personalized.choices.flatMap((choice) => [choice.label, choice.description, choice.consequence]),
        ];

        for (const text of texts) {
          const matched = forbiddenPatterns.find((pattern) => pattern.test(text));
          if (matched) failures.push(`${branch.join(' > ')} | ${decision.id} | ${text}`);
        }

        const preferredId = branch[index];
        const choice = preferredId
          ? decision.choices.find((item) => item.id === preferredId)
          : decision.choices.find((item) => item.recommended) ?? decision.choices.find((item) => choiceAvailability(item, run, defaultConfig, decision.id).available);
        expect(choice).toBeTruthy();
        run = applyChoice(run, decision.id, choice!, defaultConfig);
      }
    }

    const complaintDecision = defaultConfig.scenario.decisions.find((item) => item.id === 'customer-complaint')!;
    const complaintContexts = [
      { choice: 'rush', expected: 'Depois de acelerar uma entrega para cumprir dois horários' },
      { choice: 'renegotiate', expected: 'Após reorganizar os prazos da agenda' },
      { choice: 'preserve-quality', expected: 'Dias depois, em outro atendimento' },
    ];
    complaintContexts.forEach(({ choice, expected }) => {
      const run = createRun(defaultConfig);
      run.choices['service-focus'] = 'balanced';
      run.choices['execution-pressure'] = choice;
      const personalized = personalizeDecision(complaintDecision, run, defaultConfig);
      expect(personalized.situation).toContain(expected);
      expect(personalized.situation).toContain('pacote combinado de lavagem e cuidados internos');
    });

    expect(failures).toEqual([]);
  });

  it('mantém os patamares máximos raros após a economia realista', () => {
    const paths = enumerateValidGamePaths(defaultConfig);
    const topPaths = paths.filter((path) => path.stars >= 4.7);
    const pathsAtOrAbove43 = paths.filter((path) => path.stars >= 4.3);

    expect(topPaths).toHaveLength(9);
    expect(pathsAtOrAbove43.length / paths.length).toBeLessThan(0.01);
  });

  it('distribui os efeitos entre indicadores diferentes conforme o tipo de decisão', () => {
    const choices = defaultConfig.scenario.decisions.flatMap((decision) => decision.choices);
    const affectedCounts = choices.reduce<Record<string, number>>((counts, choice) => {
      Object.entries(choice.effects).forEach(([metric, value]) => {
        if (value) counts[metric] = (counts[metric] ?? 0) + 1;
      });
      return counts;
    }, {});

    expect(affectedCounts.risk).toBeLessThan(choices.length);
    expect(affectedCounts.quality).toBeLessThan(affectedCounts.reputation);
    expect(affectedCounts.customers).toBeGreaterThanOrEqual(12);
    choices.forEach((choice) => {
      expect(Object.values(choice.effects).filter(Boolean).length).toBeLessThanOrEqual(5);
    });
  });

  it('migra textos narrativos antigos sem sobrescrever personalizações do criador', () => {
    const oldConfig = structuredClone(defaultConfig);
    oldConfig.version = 5;
    const pressure = oldConfig.scenario.decisions.find((item) => item.id === 'execution-pressure')!;
    pressure.title = 'A {{primaryService}} atrasou e o próximo cliente já chegou';
    const custom = oldConfig.scenario.decisions.find((item) => item.id === 'slow-week')!;
    custom.title = 'Título personalizado pelo criador';

    const migrated = migrateConfig(oldConfig);
    expect(migrated.version).toBe(8);
    expect(migrated.scenario.decisions.find((item) => item.id === 'execution-pressure')!.title)
      .toBe('O serviço se estendeu e o próximo cliente já chegou');
    expect(migrated.scenario.decisions.find((item) => item.id === 'slow-week')!.title)
      .toBe('Título personalizado pelo criador');
  });

});

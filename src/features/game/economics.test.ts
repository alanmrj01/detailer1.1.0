import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../../data/defaultConfig';
import { applyChoice, createRun } from './gameEngine';
import { resolveChoiceDisplayedMoney, resolveCurrentTicket } from './economics';
import { personalizeDecision } from './narrative';

function runUntilQuote(operation: 'garage' | 'store' | 'mobile', service: 'wash' | 'polish' | 'interior-service' | 'balanced') {
  const run = createRun(defaultConfig);
  run.choices['operation-model'] = operation;
  run.choices['service-focus'] = service;
  return run;
}

describe('economia dinâmica', () => {
  it('altera o orçamento conforme serviço e estrutura anteriores', () => {
    const washGarage = runUntilQuote('garage', 'wash');
    const polishStore = runUntilQuote('store', 'polish');
    const quote = defaultConfig.scenario.decisions.find((item) => item.id === 'first-quote')!;

    const washPrice = resolveChoiceDisplayedMoney(quote.id, 'balanced-price', washGarage, defaultConfig)!;
    const polishPrice = resolveChoiceDisplayedMoney(quote.id, 'balanced-price', polishStore, defaultConfig)!;

    expect(washPrice).toBeGreaterThanOrEqual(150);
    expect(polishPrice).toBeGreaterThan(washPrice * 2);
  });

  it('usa o mesmo preço no texto e no caixa da escolha', () => {
    const run = runUntilQuote('mobile', 'interior-service');
    const decision = defaultConfig.scenario.decisions.find((item) => item.id === 'first-quote')!;
    const personalized = personalizeDecision(decision, run, defaultConfig);
    const displayed = personalized.choices.find((item) => item.id === 'balanced-price')!;
    const original = decision.choices.find((item) => item.id === 'balanced-price')!;
    const expected = resolveCurrentTicket({ ...run, choices: { ...run.choices, 'first-quote': 'balanced-price' } }, defaultConfig);
    const next = applyChoice(run, decision.id, original, defaultConfig);

    expect(displayed.description).toContain(expected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    expect(next.metrics.cash - run.metrics.cash).toBe(expected);
  });

  it('faz retrabalho e abatimento acompanharem o serviço vendido', () => {
    const wash = runUntilQuote('garage', 'wash');
    wash.choices['first-quote'] = 'balanced-price';
    const polish = runUntilQuote('garage', 'polish');
    polish.choices['first-quote'] = 'balanced-price';

    const washRedo = resolveChoiceDisplayedMoney('customer-complaint', 'redo', wash, defaultConfig)!;
    const polishRedo = resolveChoiceDisplayedMoney('customer-complaint', 'redo', polish, defaultConfig)!;

    expect(polishRedo).toBeGreaterThan(washRedo);
  });

  it('mantém promoção, atraso e crescimento dependentes das escolhas anteriores', () => {
    const garageWash = runUntilQuote('garage', 'wash');
    garageWash.choices['first-quote'] = 'low';
    const storeBalanced = runUntilQuote('store', 'balanced');
    storeBalanced.choices['first-quote'] = 'premium-price';

    expect(resolveChoiceDisplayedMoney('slow-week', 'discount-blast', storeBalanced, defaultConfig))
      .toBeGreaterThan(resolveChoiceDisplayedMoney('slow-week', 'discount-blast', garageWash, defaultConfig)!);
    expect(resolveChoiceDisplayedMoney('execution-pressure', 'preserve-quality', storeBalanced, defaultConfig))
      .toBeGreaterThan(resolveChoiceDisplayedMoney('execution-pressure', 'preserve-quality', garageWash, defaultConfig)!);
    expect(resolveChoiceDisplayedMoney('growth-choice', 'marketing', storeBalanced, defaultConfig))
      .toBeGreaterThan(resolveChoiceDisplayedMoney('growth-choice', 'marketing', garageWash, defaultConfig)!);
  });
});

import type { AppConfig, DecisionChoice } from '../../types/config';
import type { GameRun } from '../../types/game';
import { clamp } from '../../utils/format';

export type EconomicRunContext = Pick<GameRun, 'metrics' | 'flags' | 'choices'>;

type ServiceId = 'wash' | 'polish' | 'interior-service' | 'balanced';
type PriceTier = 'low' | 'balanced-price' | 'premium-price';

const SERVICE_BASE_PRICE: Record<ServiceId, number> = {
  wash: 160,
  polish: 520,
  'interior-service': 420,
  balanced: 540,
};

const SERVICE_VARIABLE_COST_RATIO: Record<ServiceId, number> = {
  wash: 0.18,
  polish: 0.22,
  'interior-service': 0.25,
  balanced: 0.24,
};

const SERVICE_TRAINING_BASE: Record<ServiceId, number> = {
  wash: 520,
  polish: 700,
  'interior-service': 650,
  balanced: 740,
};

const PRICE_TIER_FACTOR: Record<PriceTier, number> = {
  low: 0.82,
  'balanced-price': 1,
  'premium-price': 1.32,
};

export function resolveChoiceCashImpact(
  decisionId: string | undefined,
  choice: DecisionChoice,
  run: EconomicRunContext,
  config: AppConfig,
): number {
  if (!decisionId) return choice.effects.cash ?? 0;

  switch (decisionId) {
    case 'first-quote':
      return resolveQuotedPrice(choice.id, run, config);
    case 'slow-week':
      return resolveSlowWeekCash(choice.id, run, config);
    case 'execution-pressure':
      return resolveExecutionPressureCash(choice.id, run, config);
    case 'customer-complaint':
      return resolveComplaintCash(choice.id, run, config);
    case 'growth-choice':
      return resolveGrowthCash(choice.id, run, config);
    default:
      return choice.effects.cash ?? 0;
  }
}

export function resolveChoiceDisplayedMoney(
  decisionId: string,
  choiceId: string,
  run: EconomicRunContext,
  config: AppConfig,
): number | null {
  const decision = config.scenario.decisions.find((item) => item.id === decisionId);
  const choice = decision?.choices.find((item) => item.id === choiceId);
  if (!choice) return null;
  const value = resolveChoiceCashImpact(decisionId, choice, run, config);
  return Math.abs(value);
}

export function resolveQuotedPrice(
  tierId: string,
  run: EconomicRunContext,
  config: AppConfig,
): number {
  const service = getServiceId(run);
  const tier = isPriceTier(tierId) ? tierId : 'balanced-price';
  const vehicle = getDecisionVehicle('first-quote', config);
  const base = SERVICE_BASE_PRICE[service];
  const vehicleFactor = resolveVehiclePriceFactor(vehicle);
  const operationFactor = resolveOperationPriceFactor(run.choices['operation-model']);
  return roundMarketPrice(base * vehicleFactor * operationFactor * PRICE_TIER_FACTOR[tier]);
}

export function resolveCurrentTicket(run: EconomicRunContext, config: AppConfig): number {
  const selectedTier = run.choices['first-quote'];
  return resolveQuotedPrice(selectedTier && isPriceTier(selectedTier) ? selectedTier : 'balanced-price', run, config);
}

function resolveSlowWeekCash(choiceId: string, run: EconomicRunContext, config: AppConfig): number {
  const ticket = resolveCurrentTicket(run, config);
  const service = getServiceId(run);
  const operationCostFactor = resolveOperationCostFactor(run.choices['operation-model']);

  if (choiceId === 'discount-blast') {
    const contributionPerJob = ticket * (0.8 - SERVICE_VARIABLE_COST_RATIO[service]);
    return roundMoney(contributionPerJob * 2);
  }
  if (choiceId === 'local-partnership') return -roundMarketPrice(90 * operationCostFactor);
  if (choiceId === 'content-routine') return -roundMarketPrice(65 * operationCostFactor);
  return 0;
}

function resolveExecutionPressureCash(choiceId: string, run: EconomicRunContext, config: AppConfig): number {
  const ticket = resolveCurrentTicket(run, config);
  const service = getServiceId(run);
  const operationCostFactor = resolveOperationCostFactor(run.choices['operation-model']);

  if (choiceId === 'preserve-quality') {
    const overtimeAndSupport = ticket * (0.1 + SERVICE_VARIABLE_COST_RATIO[service] * 0.22);
    return -roundMarketPrice(Math.max(55, overtimeAndSupport * operationCostFactor));
  }
  if (choiceId === 'renegotiate') {
    return -roundMarketPrice(Math.max(30, ticket * 0.055 * operationCostFactor));
  }
  return 0;
}

function resolveComplaintCash(choiceId: string, run: EconomicRunContext, config: AppConfig): number {
  const ticket = resolveCurrentTicket(run, config);
  const service = getServiceId(run);
  const quoteVehicle = getDecisionVehicle('first-quote', config);
  const complaintVehicle = getDecisionVehicle('customer-complaint', config);
  const vehicleRatio = resolveVehiclePriceFactor(complaintVehicle) / Math.max(0.75, resolveVehiclePriceFactor(quoteVehicle));

  if (choiceId === 'redo') {
    const redoRatio = SERVICE_VARIABLE_COST_RATIO[service] + 0.14;
    return -roundMarketPrice(Math.max(70, ticket * redoRatio * vehicleRatio));
  }
  if (choiceId === 'partial-refund') {
    return -roundMarketPrice(Math.max(50, ticket * 0.22 * vehicleRatio));
  }
  return 0;
}

function resolveGrowthCash(choiceId: string, run: EconomicRunContext, config: AppConfig): number {
  const ticket = resolveCurrentTicket(run, config);
  const service = getServiceId(run);
  const operation = run.choices['operation-model'];

  if (choiceId === 'marketing') {
    const operationFactor = operation === 'store' ? 1.18 : operation === 'mobile' ? 1.1 : 0.95;
    return -roundMarketPrice(Math.max(400, ticket * 1.12) * operationFactor);
  }
  if (choiceId === 'training') {
    const equipmentFactor = run.flags.includes('eq_polisher') || run.flags.includes('eq_extractor') ? 1.08 : 1;
    return -roundMarketPrice(Math.min(600, SERVICE_TRAINING_BASE[service] * equipmentFactor));
  }
  if (choiceId === 'helper') {
    const structureExtra = operation === 'store' ? 70 : operation === 'mobile' ? 40 : 0;
    const equipmentExtra = run.flags.includes('eq_polisher') && run.flags.includes('eq_extractor') ? 30 : 0;
    return -roundMarketPrice(Math.min(900, 800 + structureExtra + equipmentExtra));
  }
  return 0;
}

function getServiceId(run: EconomicRunContext): ServiceId {
  const selected = run.choices['service-focus'];
  if (selected === 'wash' || selected === 'polish' || selected === 'interior-service' || selected === 'balanced') {
    return selected;
  }
  return 'wash';
}

function getDecisionVehicle(decisionId: string, config: AppConfig) {
  const decision = config.scenario.decisions.find((item) => item.id === decisionId);
  const fallbackVehicleId = decisionId === 'first-quote' ? 't-cross' : decisionId === 'customer-complaint' ? 'onix' : undefined;
  const vehicleId = decision?.vehicleId ?? fallbackVehicleId;
  return config.scenario.cars.find((item) => item.id === vehicleId);
}

function resolveVehiclePriceFactor(vehicle: AppConfig['scenario']['cars'][number] | undefined): number {
  if (!vehicle) return 1;
  const segmentFactor = { hatch: 0.98, sedan: 1, suv: 1.16, pickup: 1.25 }[vehicle.segment];
  return clamp(vehicle.sizeFactor * 0.72 + vehicle.soilFactor * 0.12 + segmentFactor * 0.16, 0.88, 1.38);
}

function resolveOperationPriceFactor(operationId: string | undefined): number {
  if (operationId === 'garage') return 0.95;
  if (operationId === 'store') return 1.08;
  if (operationId === 'mobile') return 1.12;
  return 1;
}

function resolveOperationCostFactor(operationId: string | undefined): number {
  if (operationId === 'garage') return 0.94;
  if (operationId === 'store') return 1.12;
  if (operationId === 'mobile') return 1.16;
  return 1;
}

function isPriceTier(value: string): value is PriceTier {
  return value === 'low' || value === 'balanced-price' || value === 'premium-price';
}

function roundMarketPrice(value: number): number {
  return Math.max(0, Math.round(value / 5) * 5);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

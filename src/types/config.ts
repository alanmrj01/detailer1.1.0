export type ThemeMode = 'light' | 'dark';

export type MetricKey =
  | 'cash'
  | 'reputation'
  | 'quality'
  | 'capacity'
  | 'risk'
  | 'customers'
  | 'fatigue';

export type NumericMetrics = Record<MetricKey, number>;

export interface BrandConfig {
  appName: string;
  creatorName: string;
  tagline: string;
  introTitle: string;
  introDescription: string;
  logoDataUrl: string;
  accentColor: string;
  supportText: string;
}

export interface MarketSource {
  retailer: string;
  price: number;
  url: string;
  checkedAt: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  shortName: string;
  category: 'washing' | 'polishing' | 'interior';
  price: number;
  description: string;
  sources: MarketSource[];
}

export interface CarModel {
  id: string;
  brand: string;
  model: string;
  segment: 'hatch' | 'sedan' | 'suv' | 'pickup';
  sizeFactor: number;
  soilFactor: number;
}

export interface ChoiceRequirement {
  minCashAfter?: number;
  requiredFlags?: string[];
  requiredAnyFlags?: string[];
  forbiddenFlags?: string[];
}

export interface ChoiceEffects {
  cash?: number;
  reputation?: number;
  quality?: number;
  capacity?: number;
  risk?: number;
  customers?: number;
  fatigue?: number;
}

export interface DecisionChoice {
  id: string;
  label: string;
  description: string;
  consequence: string;
  effects: ChoiceEffects;
  grants?: string[];
  requirements?: ChoiceRequirement;
  recommended?: boolean;
  costEquipmentIds?: string[];
}

export type AnimationScene =
  | 'garage'
  | 'mobile'
  | 'store'
  | 'equipment'
  | 'washing'
  | 'polishing'
  | 'interior'
  | 'pricing'
  | 'complaint'
  | 'growth'
  | 'result-1star'
  | 'result-2star'
  | 'result-3star'
  | 'result-4star'
  | 'result-5star';

export interface DecisionConfig {
  id: string;
  vehicleId?: string;
  module: string;
  eyebrow: string;
  title: string;
  situation: string;
  mentorTip: string;
  animation: AnimationScene;
  choices: DecisionChoice[];
}

export interface ResultBand {
  id: string;
  minScore: number;
  maxScore: number;
  title: string;
  summary: string;
  methodFeedback: string;
}


export interface ScoreBenchmark {
  poor: number;
  excellent: number;
}

export interface ScoreBenchmarks {
  cashReserveRatio: ScoreBenchmark;
  reputation: ScoreBenchmark;
  quality: ScoreBenchmark;
  capacity: ScoreBenchmark;
  risk: ScoreBenchmark;
  fatigue: ScoreBenchmark;
}

export interface ScoreWeights {
  cash: number;
  reputation: number;
  quality: number;
  capacity: number;
  risk: number;
  fatigue: number;
}

export interface ScenarioConfig {
  initialMetrics: NumericMetrics;
  durationDays: number;
  currency: string;
  decisions: DecisionConfig[];
  equipment: EquipmentItem[];
  cars: CarModel[];
  resultBands: ResultBand[];
  scoreWeights: ScoreWeights;
  scoreBenchmarks: ScoreBenchmarks;
}

export interface SecurityConfig {
  creatorPin: string;
}

export interface AppConfig {
  version: number;
  brand: BrandConfig;
  scenario: ScenarioConfig;
  security: SecurityConfig;
}

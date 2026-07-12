import type { MetricKey, NumericMetrics, ScenarioConfig } from './config';

export interface LedgerEntry {
  id: string;
  decisionId: string;
  choiceId: string;
  title: string;
  consequence: string;
  before: NumericMetrics;
  after: NumericMetrics;
  delta: Partial<Record<MetricKey, number>>;
}

export interface GameRun {
  runId: string;
  startedAt: string;
  completedAt?: string;
  currentDecisionIndex: number;
  metrics: NumericMetrics;
  flags: string[];
  choices: Record<string, string>;
  ledger: LedgerEntry[];
  /** Cópia imutável do cenário usado ao iniciar a rodada. */
  scenarioSnapshot?: ScenarioConfig;
}

export interface GameResult {
  score: number;
  stars: number;
  bandId: string;
  strengths: string[];
  alerts: string[];
  strengthMetricKeys: MetricKey[];
  alertMetricKeys: MetricKey[];
}

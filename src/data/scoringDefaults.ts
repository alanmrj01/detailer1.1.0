import type { ScoreBenchmarks } from '../types/config';

/**
 * Régua absoluta do método padrão.
 * Cada indicador é convertido para 0–100 entre um ponto frágil e um patamar
 * excelente fixos. A nota não depende dos demais caminhos disponíveis.
 */
export const DEFAULT_SCORE_BENCHMARKS: ScoreBenchmarks = {
  cashReserveRatio: { poor: 0.15, excellent: 0.9 },
  reputation: { poor: 5, excellent: 50 },
  quality: { poor: 15, excellent: 55 },
  capacity: { poor: 3, excellent: 13 },
  risk: { poor: 70, excellent: 0 },
  fatigue: { poor: 50, excellent: 8 },
};

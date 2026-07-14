import type { ScoreBenchmarks } from '../types/config';

/**
 * Régua absoluta da saúde da operação.
 * Cada indicador é convertido para 0–100 entre um ponto frágil e um patamar
 * excelente fixos. A mesma operação mantém o mesmo diagnóstico mesmo que
 * novos caminhos sejam adicionados ao jogo.
 */
export const DEFAULT_SCORE_BENCHMARKS: ScoreBenchmarks = {
  cashReserveRatio: { poor: 0.2, excellent: 0.82 },
  reputation: { poor: 8, excellent: 46 },
  quality: { poor: 18, excellent: 58 },
  capacity: { poor: 3, excellent: 13 },
  risk: { poor: 65, excellent: 0 },
  fatigue: { poor: 50, excellent: 16 },
};

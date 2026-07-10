export const formatCurrency = (value: number, currency = 'BRL'): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatSigned = (value: number): string =>
  `${value > 0 ? '+' : ''}${Math.round(value)}`;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

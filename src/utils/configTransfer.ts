import type { AppConfig } from '../types/config';

export function serializeConfig(config: AppConfig): string {
  return JSON.stringify(config, null, 2);
}

export function parseConfigJson(text: string): AppConfig {
  const parsed: unknown = JSON.parse(text);
  if (!isAppConfig(parsed)) {
    throw new Error('O arquivo não possui a estrutura esperada do Detailer Business.');
  }
  return migrateConfig(parsed);
}

export function downloadConfig(config: AppConfig): void {
  const blob = new Blob([serializeConfig(config)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = config.brand.appName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'detailer-business';
  anchor.href = url;
  anchor.download = `${safeName}-config.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}


function migrateConfig(config: AppConfig): AppConfig {
  const migrated = structuredClone(config);
  if (migrated.version >= 3) return migrated;

  const firstQuote = migrated.scenario.decisions.find((decision) => decision.id === 'first-quote');
  if (firstQuote) {
    firstQuote.vehicleId ??= 't-cross';
    firstQuote.situation = firstQuote.situation.replace('Volkswagen T-Cross', '{{vehicle}}');
  }

  const complaint = migrated.scenario.decisions.find((decision) => decision.id === 'customer-complaint');
  if (complaint) {
    complaint.vehicleId ??= 'onix';
  }

  migrated.version = 3;
  return migrated;
}

function isAppConfig(value: unknown): value is AppConfig {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'number') return false;
  if (!isRecord(value.brand) || !isRecord(value.security) || !isRecord(value.scenario)) return false;
  if (typeof value.brand.appName !== 'string' || typeof value.brand.accentColor !== 'string') return false;
  if (typeof value.security.creatorPin !== 'string') return false;
  if (!isRecord(value.scenario.initialMetrics)) return false;
  if (!Array.isArray(value.scenario.decisions)) return false;
  if (!Array.isArray(value.scenario.equipment)) return false;
  if (!Array.isArray(value.scenario.cars)) return false;
  if (!Array.isArray(value.scenario.resultBands)) return false;
  if (!isRecord(value.scenario.scoreWeights)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

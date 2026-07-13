import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../data/defaultConfig';
import { parseConfigJson, serializeConfig } from './configTransfer';
import { validateConfig } from './configValidation';

describe('configuração do criador', () => {
  it('exporta e importa a configuração sem perder dados', () => {
    const serialized = serializeConfig(defaultConfig);
    const imported = parseConfigJson(serialized);

    expect(imported).toEqual(defaultConfig);
    expect(validateConfig(imported).filter((issue) => issue.level === 'error')).toHaveLength(0);
  });

  it('migra configurações anteriores para a régua absoluta', () => {
    const legacy = structuredClone(defaultConfig) as any;
    legacy.version = 3;
    delete legacy.scenario.scoreBenchmarks;

    const imported = parseConfigJson(JSON.stringify(legacy));
    expect(imported.version).toBe(6);
    expect(imported.scenario.scoreBenchmarks.cashReserveRatio).toEqual({ poor: 0.15, excellent: 0.9 });
    expect(imported.scenario.resultBands.map((band) => [band.minScore, band.maxScore])).toEqual([
      [0, 54], [55, 69], [70, 84], [85, 100],
    ]);
    expect(imported.brand.introTitle).toContain('{{durationDays}}');
    expect(validateConfig(imported).filter((issue) => issue.level === 'error')).toHaveLength(0);
  });

  it('recusa JSON sem a estrutura do aplicativo', () => {
    expect(() => parseConfigJson('{"nome":"arquivo inválido"}')).toThrow(/estrutura esperada/i);
  });
});

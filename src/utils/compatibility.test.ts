import { afterEach, describe, expect, it } from 'vitest';
import { cloneValue, createUniqueId, firstClause, firstSentence, lastItem, replaceAllText } from './compat';
import { readJson, removeJson, writeJson } from './storage';

const TEST_KEY = 'detailer-compatibility-test';

afterEach(() => {
  removeJson(TEST_KEY);
});

describe('compatibilidade progressiva', () => {
  it('clona estruturas serializáveis sem compartilhar referências', () => {
    const original = { nested: { value: 1 }, items: ['a', 'b'] };
    const cloned = cloneValue(original);
    cloned.nested.value = 2;
    cloned.items.push('c');

    expect(original).toEqual({ nested: { value: 1 }, items: ['a', 'b'] });
  });

  it('gera identificadores válidos e distintos', () => {
    const first = createUniqueId();
    const second = createUniqueId();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(12);
  });

  it('substitui tokens sem depender de replaceAll', () => {
    expect(replaceAllText('90 dias, 90 decisões', '90', '60')).toBe('60 dias, 60 decisões');
  });

  it('extrai frases e trechos sem regex lookbehind', () => {
    expect(firstSentence('Primeira frase. Segunda frase.')).toBe('Primeira frase.');
    expect(firstClause('Caixa preservado, com margem para reagir.')).toBe('Caixa preservado');
  });

  it('obtém o último item sem Array.prototype.at', () => {
    expect(lastItem(['a', 'b', 'c'])).toBe('c');
    expect(lastItem([])).toBeUndefined();
  });

  it('mantém dados em memória quando o armazenamento persistente é bloqueado', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
        removeItem() { throw new Error('blocked'); },
        clear() { throw new Error('blocked'); },
        key() { return null; },
        length: 0,
      },
    });

    expect(writeJson(TEST_KEY, { stage: 2 })).toBe(false);
    expect(readJson<{ stage: number }>(TEST_KEY)).toEqual({ stage: 2 });

    if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });
});

/**
 * Compatibilidade progressiva para navegadores e WebViews antigos.
 * As implementações nativas continuam sendo usadas quando disponíveis.
 */

export function cloneValue<T>(value: T): T {
  const root = getRuntimeRoot();
  const nativeClone = root && typeof root.structuredClone === 'function'
    ? root.structuredClone.bind(root)
    : null;

  if (nativeClone) {
    try {
      return nativeClone(value) as T;
    } catch {
      // Configurações e partidas são estruturas serializáveis; o fallback abaixo é suficiente.
    }
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function createUniqueId(prefix = 'detailer'): string {
  const root = getRuntimeRoot();
  const cryptoObject = root && root.crypto ? root.crypto : null;

  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    try {
      return cryptoObject.randomUUID();
    } catch {
      // Continua para os fallbacks.
    }
  }

  if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16);
      cryptoObject.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.prototype.map.call(bytes, (byte: number) => {
        const value = byte.toString(16);
        return value.length < 2 ? `0${value}` : value;
      }).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Continua para o fallback sem Web Crypto.
    }
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${timestamp}-${random}`;
}

export function lastItem<T>(items: readonly T[]): T | undefined {
  return items.length ? items[items.length - 1] : undefined;
}

export function replaceAllText(input: string, search: string, replacement: string): string {
  if (!search) return input;
  return input.split(search).join(replacement);
}

export function firstSentence(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) return '';

  for (let index = 0; index < cleaned.length; index += 1) {
    const character = cleaned.charAt(index);
    if (character !== '.' && character !== '!' && character !== '?') continue;

    const next = cleaned.charAt(index + 1);
    if (!next || /\s/.test(next)) return cleaned.slice(0, index + 1).trim();
  }

  return cleaned;
}

export function firstClause(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) return '';

  const sentence = firstSentence(cleaned);
  const sentenceEnd = sentence.length < cleaned.length ? sentence.length : -1;
  const comma = cleaned.indexOf(',');
  const semicolon = cleaned.indexOf(';');
  const candidates = [sentenceEnd, comma, semicolon].filter((index) => index > 0);
  const end = candidates.length ? Math.min.apply(Math, candidates) : cleaned.length;
  return cleaned.slice(0, end).trim();
}

interface RuntimeRoot {
  structuredClone?: <T>(value: T) => T;
  crypto?: Crypto;
}

function getRuntimeRoot(): RuntimeRoot | null {
  if (typeof globalThis !== 'undefined') return globalThis as RuntimeRoot;
  if (typeof window !== 'undefined') return window as unknown as RuntimeRoot;
  return null;
}

import { readJson, readSessionValue, storageKeys, writeJson, writeSessionValue } from './storage';

const SESSION_COUNT_KEY = `${storageKeys.DEMO_RUN_COUNT_KEY}-session`;
const COOKIE_COUNT_KEY = 'detailer_demo_run_count_v1';
const COOKIE_CROSS_SITE_COUNT_KEY = 'detailer_demo_run_count_cross_site_v1';
const WINDOW_NAME_MARKER = 'detailer-demo-run-used-v1';
const MAX_DEMO_RUNS = 1;

let memoryCount = 0;

/**
 * Lê o uso da demonstração por várias camadas independentes.
 *
 * Alguns navegadores móveis e WebViews bloqueiam o localStorage dentro de
 * iframes. Por isso o limite não depende de uma única API: localStorage,
 * sessionStorage, cookies e window.name funcionam como redundância. O maior
 * valor encontrado sempre prevalece para evitar que uma camada vazia apague
 * um uso já registrado em outra.
 */
export function readDemoRunCount(): number {
  const counts = [
    memoryCount,
    normalizeDemoRunCount(readJson<unknown>(storageKeys.DEMO_RUN_COUNT_KEY)),
    normalizeSerializedCount(readSessionValue(SESSION_COUNT_KEY)),
    readCookieCount(COOKIE_COUNT_KEY),
    readCookieCount(COOKIE_CROSS_SITE_COUNT_KEY),
    readWindowNameCount(),
  ];

  const count = Math.max(...counts);
  memoryCount = count;
  return count;
}

/**
 * Registra o uso em todas as camadas disponíveis. Falha em uma camada não
 * interrompe o jogo nem impede as demais tentativas de persistência.
 */
export function writeDemoRunCount(value: number): number {
  const count = normalizeDemoRunCount(value);
  memoryCount = count;

  writeJson(storageKeys.DEMO_RUN_COUNT_KEY, count);
  writeSessionValue(SESSION_COUNT_KEY, JSON.stringify(count));
  writeCookieCount(COOKIE_COUNT_KEY, count, 'Lax');
  writeCookieCount(COOKIE_CROSS_SITE_COUNT_KEY, count, 'None');
  writeWindowNameCount(count);

  return count;
}

export function hasDemoRunBeenUsed(): boolean {
  return readDemoRunCount() >= MAX_DEMO_RUNS;
}

export function getDemoRunLimit(): number {
  return MAX_DEMO_RUNS;
}

export function normalizeDemoRunCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), MAX_DEMO_RUNS);
}

function normalizeSerializedCount(value: string | null): number {
  if (!value) return 0;

  try {
    return normalizeDemoRunCount(JSON.parse(value));
  } catch {
    const parsed = Number(value);
    return normalizeDemoRunCount(parsed);
  }
}

function readCookieCount(name: string): number {
  if (typeof document === 'undefined') return 0;

  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const parts = document.cookie ? document.cookie.split(';') : [];
    for (const part of parts) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      return normalizeSerializedCount(decodeURIComponent(cookie.slice(prefix.length)));
    }
  } catch {
    // Cookies podem ser bloqueados em iframes e navegadores privados.
  }

  return 0;
}

function writeCookieCount(name: string, count: number, sameSite: 'Lax' | 'None'): void {
  if (typeof document === 'undefined') return;

  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(count))}; Max-Age=31536000; Path=/; SameSite=${sameSite}${secure}`;
  } catch {
    // O limite continua protegido pelas demais camadas.
  }
}

function readWindowNameCount(): number {
  if (typeof window === 'undefined') return 0;

  try {
    return window.name.split('|').includes(WINDOW_NAME_MARKER) ? MAX_DEMO_RUNS : 0;
  } catch {
    return 0;
  }
}

function writeWindowNameCount(count: number): void {
  if (count < MAX_DEMO_RUNS || typeof window === 'undefined') return;

  try {
    const parts = window.name ? window.name.split('|').filter(Boolean) : [];
    if (!parts.includes(WINDOW_NAME_MARKER)) {
      parts.push(WINDOW_NAME_MARKER);
      window.name = parts.join('|');
    }
  } catch {
    // window.name é apenas uma redundância adicional.
  }
}

/** Exclusivo para isolamento dos testes automatizados. */
export function resetDemoLimitMemoryForTests(): void {
  memoryCount = 0;
}

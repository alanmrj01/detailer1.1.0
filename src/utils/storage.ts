const CONFIG_KEY = 'detailer-lab-config-v2';
const RUN_KEY = 'detailer-lab-run-v2';
const DEMO_RUN_COUNT_KEY = 'detailer-demo-run-count-v1';

export const storageKeys = { CONFIG_KEY, RUN_KEY, DEMO_RUN_COUNT_KEY };

const memoryStorage: Record<string, string> = {};
const memoryOnlyKeys: Record<string, boolean> = {};

export function readJson<T>(key: string): T | null {
  const raw = readValue('local', key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    removeJson(key);
    return null;
  }
}

/**
 * A gravação nunca interrompe a partida. Quando o armazenamento persistente não
 * está disponível, o valor continua acessível em memória durante a sessão atual.
 */
export function writeJson<T>(key: string, value: T): boolean {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }

  memoryStorage[key] = serialized;
  return writeValue('local', key, serialized);
}

export function removeJson(key: string): void {
  delete memoryStorage[key];
  delete memoryOnlyKeys[key];
  removeValue('local', key);
}

export function readSessionValue(key: string): string | null {
  return readValue('session', key);
}

export function writeSessionValue(key: string, value: string): boolean {
  return writeValue('session', key, value);
}

function readValue(kind: 'local' | 'session', key: string): string | null {
  const storage = getBrowserStorage(kind);
  if (storage) {
    try {
      const stored = storage.getItem(key);
      if (stored !== null) {
        memoryStorage[key] = stored;
        delete memoryOnlyKeys[key];
        return stored;
      }

      if (memoryOnlyKeys[key] && Object.prototype.hasOwnProperty.call(memoryStorage, key)) {
        return memoryStorage[key];
      }

      delete memoryStorage[key];
      return null;
    } catch {
      // Ambientes privados, iframes e WebViews podem negar acesso em tempo de execução.
    }
  }

  return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
}

function writeValue(kind: 'local' | 'session', key: string, value: string): boolean {
  memoryStorage[key] = value;
  const storage = getBrowserStorage(kind);
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    delete memoryOnlyKeys[key];
    return true;
  } catch {
    memoryOnlyKeys[key] = true;
    return false;
  }
}

function removeValue(kind: 'local' | 'session', key: string): void {
  const storage = getBrowserStorage(kind);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // A remoção persistente é opcional; a cópia em memória já foi removida.
  }
}

function getBrowserStorage(kind: 'local' | 'session'): Storage | null {
  const root: { localStorage?: Storage; sessionStorage?: Storage } | null =
    typeof window !== 'undefined'
      ? window
      : typeof globalThis !== 'undefined'
        ? (globalThis as { localStorage?: Storage; sessionStorage?: Storage })
        : null;

  if (!root) return null;

  try {
    return kind === 'local' ? (root.localStorage ?? null) : (root.sessionStorage ?? null);
  } catch {
    return null;
  }
}

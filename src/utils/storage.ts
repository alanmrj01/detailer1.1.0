const CONFIG_KEY = 'detailer-lab-config-v2';
const RUN_KEY = 'detailer-lab-run-v2';
const THEME_KEY = 'detailer-lab-theme-v2';

export const storageKeys = { CONFIG_KEY, RUN_KEY, THEME_KEY };

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

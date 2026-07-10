import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { defaultConfig } from '../data/defaultConfig';
import type { AppConfig, ThemeMode } from '../types/config';
import { readJson, storageKeys, writeJson } from '../utils/storage';

interface AppConfigContextValue {
  config: AppConfig;
  setConfig: (next: AppConfig) => void;
  updateConfig: (updater: (current: AppConfig) => AppConfig) => void;
  resetConfig: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AppConfig>(() => readJson<AppConfig>(storageKeys.CONFIG_KEY) ?? defaultConfig);
  const [theme, setThemeState] = useState<ThemeMode>(() => readJson<ThemeMode>(storageKeys.THEME_KEY) ?? 'dark');

  const setConfig = (next: AppConfig) => {
    setConfigState(next);
    writeJson(storageKeys.CONFIG_KEY, next);
  };

  const updateConfig = (updater: (current: AppConfig) => AppConfig) => {
    setConfig(updater(config));
  };

  const resetConfig = () => {
    setConfig(structuredClone(defaultConfig));
  };

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    writeJson(storageKeys.THEME_KEY, nextTheme);
  };

  const value = useMemo(
    () => ({ config, setConfig, updateConfig, resetConfig, theme, setTheme }),
    [config, theme],
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigContextValue {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig deve ser usado dentro de AppConfigProvider.');
  }
  return context;
}

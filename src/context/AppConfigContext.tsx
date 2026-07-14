import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { defaultConfig } from '../data/defaultConfig';
import type { AppConfig } from '../types/config';
import { readJson, storageKeys, writeJson } from '../utils/storage';
import { migrateConfig } from '../utils/configTransfer';
import { cloneValue } from '../utils/compat';

interface AppConfigContextValue {
  config: AppConfig;
  setConfig: (next: AppConfig) => void;
  updateConfig: (updater: (current: AppConfig) => AppConfig) => void;
  resetConfig: () => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AppConfig>(() => {
    const stored = readJson<AppConfig>(storageKeys.CONFIG_KEY);
    return stored ? migrateConfig(stored) : cloneValue(defaultConfig);
  });

  const setConfig = (next: AppConfig) => {
    setConfigState(next);
    writeJson(storageKeys.CONFIG_KEY, next);
  };

  const updateConfig = (updater: (current: AppConfig) => AppConfig) => {
    setConfig(updater(config));
  };

  const resetConfig = () => {
    setConfig(cloneValue(defaultConfig));
  };

  const value = useMemo(
    () => ({ config, setConfig, updateConfig, resetConfig }),
    [config],
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

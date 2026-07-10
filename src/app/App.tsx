import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { useAppConfig } from '../context/AppConfigContext';
import { GamePage } from '../features/game/GamePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import styles from './App.module.css';

export function App() {
  const { config, theme, setTheme } = useAppConfig();
  const [view, setView] = useState<'game' | 'settings'>('game');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', config.brand.accentColor);
  }, [theme, config.brand.accentColor]);

  return (
    <div className={styles.app}>
      <AppHeader
        appName={config.brand.appName}
        logoDataUrl={config.brand.logoDataUrl}
        activeView={view}
        onNavigate={setView}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
      <div key={view} className={styles.viewTransition}>
        {view === 'game' ? <GameErrorBoundary><GamePage /></GameErrorBoundary> : <SettingsPage />}
      </div>
    </div>
  );
}

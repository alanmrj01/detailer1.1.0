import { useEffect, useState } from 'react';
import { AppHeader, type AppView } from '../components/AppHeader';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { useAppConfig } from '../context/AppConfigContext';
import { GamePage } from '../features/game/GamePage';
import { HistoryPage } from '../features/info/HistoryPage';
import { HowToPage } from '../features/info/HowToPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import styles from './App.module.css';

export function App() {
  const { config, theme, setTheme } = useAppConfig();
  const [view, setView] = useState<AppView>('game');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', config.brand.accentColor);
  }, [theme, config.brand.accentColor]);

  const page = (() => {
    if (view === 'settings') return <SettingsPage />;
    if (view === 'howto') return <HowToPage />;
    if (view === 'history') return <HistoryPage />;
    return <GameErrorBoundary><GamePage /></GameErrorBoundary>;
  })();

  return (
    <div className={styles.app}>
      <div key={view} className={styles.viewTransition}>{page}</div>
      <AppHeader
        appName={config.brand.appName}
        logoDataUrl={config.brand.logoDataUrl}
        activeView={view}
        onNavigate={setView}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    </div>
  );
}

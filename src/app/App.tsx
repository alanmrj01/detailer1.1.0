import { useEffect, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { GameErrorBoundary } from '../components/GameErrorBoundary';
import { useAppConfig } from '../context/AppConfigContext';
import { GamePage } from '../features/game/GamePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { preloadVisualAssets } from '../utils/preloadVisualAssets';
import styles from './App.module.css';

export function App() {
  const { config } = useAppConfig();
  const [view, setView] = useState<'game' | 'settings'>('game');
  const [gameplayActive, setGameplayActive] = useState(false);

  useEffect(() => {
    preloadVisualAssets();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', config.brand.accentColor);
  }, [config.brand.accentColor]);

  return (
    <div className={styles.app}>
      <AppHeader
        appName={config.brand.appName}
        logoDataUrl={config.brand.logoDataUrl}
        activeView={view}
        gameplayActive={view === 'game' && gameplayActive}
        onNavigate={setView}
      />
      <div key={view} className={styles.viewTransition}>
        {view === 'game' ? (
          <GameErrorBoundary>
            <GamePage onGameplayStateChange={setGameplayActive} />
          </GameErrorBoundary>
        ) : (
          <SettingsPage />
        )}
      </div>
    </div>
  );
}

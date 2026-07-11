import type { ThemeMode } from '../types/config';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  appName: string;
  logoDataUrl: string;
  activeView: 'game' | 'settings';
  onNavigate: (view: 'game' | 'settings') => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function AppHeader({
  appName,
  logoDataUrl,
  activeView,
  onNavigate,
  theme,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <button className={styles.brand} type="button" onClick={() => onNavigate('game')}>
        {logoDataUrl ? (
          <img className={styles.logo} src={logoDataUrl} alt={`Logo ${appName}`} />
        ) : (
          <span className={styles.mark}>DB</span>
        )}
        <strong>{appName}</strong>
      </button>

      <nav className={styles.actions} aria-label="Navegação principal">
        <button
          className={activeView === 'game' ? styles.active : ''}
          type="button"
          onClick={() => onNavigate('game')}
        >
          Jogar
        </button>
        <button
          className={activeView === 'settings' ? styles.active : ''}
          type="button"
          onClick={() => onNavigate('settings')}
        >
          Configurações
        </button>
        <button className={styles.themeButton} type="button" onClick={onToggleTheme} aria-label="Alternar tema">
          {theme === 'dark' ? '☀' : '◐'}
        </button>
      </nav>
    </header>
  );
}

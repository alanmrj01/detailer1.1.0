import type { ThemeMode } from '../types/config';
import styles from './AppHeader.module.css';

export type AppView = 'game' | 'howto' | 'settings' | 'history';

interface AppHeaderProps {
  appName: string;
  logoDataUrl: string;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const navItems: Array<{ id: AppView; label: string; icon: string }> = [
  { id: 'game', label: 'Início', icon: '⌂' },
  { id: 'howto', label: 'Como jogar', icon: '?' },
  { id: 'settings', label: 'Configurações', icon: '⚙' },
  { id: 'history', label: 'Histórico', icon: '▣' },
];

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
        <span className={styles.brandText}>
          <strong>DETAILER</strong>
          <b>BUSINESS</b>
        </span>
      </button>

      <nav className={styles.actions} aria-label="Navegação principal">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? styles.active : ''}
            type="button"
            onClick={() => onNavigate(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.utility}>
        <button className={styles.themeButton} type="button" onClick={onToggleTheme} aria-label="Alternar tema">
          {theme === 'dark' ? '☀' : '◐'}
        </button>
        <span className={styles.version}>v1.2.5</span>
      </div>
    </header>
  );
}

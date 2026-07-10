import { Component, type ErrorInfo, type ReactNode } from 'react';
import { storageKeys } from '../utils/storage';
import styles from './GameErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha no jogo:', error, info);
  }

  private resetGame = () => {
    localStorage.removeItem(storageKeys.RUN_KEY);
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <span>Falha recuperável</span>
          <h1>Não foi possível carregar esta partida.</h1>
          <p>O progresso local pode ter ficado incompatível após uma atualização. Reinicie somente a partida para continuar.</p>
          {import.meta.env.DEV && this.state.message ? <code>{this.state.message}</code> : null}
          <button className="primaryButton" type="button" onClick={this.resetGame}>Reiniciar partida</button>
        </section>
      </main>
    );
  }
}

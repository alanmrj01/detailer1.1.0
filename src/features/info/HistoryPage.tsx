import { useAppConfig } from '../../context/AppConfigContext';
import type { GameRun } from '../../types/game';
import { readJson, storageKeys } from '../../utils/storage';
import styles from './InfoPages.module.css';

export function HistoryPage() {
  const { config } = useAppConfig();
  const run = readJson<GameRun>(storageKeys.RUN_KEY);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span>HISTÓRICO</span>
        <h1>Decisões da partida atual</h1>
        <p>O MVP salva localmente a rodada em andamento. Esta tela resume as escolhas já realizadas.</p>
      </section>
      {!run || run.ledger.length === 0 ? (
        <section className={styles.empty}>Nenhuma decisão registrada nesta partida.</section>
      ) : (
        <section className={styles.historyList}>
          {run.ledger.map((entry, index) => (
            <article key={entry.id}>
              <b>{index + 1}</b>
              <div><h2>{entry.title}</h2><p>{entry.consequence}</p></div>
              <small>{config.scenario.decisions.find((item) => item.id === entry.decisionId)?.module ?? 'Fase 1'}</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

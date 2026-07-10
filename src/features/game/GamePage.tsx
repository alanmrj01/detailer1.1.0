import { useEffect, useState, type CSSProperties } from 'react';
import { ChoiceVisual } from '../../components/ChoiceVisual';
import { MetricStrip } from '../../components/MetricStrip';
import { SceneAnimation } from '../../components/SceneAnimation';
import { useAppConfig } from '../../context/AppConfigContext';
import type { DecisionChoice } from '../../types/config';
import type { GameResult, GameRun, LedgerEntry } from '../../types/game';
import { formatCurrency } from '../../utils/format';
import { readJson, storageKeys, writeJson } from '../../utils/storage';
import { applyChoice, calculateResult, choiceAvailability, createRun, equipmentCost, resolveAnimation } from './gameEngine';
import {
  describeChoiceImpact,
  describeFeedback,
  explainResultCard,
  getMetricLabel,
  personalizeChoice,
  personalizeDecision,
} from './narrative';
import styles from './GamePage.module.css';

const STRATEGY_STEPS = 3;

type InsightCard = 'strengths' | 'alerts' | 'method' | null;

export function GamePage() {
  const { config, theme, setTheme } = useAppConfig();
  const [run, setRun] = useState<GameRun | null>(() => readJson<GameRun>(storageKeys.RUN_KEY));
  const [selectedChoice, setSelectedChoice] = useState<DecisionChoice | null>(null);
  const [feedback, setFeedback] = useState<{ entry: LedgerEntry; mentorTip: string } | null>(null);
  const [openInsight, setOpenInsight] = useState<InsightCard>(null);

  useEffect(() => {
    if (run) writeJson(storageKeys.RUN_KEY, run);
    else localStorage.removeItem(storageKeys.RUN_KEY);
  }, [run]);

  const restartRun = () => {
    setSelectedChoice(null);
    setFeedback(null);
    setOpenInsight(null);
    setRun(createRun(config));
  };

  if (!run) {
    return (
      <main className={styles.introPage}>
        <section className={styles.introHero}>
          <SceneAnimation scene="garage" />
          <div className={styles.introContent}>
            <span className={styles.kicker}>{config.brand.creatorName}</span>
            {config.brand.logoDataUrl ? (
              <img className={styles.introLogo} src={config.brand.logoDataUrl} alt={`Logo ${config.brand.appName}`} />
            ) : (
              <div className={styles.logoBadge}>DB</div>
            )}
            <h1>{config.brand.introTitle}</h1>
            <p>{config.brand.introDescription}</p>

            <div className={styles.introStats}>
              <span><strong>3</strong> definições de estratégia</span>
              <span><strong>5</strong> situações-problema</span>
              <span><strong>{config.scenario.durationDays} dias</strong> simulados</span>
            </div>

            <div className={styles.introActions}>
              <button className="primaryButton" type="button" onClick={() => setRun(createRun(config))}>Iniciar desafio</button>
              <button className="secondaryButton" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                Tema {theme === 'dark' ? 'claro' : 'escuro'}
              </button>
            </div>
            <small>{config.brand.supportText}</small>
          </div>
        </section>
      </main>
    );
  }

  const completed = run.currentDecisionIndex >= config.scenario.decisions.length;
  const result: GameResult | null = completed ? calculateResult(run, config) : null;

  if (completed && result) {
    const band = config.scenario.resultBands.find((item) => item.id === result.bandId)!;
    const insightData = {
      strengths: explainResultCard('strengths', run),
      alerts: explainResultCard('alerts', run),
      method: explainResultCard('method', run),
    };

    return (
      <main className={styles.page}>
        <section className={styles.resultHero}>
          <SceneAnimation scene="growth" />
          <div className={styles.resultContent}>
            <span className={styles.kicker}>Resultado final</span>
            <h1>{band.title}</h1>
            <p>{band.summary}</p>
            <div className={styles.scoreRing} style={{ '--score': `${result.score}%` } as CSSProperties}>
              <span>{result.score}</span>
              <small>pontos</small>
            </div>
            <div className={styles.resultGrid}>
              <article className={`${styles.resultCard} panel`}>
                <button className={styles.infoButton} type="button" onClick={() => setOpenInsight(openInsight === 'strengths' ? null : 'strengths')}>!</button>
                <span className="eyebrow">Fortalezas</span>
                <ul className={styles.insightList}>
                  {result.strengths.map((item) => <li key={item} className={styles.positive}>{item}</li>)}
                </ul>
                {openInsight === 'strengths' ? <InsightPopover title="Escolhas que ajudaram neste resultado" lines={insightData.strengths} /> : null}
              </article>
              <article className={`${styles.resultCard} panel`}>
                <button className={styles.infoButton} type="button" onClick={() => setOpenInsight(openInsight === 'alerts' ? null : 'alerts')}>!</button>
                <span className="eyebrow">Atenções</span>
                <ul className={styles.insightList}>
                  {result.alerts.map((item) => <li key={item} className={styles.negative}>{item}</li>)}
                </ul>
                {openInsight === 'alerts' ? <InsightPopover title="Escolhas que puxaram este indicador" lines={insightData.alerts} /> : null}
              </article>
              <article className={`${styles.resultCard} panel`}>
                <button className={styles.infoButton} type="button" onClick={() => setOpenInsight(openInsight === 'method' ? null : 'method')}>!</button>
                <span className="eyebrow">Método</span>
                <p>{band.methodFeedback}</p>
                {openInsight === 'method' ? <InsightPopover title="Resumo das decisões mais influentes" lines={insightData.method} /> : null}
              </article>
            </div>
            <div className={styles.resultActions}>
              <button className="primaryButton" type="button" onClick={restartRun}>Jogar novamente</button>
              <button className="secondaryButton" type="button" onClick={() => setRun(null)}>Voltar para capa</button>
            </div>
          </div>
        </section>

        <section className="panel">
          <span className="eyebrow">Linha do tempo</span>
          <h2>Principais escolhas da partida</h2>
          <div className={styles.timeline}>
            {run.ledger.map((entry, index) => (
              <article key={entry.id} className={styles.timelineItem}>
                <span>{index + 1}</span>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.consequence}</p>
                </div>
                <small>
                  {describeFeedback(entry.delta)
                    .slice(0, 3)
                    .map((item) => `${item.positive ? '↑' : '↓'} ${item.title.replace(item.positive ? ' em alta' : ' pressionado', '')}`)
                    .join(' · ')}
                </small>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const decisionConfig = config.scenario.decisions[run.currentDecisionIndex];
  const currentDecision = personalizeDecision(decisionConfig, run, config);
  const animation = resolveAnimation(run, currentDecision.animation);
  const progress = ((run.currentDecisionIndex + 1) / config.scenario.decisions.length) * 100;
  const currentPhase = run.currentDecisionIndex < STRATEGY_STEPS ? 'Definição de estratégia' : 'Situações-problema';
  const phaseStep = run.currentDecisionIndex < STRATEGY_STEPS
    ? run.currentDecisionIndex + 1
    : run.currentDecisionIndex - STRATEGY_STEPS + 1;
  const phaseTotal = run.currentDecisionIndex < STRATEGY_STEPS
    ? STRATEGY_STEPS
    : config.scenario.decisions.length - STRATEGY_STEPS;

  const confirmChoice = () => {
    if (!selectedChoice) return;
    const originalChoice = decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice;
    const nextRun = applyChoice(run, decisionConfig.id, originalChoice, config);
    const latestEntry = nextRun.ledger[nextRun.ledger.length - 1] ?? null;
    setRun(nextRun);
    setSelectedChoice(null);
    setFeedback(latestEntry ? { entry: latestEntry, mentorTip: currentDecision.mentorTip } : null);
  };

  const sectionTitle = run.currentDecisionIndex < STRATEGY_STEPS ? 'Defina seu plano' : 'Resolva o desafio';

  return (
    <main className={styles.page}>
      <section className={styles.hudSection}>
        <div className={styles.phaseRail}>
          <article className={`${styles.phaseCard} ${run.currentDecisionIndex < STRATEGY_STEPS ? styles.phaseActive : ''}`}>
            <small>Fase 1</small>
            <strong>Estratégia</strong>
            <span>3 escolhas-base</span>
          </article>
          <article className={`${styles.phaseCard} ${run.currentDecisionIndex >= STRATEGY_STEPS ? styles.phaseActive : ''}`}>
            <small>Fase 2</small>
            <strong>Situações</strong>
            <span>5 desafios práticos</span>
          </article>
        </div>
        <MetricStrip values={run.metrics} currency={config.scenario.currency} delta={feedback?.entry.delta} />
        <div className={styles.minorStats}>
          <span>Clientes <strong>{Math.round(run.metrics.customers)}</strong></span>
          <span>Carga <strong>{Math.round(run.metrics.fatigue)}</strong></span>
        </div>
      </section>

      <section className={styles.gameArena}>
        <article className={styles.storyStage}>
          <SceneAnimation scene={animation} />
          <div className={styles.storyOverlay}>
            <div className={styles.storyTopbar}>
              <span className={styles.phaseBadge}>{currentPhase}</span>
              <span className={styles.turnBadge}>Etapa {phaseStep}/{phaseTotal}</span>
            </div>
            <div className={styles.storyProgress}>
              <small>{run.currentDecisionIndex + 1} / {config.scenario.decisions.length}</small>
              <div><i style={{ width: `${progress}%` }} /></div>
            </div>
            <span className={styles.kicker}>{currentDecision.eyebrow}</span>
            <h1>{currentDecision.title}</h1>
            <p>{currentDecision.situation}</p>
          </div>
        </article>

        <section className={styles.decisionPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.commandTag}>Escolha agora</span>
            <h2>{sectionTitle}</h2>
            <p>Observe a cena, compare as opções e escolha a ação com mais coerência para o seu negócio.</p>
          </div>

          <div className={styles.choiceGrid}>
            {currentDecision.choices.map((choice) => {
              const originalChoice = decisionConfig.choices.find((item) => item.id === choice.id) ?? choice;
              const availability = choiceAvailability(originalChoice, run, config);
              const cost = equipmentCost(originalChoice, config);
              const impactPreview = describeChoiceImpact(choice.effects);
              return (
                <button
                  key={choice.id}
                  className={styles.choiceCard}
                  type="button"
                  disabled={!availability.available}
                  onClick={() => setSelectedChoice(choice)}
                >
                  <ChoiceVisual decisionId={decisionConfig.id} choiceId={choice.id} />
                  <div className={styles.choiceBody}>
                    <div className={styles.choiceHeader}>
                      <h3>{choice.label}</h3>
                      {cost > 0 ? <strong className={styles.choiceCost}>{formatCurrency(cost, config.scenario.currency)}</strong> : null}
                    </div>
                    <p>{choice.description}</p>
                    <div className={styles.impactRow}>
                      {impactPreview.map((item) => (
                        <span key={item.key} className={item.positive ? styles.goodPill : styles.badPill}>
                          {item.positive ? '↑' : '↓'} {item.label}
                        </span>
                      ))}
                    </div>
                    <small className={styles.choiceHint}>{availability.available ? choice.consequence : availability.reason}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      {selectedChoice && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setSelectedChoice(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <span className={styles.kicker}>Confirmar decisão</span>
            <h2>{selectedChoice.label}</h2>
            <p>{selectedChoice.consequence}</p>
            <div className={styles.modalEconomy}>
              <span>Caixa atual <strong>{formatCurrency(run.metrics.cash)}</strong></span>
              <span>Impacto <strong>{formatCurrency(choiceAvailability(decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice, run, config).effectiveCashDelta)}</strong></span>
              <span>Caixa previsto <strong>{formatCurrency(run.metrics.cash + choiceAvailability(decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice, run, config).effectiveCashDelta)}</strong></span>
            </div>
            <div className={styles.modalActions}>
              <button className="secondaryButton" type="button" onClick={() => setSelectedChoice(null)}>Voltar</button>
              <button className="primaryButton" type="button" onClick={confirmChoice}>Confirmar escolha</button>
            </div>
          </section>
        </div>
      )}

      {feedback && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={`${styles.modal} ${styles.feedbackModal}`} role="dialog" aria-modal="true">
            <span className={styles.kicker}>Consequência da escolha</span>
            <h2>{feedback.entry.title}</h2>
            <p>{feedback.entry.consequence}</p>
            <div className={styles.feedbackGrid}>
              {describeFeedback(feedback.entry.delta).map((item) => (
                <article key={item.key} className={`${styles.feedbackStat} ${item.positive ? styles.goodFeedback : styles.badFeedback}`}>
                  <small>{item.positive ? '↑' : '↓'} {getMetricLabel(item.key)}</small>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </article>
              ))}
            </div>
            <div className={styles.feedbackNote}>
              <strong>Leitura do método</strong>
              <span>{feedback.mentorTip}</span>
            </div>
            <div className={styles.modalActions}>
              <button className="primaryButton" type="button" onClick={() => setFeedback(null)}>
                {run.currentDecisionIndex >= config.scenario.decisions.length ? 'Ver resultado' : 'Continuar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InsightPopover({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className={styles.insightPopover}>
      <strong>{title}</strong>
      <ul>
        {lines.length ? lines.map((line) => <li key={line}>{line}</li>) : <li>Nenhuma escolha específica se destacou isoladamente.</li>}
      </ul>
    </div>
  );
}

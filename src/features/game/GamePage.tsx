import { useEffect, useState } from 'react';
import { ChoiceVisual } from '../../components/ChoiceVisual';
import { MetricStrip } from '../../components/MetricStrip';
import { SceneAnimation } from '../../components/SceneAnimation';
import { StarRating } from '../../components/StarRating';
import { useAppConfig } from '../../context/AppConfigContext';
import type { DecisionChoice } from '../../types/config';
import type { GameResult, GameRun, LedgerEntry } from '../../types/game';
import { formatCurrency } from '../../utils/format';
import { readJson, storageKeys, writeJson } from '../../utils/storage';
import {
  applyChoice,
  calculateResult,
  calculateScoreFromMetrics,
  calculateStepStarGain,
  choiceAvailability,
  createRun,
  equipmentCost,
  resolveAnimation,
  scoreToStars,
} from './gameEngine';
import {
  describeChoiceImpact,
  describeFeedback,
  explainResultCard,
  getMetricLabel,
  personalizeDecision,
  summarizeConsequence,
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
  const [expandedResultCard, setExpandedResultCard] = useState<InsightCard>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [showPhaseTwoTeaser, setShowPhaseTwoTeaser] = useState(false);

  useEffect(() => {
    if (run) writeJson(storageKeys.RUN_KEY, run);
    else localStorage.removeItem(storageKeys.RUN_KEY);
  }, [run]);

  const restartRun = () => {
    setSelectedChoice(null);
    setFeedback(null);
    setOpenInsight(null);
    setExpandedResultCard(null);
    setTimelineExpanded(false);
    setShowPhaseTwoTeaser(false);
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
              <span><strong>Fase 1</strong> estratégia + desafios</span>
              <span><strong>3</strong> definições de estratégia</span>
              <span><strong>5</strong> situações-problema</span>
            </div>

            <div className={styles.introActions}>
              <button className="primaryButton" type="button" onClick={() => { setShowPhaseTwoTeaser(false); setRun(createRun(config)); }}>Iniciar desafio</button>
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

  if (completed && showPhaseTwoTeaser) {
    return (
      <main className={styles.page}>
        <section className={styles.phaseBreakHero}>
          <SceneAnimation scene="growth" />
          <div className={styles.phaseBreakContent}>
            <span className={styles.kicker}>Fase 2</span>
            <h1>Próximo módulo em desenvolvimento</h1>
            <p>
              A fase 2 do jogo será desenvolvida conforme o método de ensino abordado,
              trazendo novos cenários, decisões e aprofundamentos práticos para o criador.
            </p>
            <div className={styles.phaseBreakSummary}>
              <StarRating value={result?.stars ?? 0} size="md" label="Classificação da fase 1" />
              <span>Fase 1 concluída com <strong>{result?.stars.toFixed(1) ?? '0.0'} / 5.0</strong></span>
            </div>
            <div className={styles.resultActions}>
              <button className="primaryButton" type="button" onClick={() => setShowPhaseTwoTeaser(false)}>Voltar ao resultado da fase 1</button>
              <button className="secondaryButton" type="button" onClick={restartRun}>Jogar novamente</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (completed && result) {
    const band = config.scenario.resultBands.find((item) => item.id === result.bandId)!;
    const insightData = {
      strengths: explainResultCard('strengths', run),
      alerts: explainResultCard('alerts', run),
      method: explainResultCard('method', run),
    };
    const improvementGuide = buildImprovementGuide(run, result);

    const cardIsExpanded = (card: Exclude<InsightCard, null>) =>
      expandedResultCard === card || openInsight === card;

    return (
      <main className={styles.page}>
        <section className={styles.resultHero}>
          <SceneAnimation scene={getResultScene(result.stars)} />
          <div className={styles.resultContent}>
            <span className={styles.kicker}>Resultado final da fase 1</span>
            <h1>{band.title}</h1>
            <p>{band.summary}</p>
            <div className={styles.ratingShowcase}>
              <StarRating value={result.stars} size="xl" animated label="Classificação do jogador" />
              <div className={styles.ratingNote}>
                <strong>{result.stars.toFixed(1)} / 5.0 estrelas</strong>
                <span>Seu desempenho final combina caixa, reputação, qualidade, capacidade, risco e carga operacional.</span>
              </div>
            </div>
            <div className={styles.resultActions}>
              <button className="primaryButton" type="button" onClick={() => setShowPhaseTwoTeaser(true)}>Ir para a fase 2</button>
              <button className="secondaryButton" type="button" onClick={restartRun}>Jogar novamente</button>
              <button className="secondaryButton" type="button" onClick={() => { setShowPhaseTwoTeaser(false); setRun(null); }}>Voltar para capa</button>
            </div>
          </div>
        </section>

        <section className={styles.resultDetailsSection}>
          <div className={styles.resultSectionHeader}>
            <div>
              <span className="eyebrow">Diagnóstico da fase 1</span>
              <h2>Entenda seu resultado sem perder a visão geral</h2>
            </div>
            <p>Abra apenas o bloco que deseja analisar. Os demais permanecem compactos para evitar excesso de informação.</p>
          </div>

          <div className={styles.resultGrid}>
            <article className={`${styles.resultCard} panel ${cardIsExpanded('strengths') ? styles.resultCardExpanded : styles.resultCardCollapsed}`}>
              <button className={styles.infoButton} type="button" onClick={() => setOpenInsight(openInsight === 'strengths' ? null : 'strengths')}>!</button>
              <div className={styles.resultCardBody}>
                <span className="eyebrow">Fortalezas</span>
                <ul className={styles.insightList}>
                  {result.strengths.map((item) => <li key={item} className={styles.positive}>{item}</li>)}
                </ul>
                {openInsight === 'strengths' ? <InsightPopover title="Escolhas que fortaleceram este resultado" lines={insightData.strengths} /> : null}
              </div>
              <button
                className={styles.readMoreButton}
                type="button"
                onClick={() => setExpandedResultCard(expandedResultCard === 'strengths' ? null : 'strengths')}
              >
                {expandedResultCard === 'strengths' ? 'Recolher' : 'Ler mais'}
              </button>
            </article>

            <article className={`${styles.resultCard} panel ${cardIsExpanded('alerts') ? styles.resultCardExpanded : styles.resultCardCollapsed}`}>
              <button className={styles.infoButton} type="button" onClick={() => setOpenInsight(openInsight === 'alerts' ? null : 'alerts')}>!</button>
              <div className={styles.resultCardBody}>
                <span className="eyebrow">Atenções</span>
                <ul className={styles.insightList}>
                  {result.alerts.map((item) => <li key={item} className={styles.negative}>{item}</li>)}
                </ul>
                {openInsight === 'alerts' ? <InsightPopover title="Escolhas que puxaram o resultado para baixo" lines={insightData.alerts} /> : null}
              </div>
              <button
                className={styles.readMoreButton}
                type="button"
                onClick={() => setExpandedResultCard(expandedResultCard === 'alerts' ? null : 'alerts')}
              >
                {expandedResultCard === 'alerts' ? 'Recolher' : 'Ler mais'}
              </button>
            </article>

            <article className={`${styles.resultCard} panel ${cardIsExpanded('method') ? styles.resultCardExpanded : styles.resultCardCollapsed}`}>
              <button className={styles.infoButton} type="button" onClick={() => setOpenInsight(openInsight === 'method' ? null : 'method')}>!</button>
              <div className={styles.resultCardBody}>
                <span className="eyebrow">Método</span>
                <p>{band.methodFeedback}</p>
                <ul className={styles.methodGuideList}>
                  {improvementGuide.map((item) => <li key={item}>{item}</li>)}
                </ul>
                {openInsight === 'method' ? <InsightPopover title="Resumo das decisões mais influentes" lines={insightData.method} /> : null}
              </div>
              <button
                className={styles.readMoreButton}
                type="button"
                onClick={() => setExpandedResultCard(expandedResultCard === 'method' ? null : 'method')}
              >
                {expandedResultCard === 'method' ? 'Recolher' : 'Ler mais'}
              </button>
            </article>
          </div>
        </section>

        <section className={`${styles.historySection} panel`}>
          <div className={styles.historyHeader}>
            <div>
              <span className="eyebrow">Linha do tempo</span>
              <h2>Principais escolhas da partida</h2>
              <p>{run.ledger.length} decisões registradas nesta fase.</p>
            </div>
            <button className={styles.historyToggle} type="button" onClick={() => setTimelineExpanded((current) => !current)}>
              {timelineExpanded ? 'Recolher histórico' : 'Ver histórico completo'}
            </button>
          </div>

          {timelineExpanded ? (
            <div className={styles.timeline}>
              {run.ledger.map((entry, index) => (
                <article key={entry.id} className={styles.timelineItem}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{summarizeConsequence(entry.consequence)}</p>
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
          ) : (
            <div className={styles.historyPreview}>
              <span>{run.ledger[0]?.title ?? 'Primeira decisão registrada'}</span>
              <i />
              <span>{run.ledger.at(-1)?.title ?? 'Última decisão registrada'}</span>
            </div>
          )}
        </section>
      </main>
    );
  }

  const decisionConfig = config.scenario.decisions[run.currentDecisionIndex];
  const currentDecision = personalizeDecision(decisionConfig, run, config);
  const animation = resolveAnimation(run, currentDecision.animation);
  const progress = ((run.currentDecisionIndex + 1) / config.scenario.decisions.length) * 100;
  const currentPhase = run.currentDecisionIndex < STRATEGY_STEPS
    ? 'Fase 1 • Definição de estratégia'
    : 'Fase 1 • Situações-problema';
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
          <article className={`${styles.phaseCard} ${styles.phaseActive}`}>
            <small>Fase 1</small>
            <strong>Estratégia + desafios</strong>
            <span>8 decisões jogáveis</span>
          </article>
          <article className={styles.phaseCard}>
            <small>Fase 2</small>
            <strong>Próximo módulo</strong>
            <span>em desenvolvimento</span>
          </article>
        </div>
        <MetricStrip values={run.metrics} currency={config.scenario.currency} delta={feedback?.entry.delta} />
        <div className={styles.minorStats}>
          <span>Clientes <strong>{Math.round(run.metrics.customers)}</strong></span>
          <span>Carga <strong>{Math.round(run.metrics.fatigue)}</strong></span>
          <span>Classificação <strong>{scoreToStars(calculateScoreFromMetrics(run.metrics, config)).toFixed(1)}★</strong></span>
        </div>
      </section>

      <section className={styles.gameArena}>
        <article className={styles.storyStage}>
          <SceneAnimation scene={animation} />
          <div className={styles.storyOverlay}>
            <div className={styles.storyTopbar}>
              <span className={styles.phaseBadge}>{currentPhase}</span>
            </div>
            <div className={styles.storyProgress}>
              <small>{run.currentDecisionIndex + 1}/{config.scenario.decisions.length}</small>
              <div><i style={{ width: `${progress}%` }} /></div>
            </div>
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
                    <small className={styles.choiceHint}>{availability.available ? summarizeConsequence(choice.consequence) : availability.reason}</small>
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
            <p>{summarizeConsequence(selectedChoice.consequence)}</p>
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
        <FeedbackModal
          feedback={feedback}
          config={config}
          onClose={() => setFeedback(null)}
          completed={run.currentDecisionIndex >= config.scenario.decisions.length}
        />
      )}
    </main>
  );
}

function getResultScene(stars: number): "result-1star" | "result-2star" | "result-3star" | "result-4star" | "result-5star" {
  if (stars < 1.5) return "result-1star";
  if (stars < 2.5) return "result-2star";
  if (stars < 3.5) return "result-3star";
  if (stars < 4.5) return "result-4star";
  return "result-5star";
}

function FeedbackModal({
  feedback,
  config,
  onClose,
  completed,
}: {
  feedback: { entry: LedgerEntry; mentorTip: string };
  config: ReturnType<typeof useAppConfig>['config'];
  onClose: () => void;
  completed: boolean;
}) {
  const stageStars = calculateStepStarGain(feedback.entry.before, feedback.entry.after, config);
  const projectedStars = scoreToStars(calculateScoreFromMetrics(feedback.entry.after, config));

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modal} ${styles.feedbackModal}`} role="dialog" aria-modal="true">
        <span className={styles.kicker}>Consequência da escolha</span>
        <h2>{feedback.entry.title}</h2>
        <p>{summarizeConsequence(feedback.entry.consequence)}</p>
        <div className={styles.rewardPanel}>
          <div className={styles.rewardCopy}>
            <small>Mini estrelas da etapa</small>
            <strong>+{stageStars.toFixed(1)}★</strong>
            <span>Projeção atual: {projectedStars.toFixed(1)} / 5.0 estrelas</span>
          </div>
          <StarRating value={projectedStars} size="md" animated showValue={false} />
        </div>
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
          <button className="primaryButton" type="button" onClick={onClose}>
            {completed ? 'Ver resultado' : 'Continuar'}
          </button>
        </div>
      </section>
    </div>
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

function buildImprovementGuide(run: GameRun, result: GameResult): string[] {
  const guide: string[] = [];

  if (run.metrics.cash < 3500) {
    guide.push('Na próxima tentativa, observe como decisões que consomem caixa cedo limitam sua margem para corrigir imprevistos depois.');
  }
  if (run.metrics.reputation < 55 || run.metrics.quality < 60) {
    guide.push('Repare se a promessa comercial, o prazo e o padrão de entrega caminharam juntos ao longo da rodada.');
  }
  if (run.metrics.risk > 40 || run.metrics.fatigue > 45) {
    guide.push('Preste atenção em escolhas que aceleram o negócio, mas deixam a operação mais dependente de esforço extra ou retrabalho.');
  }
  if (guide.length < 3 && result.stars >= 3.5) {
    guide.push('Você já montou uma base sólida; tente identificar onde crescer sem perder o equilíbrio entre margem, rotina e percepção do cliente.');
  }
  if (guide.length < 3) {
    guide.push('Compare o histórico da partida e procure padrões: normalmente o melhor resultado nasce do equilíbrio, e não de uma única escolha chamativa.');
  }

  return guide.slice(0, 3);
}

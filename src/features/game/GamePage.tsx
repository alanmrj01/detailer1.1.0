import { useEffect, useState, type CSSProperties } from 'react';
import { ChoiceVisual } from '../../components/ChoiceVisual';
import { MetricStrip } from '../../components/MetricStrip';
import { SceneAnimation } from '../../components/SceneAnimation';
import { StarRating } from '../../components/StarRating';
import { useAppConfig } from '../../context/AppConfigContext';
import type { DecisionChoice, MetricKey, NumericMetrics } from '../../types/config';
import type { GameResult, GameRun, LedgerEntry } from '../../types/game';
import { formatCurrency } from '../../utils/format';
import { readJson, storageKeys, writeJson } from '../../utils/storage';
import {
  applyChoice,
  calculateResult,
  calculateScoreFromMetrics,
  calculateStepStarChange,
  choiceAvailability,
  createRun,
  ensureRunScenarioSnapshot,
  equipmentCost,
  resolveAnimation,
  resolveRunConfig,
  scoreToStars,
} from './gameEngine';
import {
  describeChoiceImpact,
  describeFeedback,
  explainResultCard,
  getMetricLabel,
  personalizeDecision,
  personalizeScenarioCopy,
  summarizeConsequence,
} from './narrative';
import styles from './GamePage.module.css';

const STRATEGY_STEPS = 3;

type InsightCard = 'strengths' | 'alerts' | 'method' | null;

interface GamePageProps {
  onGameplayStateChange?: (active: boolean) => void;
}

export function GamePage({ onGameplayStateChange }: GamePageProps) {
  const { config, theme, setTheme } = useAppConfig();
  const [run, setRun] = useState<GameRun | null>(() => {
    const stored = readJson<GameRun>(storageKeys.RUN_KEY);
    return stored ? ensureRunScenarioSnapshot(stored, config) : null;
  });
  const [selectedChoice, setSelectedChoice] = useState<DecisionChoice | null>(null);
  const [feedback, setFeedback] = useState<{ entry: LedgerEntry; mentorTip: string } | null>(null);
  const [openInsight, setOpenInsight] = useState<InsightCard>(null);
  const [expandedResultCard, setExpandedResultCard] = useState<InsightCard>(null);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [showPhaseTwoTeaser, setShowPhaseTwoTeaser] = useState(false);
  const [mobileMetricsOpen, setMobileMetricsOpen] = useState(false);
  const activeConfig = run ? resolveRunConfig(run, config) : config;
  const gameplayActive = Boolean(run && run.currentDecisionIndex < activeConfig.scenario.decisions.length);

  useEffect(() => {
    if (run) writeJson(storageKeys.RUN_KEY, run);
    else localStorage.removeItem(storageKeys.RUN_KEY);
  }, [run]);

  useEffect(() => {
    onGameplayStateChange?.(gameplayActive);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.gameplayActive = gameplayActive ? 'true' : 'false';
    }

    return () => {
      onGameplayStateChange?.(false);
      if (typeof document !== 'undefined') {
        delete document.documentElement.dataset.gameplayActive;
      }
    };
  }, [gameplayActive, onGameplayStateChange]);

  const restartRun = () => {
    setSelectedChoice(null);
    setFeedback(null);
    setOpenInsight(null);
    setExpandedResultCard(null);
    setTimelineExpanded(false);
    setShowPhaseTwoTeaser(false);
    setMobileMetricsOpen(false);
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
            <span className={styles.introTagline}>{personalizeScenarioCopy(config.brand.tagline, config)}</span>
            <h1>{personalizeScenarioCopy(config.brand.introTitle, config)}</h1>
            <p>{personalizeScenarioCopy(config.brand.introDescription, config)}</p>

            <div className={styles.introStats}>
              <span><strong>{config.scenario.durationDays}</strong> dias de simulação</span>
              <span><strong>3</strong> definições de estratégia</span>
              <span><strong>5</strong> situações-problema</span>
            </div>

            <div className={styles.introActions}>
              <button className="primaryButton" type="button" onClick={() => { setShowPhaseTwoTeaser(false); setRun(createRun(config)); }}>Iniciar desafio</button>
              <button className="secondaryButton" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                Tema {theme === 'dark' ? 'claro' : 'escuro'}
              </button>
            </div>
            <small>{personalizeScenarioCopy(config.brand.supportText, config)}</small>
          </div>
        </section>
      </main>
    );
  }

  const completed = run.currentDecisionIndex >= activeConfig.scenario.decisions.length;
  const result: GameResult | null = completed ? calculateResult(run, activeConfig) : null;

  if (completed && showPhaseTwoTeaser) {
    return (
      <main className={styles.page}>
        <section className={styles.phaseBreakHero}>
          <SceneAnimation scene="growth" />
          <div className={styles.phaseBreakContent}>
            <span className={styles.kicker}>Prévia de expansão futura</span>
            <h1>A fase 1 termina aqui — a fase 2 é uma possibilidade futura</h1>
            <p>
              Esta tela apresenta apenas a direção planejada para uma próxima evolução do produto.
              Ela não faz parte da rodada atual e poderá receber novos cenários conforme o método do criador.
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
    const band = activeConfig.scenario.resultBands.find((item) => item.id === result.bandId)!;
    const insightData = {
      strengths: explainResultCard('strengths', run, activeConfig, result),
      alerts: explainResultCard('alerts', run, activeConfig, result),
      method: explainResultCard('method', run, activeConfig, result),
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
              <button className="primaryButton" type="button" onClick={restartRun}>Jogar novamente</button>
              <button className="secondaryButton" type="button" onClick={() => setShowPhaseTwoTeaser(true)}>Ver prévia da fase 2</button>
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
                {openInsight === 'strengths' ? <InsightPopover title="Decisões que mais influenciaram estas fortalezas" lines={insightData.strengths} /> : null}
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
                <span className="eyebrow">{result.stars >= 5 ? 'Manutenção do padrão' : 'Atenções'}</span>
                <ul className={styles.insightList}>
                  {result.alerts.map((item) => <li key={item} className={result.stars >= 5 ? styles.positive : styles.negative}>{item}</li>)}
                </ul>
                {openInsight === 'alerts' ? <InsightPopover title={result.stars >= 5 ? 'Como preservar o resultado máximo' : 'Trade-offs ligados a estas atenções'} lines={insightData.alerts} /> : null}
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

  const decisionConfig = activeConfig.scenario.decisions[run.currentDecisionIndex];
  const currentDecision = personalizeDecision(decisionConfig, run, activeConfig);
  const animation = resolveAnimation(run, currentDecision.animation);
  const progress = ((run.currentDecisionIndex + 1) / activeConfig.scenario.decisions.length) * 100;
  const currentPhase = `Fase 1 • ${currentDecision.module}`;
  const currentStars = scoreToStars(calculateScoreFromMetrics(run.metrics, activeConfig));

  const confirmChoice = () => {
    if (!selectedChoice) return;
    const originalChoice = decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice;
    const nextRun = applyChoice(run, decisionConfig.id, originalChoice, activeConfig);
    const latestEntry = nextRun.ledger[nextRun.ledger.length - 1] ?? null;
    setRun(nextRun);
    setSelectedChoice(null);
    setFeedback(latestEntry ? { entry: latestEntry, mentorTip: currentDecision.mentorTip } : null);
  };

  const sectionTitle = run.currentDecisionIndex < STRATEGY_STEPS ? 'Defina seu plano' : 'Resolva o desafio';
  const mobileSectionTitle = 'Escolha uma opção';
  const selectedOriginalChoice = selectedChoice
    ? (decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice)
    : null;
  const selectedChoiceCost = selectedOriginalChoice ? equipmentCost(selectedOriginalChoice, activeConfig) : 0;
  const selectedImpacts = selectedChoice ? describeChoiceImpact(selectedChoice.effects) : [];

  return (
    <main className={`${styles.page} ${styles.gameplayPage}`}>
      <section className={styles.mobileHud} aria-label="Resumo da rodada">
        <div className={styles.mobileHudTop}>
          <div className={styles.mobileBrandMark}>DB</div>
          <div className={styles.mobilePhaseCopy}>
            <strong>Decisão {run.currentDecisionIndex + 1}/{activeConfig.scenario.decisions.length}</strong>
            <span>{currentDecision.module}</span>
          </div>
          <div className={styles.mobileRating}>
            <strong>{currentStars.toFixed(1).replace('.', ',')}★</strong>
            <span>classificação</span>
          </div>
        </div>

        <div className={styles.mobileMetricsSummary}>
          <article>
            <span>Caixa</span>
            <strong>{formatCurrency(run.metrics.cash, activeConfig.scenario.currency)}</strong>
          </article>
          <article>
            <span>Reputação</span>
            <strong>{Math.round(run.metrics.reputation)}</strong>
          </article>
          <article>
            <span>Qualidade</span>
            <strong>{Math.round(run.metrics.quality)}</strong>
          </article>
          <button type="button" onClick={() => setMobileMetricsOpen(true)}>Ver todos</button>
        </div>
      </section>
      <section className={styles.hudSection}>
        <div className={styles.phaseRail}>
          <article className={`${styles.phaseCard} ${styles.phaseActive}`}>
            <small>Fase 1</small>
            <strong>Estratégia + desafios</strong>
            <span>8 decisões jogáveis</span>
          </article>
          <article className={styles.phaseCard}>
            <small>Expansão futura</small>
            <strong>Fase 2 • prévia</strong>
            <span>não faz parte desta rodada</span>
          </article>
        </div>
        <MetricStrip values={run.metrics} currency={activeConfig.scenario.currency} delta={feedback?.entry.delta} />
        <div className={styles.minorStats}>
          <span>Clientes <strong>{Math.round(run.metrics.customers)}</strong></span>
          <span>Carga <strong>{Math.round(run.metrics.fatigue)}</strong></span>
          <span>Classificação <strong>{currentStars.toFixed(1)}★</strong></span>
        </div>
      </section>

      <section className={styles.gameArena}>
        <article className={styles.storyStage}>
          <SceneAnimation scene={animation} />
          <div className={styles.storyOverlay}>
            <div className={styles.storyTopbar}>
              <span className={styles.phaseBadge}>{currentPhase}</span>
              <span className={styles.turnBadge}>{currentDecision.eyebrow}</span>
            </div>
            <div className={styles.storyProgress}>
              <small>{run.currentDecisionIndex + 1}/{activeConfig.scenario.decisions.length}</small>
              <div><i style={{ width: `${progress}%` }} /></div>
            </div>
            <h1>{currentDecision.title}</h1>
            <p className={styles.desktopStorySituation}>{currentDecision.situation}</p>
            <p className={styles.mobileStorySituation}>{getMobileSituation(decisionConfig.id, currentDecision.situation)}</p>
          </div>
        </article>

        <section className={styles.decisionPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.commandTag}>Escolha agora</span>
            <h2>
              <span className={styles.desktopSectionTitle}>{sectionTitle}</span>
              <span className={styles.mobileSectionTitle}>{mobileSectionTitle}</span>
            </h2>
            <p>Observe a cena, compare as opções e escolha a ação com mais coerência para o seu negócio.</p>
          </div>

          <div
            className={styles.choiceGrid}
            style={{ '--mobile-choice-count': currentDecision.choices.length } as CSSProperties}
          >
            {currentDecision.choices.map((choice) => {
              const originalChoice = decisionConfig.choices.find((item) => item.id === choice.id) ?? choice;
              const availability = choiceAvailability(originalChoice, run, activeConfig, decisionConfig.id);
              const cost = equipmentCost(originalChoice, activeConfig);
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
                      {cost > 0 ? <strong className={styles.choiceCost}>{formatCurrency(cost, activeConfig.scenario.currency)}</strong> : null}
                    </div>
                    <p>{choice.description}</p>
                    <div className={styles.impactRow}>
                      {impactPreview.map((item) => (
                        <span key={item.key} className={styles.impactPill}>
                          Impacta {item.label}
                        </span>
                      ))}
                    </div>
                    {!availability.available ? <small className={styles.choiceHint}>{availability.reason}</small> : null}
                  </div>
                  <span className={styles.choiceChevron} aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
        </section>
      </section>

      {mobileMetricsOpen ? (
        <MobileMetricsDrawer
          metrics={run.metrics}
          currency={activeConfig.scenario.currency}
          onClose={() => setMobileMetricsOpen(false)}
        />
      ) : null}

      {selectedChoice && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setSelectedChoice(null)}>
          <section className={styles.modal} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <span className={styles.mobileSheetHandle} aria-hidden="true" />
            <span className={styles.kicker}>Confirmar decisão</span>
            <h2 className={styles.desktopConfirmationTitle}>{selectedChoice.label}</h2>
            <h2 className={styles.mobileConfirmationTitle}>Confirmar escolha?</h2>
            <p className={styles.desktopConfirmationDescription}>{selectedChoice.description}</p>
            <p className={styles.mobileConfirmationDescription}>Revise sua escolha e os impactos previstos antes de continuar.</p>

            <div className={styles.mobileSelectedChoice}>
              <ChoiceVisual decisionId={decisionConfig.id} choiceId={selectedChoice.id} />
              <div>
                <strong>{selectedChoice.label}</strong>
                <span>{selectedChoice.description}</span>
              </div>
              {selectedChoiceCost > 0 ? (
                <b>{formatCurrency(selectedChoiceCost, activeConfig.scenario.currency)}</b>
              ) : null}
            </div>

            <small className={styles.decisionPrivacy}>A consequência completa será revelada depois da confirmação.</small>
            <div className={styles.modalEconomy}>
              <span>Caixa atual <strong>{formatCurrency(run.metrics.cash, activeConfig.scenario.currency)}</strong></span>
              <span>Impacto <strong>{formatCurrency(choiceAvailability(decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice, run, activeConfig, decisionConfig.id).effectiveCashDelta, activeConfig.scenario.currency)}</strong></span>
              <span>Caixa previsto <strong>{formatCurrency(run.metrics.cash + choiceAvailability(decisionConfig.choices.find((item) => item.id === selectedChoice.id) ?? selectedChoice, run, activeConfig, decisionConfig.id).effectiveCashDelta, activeConfig.scenario.currency)}</strong></span>
            </div>

            <div className={styles.mobileImpactPreview}>
              <strong>Impactos previstos</strong>
              <div>
                {selectedImpacts.slice(0, 3).map((item) => (
                  <span key={item.key}>
                    <i aria-hidden="true">{getMobileMetricIcon(item.key)}</i>
                    <small>{item.label}</small>
                    <b>Área impactada</b>
                  </span>
                ))}
              </div>
              <p>O resultado aparece depois da confirmação.</p>
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
          config={activeConfig}
          onClose={() => setFeedback(null)}
          completed={run.currentDecisionIndex >= activeConfig.scenario.decisions.length}
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

function MobileMetricsDrawer({
  metrics,
  currency,
  onClose,
}: {
  metrics: NumericMetrics;
  currency: string;
  onClose: () => void;
}) {
  const items: Array<{ key: keyof NumericMetrics; label: string; value: string; icon: string }> = [
    { key: 'cash', label: 'Caixa', value: formatCurrency(metrics.cash, currency), icon: '▣' },
    { key: 'reputation', label: 'Reputação', value: Math.round(metrics.reputation).toString(), icon: '★' },
    { key: 'quality', label: 'Qualidade', value: Math.round(metrics.quality).toString(), icon: '✓' },
    { key: 'capacity', label: 'Capacidade', value: Math.round(metrics.capacity).toString(), icon: '▱' },
    { key: 'risk', label: 'Risco', value: Math.round(metrics.risk).toString(), icon: '!' },
    { key: 'customers', label: 'Clientes', value: Math.round(metrics.customers).toString(), icon: '◉' },
    { key: 'fatigue', label: 'Carga', value: metrics.fatigue.toFixed(2).replace('.', ','), icon: '◔' },
  ];

  return (
    <div className={`${styles.modalBackdrop} ${styles.mobileDrawerBackdrop}`} role="presentation" onMouseDown={onClose}>
      <section className={styles.mobileMetricsDrawer} role="dialog" aria-modal="true" aria-labelledby="mobile-metrics-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className={styles.mobileSheetHandle} aria-hidden="true" />
        <div className={styles.mobileDrawerHeader}>
          <h2 id="mobile-metrics-title">Indicadores da operação</h2>
          <button type="button" onClick={onClose} aria-label="Fechar indicadores">×</button>
        </div>
        <div className={styles.mobileMetricsGrid}>
          {items.map((item) => (
            <article key={item.key} className={item.key === 'fatigue' ? styles.mobileMetricWide : undefined}>
              <i aria-hidden="true">{item.icon}</i>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        <p className={styles.mobileDrawerHint}>Feche o painel para continuar a decisão.</p>
      </section>
    </div>
  );
}

function getMobileMetricIcon(key: MetricKey | string): string {
  const icons: Record<string, string> = {
    cash: '▣',
    reputation: '★',
    quality: '✓',
    capacity: '▱',
    risk: '!',
    customers: '◉',
    fatigue: '◔',
  };

  return icons[key] ?? '•';
}

function getMobileSituation(decisionId: string, currentSituation: string): string {
  const defaults: Record<string, { marker: string; copy: string }> = {
    'operation-model': { marker: 'Você tem pouco capital', copy: 'Escolha uma estrutura compatível com seu caixa e sua capacidade de atrair os primeiros clientes.' },
    'equipment-plan': { marker: 'Os valores são calculados automaticamente', copy: 'Escolha um conjunto compatível com o serviço de entrada e preserve capital de giro.' },
    'service-focus': { marker: 'Seu catálogo precisa caber', copy: 'Escolha um serviço que sua estrutura e seus equipamentos consigam entregar bem.' },
    'first-quote': { marker: 'Um cliente com', copy: 'Defina um preço que comunique valor sem comprometer margem e capacidade de entrega.' },
    'slow-week': { marker: 'Dois dias se passaram', copy: 'Reaja à agenda vazia sem destruir margem ou posicionamento.' },
    'execution-pressure': { marker: 'O carro atual exigiu', copy: 'Decida como proteger a entrega quando prazo e qualidade entram em conflito.' },
    'customer-complaint': { marker: 'O cliente do', copy: 'Resolva a falha sem perder responsabilidade, reputação e controle do custo.' },
    'growth-choice': { marker: 'A operação já possui histórico', copy: 'Use o caixa restante para crescer sem fragilizar a operação.' },
  };
  const preferred = defaults[decisionId];
  if (preferred && currentSituation.includes(preferred.marker)) return preferred.copy;
  const firstSentence = currentSituation.split(/(?<=[.!?])\s+/)[0]?.trim();
  return firstSentence || currentSituation;
}

function buildMobileFeedbackSummary(
  items: ReturnType<typeof describeFeedback>,
  lostClassification: boolean,
  gainedClassification: boolean,
): string {
  const relevant = items.filter((item) => (lostClassification ? !item.positive : item.positive)).slice(0, 2);
  const labels = relevant.map((item) => getMetricLabel(item.key).toLowerCase());

  if (lostClassification) {
    if (labels.length >= 2) return `A escolha pressionou ${labels[0]} e ${labels[1]}, reduzindo a projeção da operação.`;
    if (labels.length === 1) return `A escolha pressionou ${labels[0]} e reduziu a projeção da operação.`;
    return 'A escolha gerou mais perdas do que ganhos nesta etapa.';
  }
  if (gainedClassification) {
    if (labels.length >= 2) return `A escolha fortaleceu ${labels[0]} e ${labels[1]}, elevando a projeção da operação.`;
    if (labels.length === 1) return `A escolha fortaleceu ${labels[0]} e elevou a projeção da operação.`;
    return 'A escolha fortaleceu o equilíbrio da operação nesta etapa.';
  }
  return 'Os ganhos e os trade-offs se equilibraram, mantendo a classificação atual.';
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
  const stageStarChange = calculateStepStarChange(feedback.entry.before, feedback.entry.after, config);
  const lostClassification = stageStarChange < 0;
  const gainedClassification = stageStarChange > 0;
  const projectedStars = scoreToStars(calculateScoreFromMetrics(feedback.entry.after, config));
  const feedbackItems = describeFeedback(feedback.entry.delta);
  const positiveItems = feedbackItems.filter((item) => item.positive);
  const attentionItems = feedbackItems.filter((item) => !item.positive);
  const mobileStatusTitle = lostClassification
    ? 'Classificação em queda'
    : gainedClassification
      ? 'Classificação em alta'
      : 'Classificação mantida';

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modal} ${styles.feedbackModal}`} role="dialog" aria-modal="true">
        <span className={styles.mobileSheetHandle} aria-hidden="true" />
        <span className={styles.kicker}>Consequência da escolha</span>
        <h2 className={styles.desktopFeedbackTitle}>{feedback.entry.title}</h2>
        <h2 className={styles.mobileFeedbackTitle}>{mobileStatusTitle}</h2>
        <p className={`${styles.feedbackConsequence} ${styles.desktopFeedbackConsequence}`}>{summarizeConsequence(feedback.entry.consequence)}</p>
        <p className={`${styles.feedbackConsequence} ${styles.mobileFeedbackConsequence}`}>
          {buildMobileFeedbackSummary(feedbackItems, lostClassification, gainedClassification)}
        </p>
        <div className={`${styles.rewardPanel} ${lostClassification ? styles.rewardLoss : gainedClassification ? styles.rewardGain : styles.rewardNeutral}`}>
          <div className={styles.rewardCopy}>
            <small>{lostClassification ? 'Perda de classificação' : gainedClassification ? 'Ganho de classificação' : 'Classificação mantida'}</small>
            <strong>{formatStarChange(stageStarChange)}</strong>
            <span>{lostClassification ? 'A projeção caiu para' : gainedClassification ? 'A projeção subiu para' : 'A projeção permanece em'} {projectedStars.toFixed(1)} / 5.0 estrelas</span>
          </div>
          <StarRating value={projectedStars} size="md" animated showValue={false} />
        </div>
        <div className={styles.feedbackGrid}>
          {feedbackItems.map((item) => (
            <article key={item.key} className={`${styles.feedbackStat} ${item.positive ? styles.goodFeedback : styles.badFeedback}`}>
              <small>{item.positive ? '↑' : '↓'} {getMetricLabel(item.key)}</small>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </article>
          ))}
        </div>
        <details className={styles.mobileFeedbackDetails}>
          <summary>Entender esta decisão</summary>
          <div className={styles.mobileFeedbackInsights}>
            {positiveItems.length ? (
              <section className={styles.mobileStrengths}>
                <h3>O que funcionou</h3>
                <ul>
                  {positiveItems.slice(0, 2).map((item) => <li key={item.key}>{item.description}</li>)}
                </ul>
              </section>
            ) : null}
            {attentionItems.length ? (
              <section className={styles.mobileAlerts}>
                <h3>O que exige atenção</h3>
                <ul>
                  {attentionItems.slice(0, 2).map((item) => <li key={item.key}>{item.description}</li>)}
                </ul>
              </section>
            ) : null}
          </div>
        </details>
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

function formatStarChange(value: number): string {
  if (value > 0) return `+${value.toFixed(1)}★`;
  if (value < 0) return `−${Math.abs(value).toFixed(1)}★`;
  return '0.0★';
}

function buildImprovementGuide(run: GameRun, result: GameResult): string[] {
  if (result.stars >= 5) {
    return [
      'Você atingiu o teto da régua atual; o próximo desafio é repetir esse padrão em novas rodadas.',
      'Registre os processos que equilibraram caixa, qualidade, capacidade e experiência do cliente.',
      'Use o resultado máximo como referência de consistência, não como motivo para acelerar sem validação.',
    ];
  }

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

import { useEffect, useMemo, useState } from 'react';
import { ChoiceVisual } from '../../components/ChoiceVisual';
import { SceneAnimation } from '../../components/SceneAnimation';
import { StarRating } from '../../components/StarRating';
import { useAppConfig } from '../../context/AppConfigContext';
import type { DecisionChoice, MetricKey } from '../../types/config';
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
  describeFeedback,
  explainResultCard,
  getMetricLabel,
  personalizeDecision,
  summarizeConsequence,
} from './narrative';
import styles from './GamePage.module.css';

const STRATEGY_STEPS = 3;

type ResultPanel = 'strengths' | 'alerts' | 'method' | null;

export function GamePage() {
  const { config } = useAppConfig();
  const [run, setRun] = useState<GameRun | null>(() => readJson<GameRun>(storageKeys.RUN_KEY));
  const [selectedChoice, setSelectedChoice] = useState<DecisionChoice | null>(null);
  const [feedback, setFeedback] = useState<{ entry: LedgerEntry; mentorTip: string } | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<ResultPanel>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showPhaseTwo, setShowPhaseTwo] = useState(false);

  useEffect(() => {
    if (run) writeJson(storageKeys.RUN_KEY, run);
    else localStorage.removeItem(storageKeys.RUN_KEY);
  }, [run]);

  const restartRun = () => {
    setSelectedChoice(null);
    setFeedback(null);
    setExpandedPanel(null);
    setHistoryExpanded(false);
    setShowPhaseTwo(false);
    setRun(createRun(config));
  };

  if (!run) {
    return (
      <main className={styles.introPage}>
        <section className={styles.introScreen}>
          <SceneAnimation scene="garage" />
          <div className={styles.introShade} />
          <div className={styles.introBrand}>
            <div className={styles.dbMark}>DB</div>
            <span><strong>DETAILER</strong><b>BUSINESS</b></span>
          </div>
          <div className={styles.introContent}>
            <h1>{config.brand.introTitle}</h1>
            <p>{config.brand.introDescription}</p>
            <button className={styles.playButton} type="button" onClick={() => setRun(createRun(config))}>
              Iniciar desafio <span className={styles.playLabel}>JOGAR AGORA</span><span>→</span>
            </button>
            <div className={styles.introStats}>
              <span><strong>3</strong> definições de estratégia</span>
              <span><strong>5</strong> situações-desafio</span>
              <span><strong>90</strong> dias simulados</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const completed = run.currentDecisionIndex >= config.scenario.decisions.length;
  const result = completed ? calculateResult(run, config) : null;

  if (completed && result) {
    return (
      <ResultScreen
        run={run}
        result={result}
        onRestart={restartRun}
        onHome={() => setRun(null)}
        showPhaseTwo={showPhaseTwo}
        setShowPhaseTwo={setShowPhaseTwo}
        expandedPanel={expandedPanel}
        setExpandedPanel={setExpandedPanel}
        historyExpanded={historyExpanded}
        setHistoryExpanded={setHistoryExpanded}
      />
    );
  }

  const decisionConfig = config.scenario.decisions[run.currentDecisionIndex];
  const currentDecision = personalizeDecision(decisionConfig, run, config);
  const scene = resolveAnimation(run, currentDecision.animation);
  const isStrategy = run.currentDecisionIndex < STRATEGY_STEPS;
  const phaseStep = isStrategy ? run.currentDecisionIndex + 1 : run.currentDecisionIndex - STRATEGY_STEPS + 1;
  const phaseTotal = isStrategy ? STRATEGY_STEPS : config.scenario.decisions.length - STRATEGY_STEPS;
  const day = Math.max(1, Math.round(((run.currentDecisionIndex + 1) / config.scenario.decisions.length) * 90));

  const confirmChoice = () => {
    if (!selectedChoice) return;
    const sourceChoice = decisionConfig.choices.find((choice) => choice.id === selectedChoice.id) ?? selectedChoice;
    const nextRun = applyChoice(run, decisionConfig.id, sourceChoice, config);
    const entry = nextRun.ledger[nextRun.ledger.length - 1];
    setRun(nextRun);
    setSelectedChoice(null);
    if (entry) setFeedback({ entry, mentorTip: currentDecision.mentorTip });
  };

  return (
    <main className={styles.gamePage}>
      <section className={styles.gameScreen}>
        <header className={styles.gameHeader}>
          <div>
            <span className={styles.phaseName}>FASE 1 - {isStrategy ? 'ESTRATÉGIA' : 'DESAFIO'}</span>
            <div className={styles.stepRow}>
              <strong>{isStrategy ? `Etapa ${phaseStep}/${phaseTotal}` : `Situação ${phaseStep}/${phaseTotal}`}</strong>
              <span>Etapa {run.currentDecisionIndex + 1}/{config.scenario.decisions.length}</span>
            </div>
            <div className={styles.progressTrack}><i style={{ width: `${((run.currentDecisionIndex + 1) / config.scenario.decisions.length) * 100}%` }} /></div>
          </div>
          <div className={styles.gameMeta}>
            <span>🪙 <strong>{formatCurrency(run.metrics.cash, config.scenario.currency)}</strong></span>
            <span>🗓 <strong>Dia {day}</strong></span>
          </div>
        </header>

        <section className={styles.scenePanel}>
          <SceneAnimation scene={scene} />
          <div className={styles.sceneCopy}>
            <span>{currentDecision.eyebrow}</span>
            <h1>{currentDecision.title}</h1>
            <p>{currentDecision.situation}</p>
          </div>
        </section>

        <section className={`${styles.choiceGrid} ${currentDecision.choices.length === 4 ? styles.fourChoices : ''}`}>
          {currentDecision.choices.map((choice) => {
            const sourceChoice = decisionConfig.choices.find((item) => item.id === choice.id) ?? choice;
            const availability = choiceAvailability(sourceChoice, run, config);
            const cost = equipmentCost(sourceChoice, config);
            return (
              <button
                key={choice.id}
                className={styles.choiceCard}
                type="button"
                disabled={!availability.available}
                onClick={() => setSelectedChoice(choice)}
              >
                <ChoiceVisual decisionId={decisionConfig.id} choiceId={choice.id} />
                <div className={styles.choiceText}>
                  <h2>{choice.label}</h2>
                  <p>{choice.description}</p>
                  {cost > 0 ? <strong className={styles.choicePrice}>{formatCurrency(cost, config.scenario.currency)}</strong> : null}
                  <small>{summarizeConsequence(availability.available ? choice.consequence : availability.reason ?? '')}</small>
                </div>
                <ImpactRow effects={choice.effects} />
              </button>
            );
          })}
        </section>

        <div className={styles.hintBar}>ⓘ Dica: {currentDecision.mentorTip}</div>
      </section>

      {selectedChoice ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setSelectedChoice(null)}>
          <section className={styles.confirmModal} onMouseDown={(event) => event.stopPropagation()}>
            <span>CONFIRMAR DECISÃO</span>
            <h2>{selectedChoice.label}</h2>
            <p>{summarizeConsequence(selectedChoice.consequence)}</p>
            <div className={styles.modalActions}>
              <button className="secondaryButton" type="button" onClick={() => setSelectedChoice(null)}>Voltar</button>
              <button className="primaryButton" type="button" onClick={confirmChoice}>Confirmar escolha</button>
            </div>
          </section>
        </div>
      ) : null}

      {feedback ? (
        <FeedbackModal
          feedback={feedback}
          projectedStars={scoreToStars(calculateScoreFromMetrics(feedback.entry.after, config))}
          stepStars={calculateStepStarGain(feedback.entry.before, feedback.entry.after, config)}
          onContinue={() => setFeedback(null)}
          completed={run.currentDecisionIndex >= config.scenario.decisions.length}
        />
      ) : null}
    </main>
  );
}

function ImpactRow({ effects }: { effects: DecisionChoice['effects'] }) {
  const groups = [
    { label: 'FIN', value: effects.cash ?? 0 },
    { label: 'REP', value: effects.reputation ?? 0 },
    { label: 'OPE', value: (effects.quality ?? 0) + (effects.capacity ?? 0) - (effects.fatigue ?? 0) },
    { label: 'CLI', value: (effects.customers ?? 0) - (effects.risk ?? 0) },
  ];

  return (
    <div className={styles.impactIndicators}>
      {groups.map((group) => (
        <span key={group.label}>
          <b>{group.label}</b>
          <i className={group.value > 0 ? styles.up : group.value < 0 ? styles.down : styles.neutral}>
            {group.value > 0 ? '↑' : group.value < 0 ? '↓' : '•'}
          </i>
        </span>
      ))}
    </div>
  );
}

function FeedbackModal({
  feedback,
  projectedStars,
  stepStars,
  onContinue,
  completed,
}: {
  feedback: { entry: LedgerEntry; mentorTip: string };
  projectedStars: number;
  stepStars: number;
  onContinue: () => void;
  completed: boolean;
}) {
  return (
    <div className={styles.modalBackdrop}>
      <section className={`${styles.confirmModal} ${styles.feedbackModal}`}>
        <span>CONSEQUÊNCIA DA ESCOLHA</span>
        <h2>{feedback.entry.title}</h2>
        <p>{summarizeConsequence(feedback.entry.consequence)}</p>
        <div className={styles.rewardRow}>
          <StarRating value={projectedStars} animated showValue={false} />
          <strong>+{stepStars.toFixed(1)}★</strong>
        </div>
        <div className={styles.feedbackGrid}>
          {describeFeedback(feedback.entry.delta).map((item) => (
            <article key={item.key} className={item.positive ? styles.goodFeedback : styles.badFeedback}>
              <small>{item.positive ? '↑' : '↓'} {getMetricLabel(item.key)}</small>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </article>
          ))}
        </div>
        <div className={styles.methodNote}><b>Método</b><span>{feedback.mentorTip}</span></div>
        <button className="primaryButton" type="button" onClick={onContinue}>{completed ? 'Ver resultado' : 'Continuar'}</button>
      </section>
    </div>
  );
}

function ResultScreen({
  run,
  result,
  onRestart,
  onHome,
  showPhaseTwo,
  setShowPhaseTwo,
  expandedPanel,
  setExpandedPanel,
  historyExpanded,
  setHistoryExpanded,
}: {
  run: GameRun;
  result: GameResult;
  onRestart: () => void;
  onHome: () => void;
  showPhaseTwo: boolean;
  setShowPhaseTwo: (value: boolean) => void;
  expandedPanel: ResultPanel;
  setExpandedPanel: (panel: ResultPanel) => void;
  historyExpanded: boolean;
  setHistoryExpanded: (value: boolean) => void;
}) {
  const { config } = useAppConfig();
  const band = config.scenario.resultBands.find((item) => item.id === result.bandId)!;
  const insightData = useMemo(() => ({
    strengths: explainResultCard('strengths', run),
    alerts: explainResultCard('alerts', run),
    method: explainResultCard('method', run),
  }), [run]);

  return (
    <main className={styles.resultPage}>
      <section className={styles.resultScreen}>
        <div className={styles.resultMain}>
          <span className={styles.phaseName}>FASE 1 - RESULTADO</span>
          <h1>Seu desempenho nos primeiros 90 dias</h1>
          <div className={styles.resultRating}>
            <StarRating value={result.stars} size="xl" animated showValue={false} />
            <strong>{result.stars.toFixed(1)}<small>de 5.0</small></strong>
          </div>

          <div className={styles.resultMetrics}>
            <ResultMetric label="Financeiro" icon="💵" value={run.metrics.cash >= 3500} />
            <ResultMetric label="Reputação" icon="★" value={run.metrics.reputation >= 55} />
            <ResultMetric label="Operação" icon="⚙" value={run.metrics.quality + run.metrics.capacity - run.metrics.risk >= 55} />
            <ResultMetric label="Clientes" icon="👥" value={run.metrics.customers >= 5} />
          </div>

          <div className={styles.resultSummaryGrid}>
            <ResultSummary
              title="Suas forças"
              tone="good"
              items={result.strengths}
              expanded={expandedPanel === 'strengths'}
              onToggle={() => setExpandedPanel(expandedPanel === 'strengths' ? null : 'strengths')}
              details={insightData.strengths}
            />
            <ResultSummary
              title="Atenções"
              tone="bad"
              items={result.alerts}
              expanded={expandedPanel === 'alerts'}
              onToggle={() => setExpandedPanel(expandedPanel === 'alerts' ? null : 'alerts')}
              details={insightData.alerts}
            />
            <ResultSummary
              title="Método DB"
              tone="method"
              items={[band.methodFeedback, ...buildImprovementGuide(run, result)]}
              expanded={expandedPanel === 'method'}
              onToggle={() => setExpandedPanel(expandedPanel === 'method' ? null : 'method')}
              details={insightData.method}
            />
          </div>

          <div className={styles.resultActions}>
            <button className="secondaryButton" type="button" onClick={() => setHistoryExpanded(!historyExpanded)}>
              {historyExpanded ? 'Recolher histórico' : 'Ver histórico das escolhas'}
            </button>
            <button className="primaryButton" type="button" onClick={() => setShowPhaseTwo(true)}>Seguir para fase 2 →</button>
          </div>

          {historyExpanded ? (
            <section className={styles.historyPanel}>
              {run.ledger.map((entry, index) => (
                <article key={entry.id}>
                  <b>{index + 1}</b>
                  <div><strong>{entry.title}</strong><p>{summarizeConsequence(entry.consequence)}</p></div>
                </article>
              ))}
              <div className={styles.historyFooter}>
                <button className="secondaryButton" type="button" onClick={onRestart}>Jogar novamente</button>
                <button className="secondaryButton" type="button" onClick={onHome}>Voltar para capa</button>
              </div>
            </section>
          ) : null}
        </div>

        {showPhaseTwo ? (
          <aside className={styles.phaseTwoCard}>
            <button className={styles.closePhaseTwo} type="button" onClick={() => setShowPhaseTwo(false)}>×</button>
            <div className={styles.rocket}>🚀</div>
            <h2>Fase 2 em breve!</h2>
            <p>A fase 2 do jogo será desenvolvida conforme o método de ensino abordado.</p>
            <span>Em breve, você terá novos desafios, estratégias e ferramentas para levar sua operação ao próximo nível.</span>
            <button className="primaryButton" type="button" onClick={() => setShowPhaseTwo(false)}>Entendi</button>
          </aside>
        ) : null}
      </section>
    </main>
  );
}

function ResultMetric({ label, icon, value }: { label: string; icon: string; value: boolean }) {
  return (
    <article>
      <small>{label}</small>
      <div><span>{icon}</span><b className={value ? styles.up : styles.down}>{value ? '↑' : '↓'}</b></div>
    </article>
  );
}

function ResultSummary({
  title,
  tone,
  items,
  expanded,
  onToggle,
  details,
}: {
  title: string;
  tone: 'good' | 'bad' | 'method';
  items: string[];
  expanded: boolean;
  onToggle: () => void;
  details: string[];
}) {
  const visible = expanded ? items : items.slice(0, 3);
  return (
    <article className={`${styles.resultSummary} ${styles[tone]}`}>
      <h2>{title}</h2>
      <ul>{visible.map((item) => <li key={item}>{item}</li>)}</ul>
      {expanded && details.length ? <div className={styles.detailBox}>{details.map((item) => <p key={item}>{item}</p>)}</div> : null}
      <button type="button" onClick={onToggle}>{expanded ? 'Recolher' : 'Ler mais'}</button>
    </article>
  );
}

function buildImprovementGuide(run: GameRun, result: GameResult): string[] {
  const guide: string[] = [];
  if (run.metrics.cash < 3500) guide.push('Revise onde o caixa foi comprometido cedo demais.');
  if (run.metrics.reputation < 55 || run.metrics.quality < 60) guide.push('Observe se promessa, prazo e padrão de entrega caminharam juntos.');
  if (run.metrics.risk > 40 || run.metrics.fatigue > 45) guide.push('Compare decisões rápidas com o custo operacional que elas criaram.');
  if (result.stars >= 3.5) guide.push('Busque crescer sem perder equilíbrio entre margem, rotina e percepção do cliente.');
  if (!guide.length) guide.push('Use o histórico para identificar padrões, sem procurar uma única resposta ideal.');
  return guide.slice(0, 3);
}

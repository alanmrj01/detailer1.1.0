import styles from './ChoiceVisual.module.css';

export function ChoiceVisual({ decisionId, choiceId }: { decisionId: string; choiceId: string }) {
  const variant = resolveVariant(decisionId, choiceId);
  return (
    <div className={`${styles.visual} ${styles[variant]}`} aria-hidden="true">
      <div className={styles.floor} />
      <div className={styles.backGlow} />
      <div className={styles.objectA} />
      <div className={styles.objectB} />
      <div className={styles.objectC} />
      <div className={styles.badge} />
    </div>
  );
}

function resolveVariant(decisionId: string, choiceId: string) {
  const map: Record<string, string> = {
    garage: 'garage',
    store: 'store',
    mobile: 'mobile',
    essential: 'starterKit',
    complete: 'proKit',
    interior: 'interiorKit',
    professional: 'proKit',
    wash: 'washService',
    polish: 'polishService',
    'interior-service': 'interiorService',
    balanced: 'comboService',
    low: 'lowPrice',
    'balanced-price': 'midPrice',
    'premium-price': 'highPrice',
    'discount-blast': 'discount',
    'local-partnership': 'partnership',
    'content-routine': 'content',
    'preserve-quality': 'quality',
    rush: 'rush',
    renegotiate: 'renegotiate',
    redo: 'redo',
    'partial-refund': 'refund',
    contest: 'contest',
    marketing: 'marketing',
    reserve: 'reserve',
    training: 'training',
    helper: 'helper',
  };
  return map[choiceId] ?? (decisionId === 'first-quote' ? 'midPrice' : 'default');
}

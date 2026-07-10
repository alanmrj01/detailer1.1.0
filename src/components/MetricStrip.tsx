import type { MetricKey, NumericMetrics } from '../types/config';
import { formatCurrency, formatSigned } from '../utils/format';
import styles from './MetricStrip.module.css';

const metrics: Array<{ key: keyof NumericMetrics; label: string; icon: string; kind: 'money' | 'score' }> = [
  { key: 'cash', label: 'Caixa', icon: 'R$', kind: 'money' },
  { key: 'reputation', label: 'Reputação', icon: '★', kind: 'score' },
  { key: 'quality', label: 'Qualidade', icon: '✓', kind: 'score' },
  { key: 'capacity', label: 'Capacidade', icon: '↗', kind: 'score' },
  { key: 'risk', label: 'Risco', icon: '!', kind: 'score' },
];

export function MetricStrip({
  values,
  currency,
  delta,
}: {
  values: NumericMetrics;
  currency: string;
  delta?: Partial<Record<MetricKey, number>> | null;
}) {
  return (
    <div className={styles.strip} aria-label="Indicadores atuais">
      {metrics.map((metric) => {
        const deltaValue = delta?.[metric.key];
        const deltaTone = deltaValue === undefined || deltaValue === 0
          ? ''
          : metric.key === 'risk'
            ? deltaValue > 0
              ? styles.bad
              : styles.good
            : deltaValue > 0
              ? styles.good
              : styles.bad;

        return (
          <article key={metric.key} className={`${styles.metric} ${deltaValue ? styles.pulse : ''}`}>
            <span className={styles.icon}>{metric.icon}</span>
            <div className={styles.metricBody}>
              <small>{metric.label}</small>
              <div className={styles.valueRow}>
                <strong>
                  {metric.kind === 'money'
                    ? formatCurrency(values.cash, currency)
                    : Math.round(values[metric.key])}
                </strong>
                {deltaValue ? <span className={`${styles.delta} ${deltaTone}`}>{formatSigned(deltaValue)}</span> : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

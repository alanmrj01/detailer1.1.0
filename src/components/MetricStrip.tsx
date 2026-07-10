import type { MetricKey, NumericMetrics } from '../types/config';
import { formatCurrency } from '../utils/format';
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
        const hasDelta = deltaValue !== undefined && deltaValue !== 0;
        const positive = metric.key === 'risk' ? (deltaValue ?? 0) < 0 : (deltaValue ?? 0) > 0;

        return (
          <article key={metric.key} className={`${styles.metric} ${hasDelta ? styles.pulse : ''}`}>
            <span className={styles.icon}>{metric.icon}</span>
            <div className={styles.metricBody}>
              <small>{metric.label}</small>
              <div className={styles.valueRow}>
                <strong>
                  {metric.kind === 'money'
                    ? formatCurrency(values.cash, currency)
                    : Math.round(values[metric.key])}
                </strong>
                {hasDelta ? (
                  <span className={`${styles.delta} ${positive ? styles.good : styles.bad}`} aria-label={positive ? 'Melhorou' : 'Piorou'}>
                    {positive ? '↑' : '↓'}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

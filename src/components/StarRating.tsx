import type { CSSProperties } from 'react';
import styles from './StarRating.module.css';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'xl';
  animated?: boolean;
  showValue?: boolean;
  label?: string;
}

export function StarRating({
  value,
  max = 5,
  size = 'md',
  animated = false,
  showValue = true,
  label,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percentage = `${(clamped / max) * 100}%`;

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      {label ? <small>{label}</small> : null}
      <div className={`${styles.stars} ${animated ? styles.animated : ''}`} style={{ '--fill': percentage } as CSSProperties}>
        <span className={styles.base}>★★★★★</span>
        <span className={styles.fill}>★★★★★</span>
      </div>
      {showValue ? <strong>{clamped.toFixed(1)}</strong> : null}
    </div>
  );
}

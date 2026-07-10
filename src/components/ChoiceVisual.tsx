import type { CSSProperties } from 'react';
import garageScene from '../assets/scenes/garage.webp';
import storeScene from '../assets/scenes/store.webp';
import mobileScene from '../assets/scenes/mobile.webp';
import equipmentScene from '../assets/scenes/equipment.webp';
import washingScene from '../assets/scenes/washing.webp';
import polishingScene from '../assets/scenes/polishing.webp';
import pricingScene from '../assets/scenes/pricing.webp';
import complaintScene from '../assets/scenes/complaint.webp';
import growthScene from '../assets/scenes/growth.webp';
import styles from './ChoiceVisual.module.css';

interface VisualDefinition {
  src: string;
  glyph: string;
  position: string;
  effect: 'cyan' | 'blue' | 'gold' | 'red' | 'green';
}

export function ChoiceVisual({ decisionId, choiceId }: { decisionId: string; choiceId: string }) {
  const visual = resolveVisual(decisionId, choiceId);

  return (
    <div
      className={`${styles.visual} ${styles[visual.effect]}`}
      style={{ '--choice-position': visual.position } as CSSProperties}
      aria-hidden="true"
    >
      <img className={styles.image} src={visual.src} alt="" draggable={false} decoding="async" />
      <div className={styles.depthShade} />
      <div className={styles.lightSweep} />
      <div className={styles.focusRing} />
      <span className={styles.glyph}>{visual.glyph}</span>
      <div className={styles.particles}><i /><i /><i /></div>
    </div>
  );
}

function resolveVisual(decisionId: string, choiceId: string): VisualDefinition {
  const visuals: Record<string, VisualDefinition> = {
    garage: { src: garageScene, glyph: '⌂', position: '77% 50%', effect: 'cyan' },
    store: { src: storeScene, glyph: '◆', position: '78% 50%', effect: 'blue' },
    mobile: { src: mobileScene, glyph: '↗', position: '80% 50%', effect: 'green' },

    essential: { src: equipmentScene, glyph: '1', position: '73% 53%', effect: 'cyan' },
    polishing: { src: equipmentScene, glyph: '◉', position: '86% 52%', effect: 'blue' },
    interior: { src: equipmentScene, glyph: '✦', position: '65% 54%', effect: 'cyan' },
    complete: { src: equipmentScene, glyph: '★', position: '80% 49%', effect: 'gold' },

    wash: { src: washingScene, glyph: '≈', position: '78% 54%', effect: 'cyan' },
    polish: { src: polishingScene, glyph: '✦', position: '80% 50%', effect: 'blue' },
    'interior-service': { src: equipmentScene, glyph: '▣', position: '71% 52%', effect: 'cyan' },
    balanced: { src: garageScene, glyph: '＋', position: '79% 50%', effect: 'green' },

    low: { src: pricingScene, glyph: '$', position: '76% 50%', effect: 'green' },
    'balanced-price': { src: pricingScene, glyph: '$$', position: '81% 50%', effect: 'cyan' },
    'premium-price': { src: pricingScene, glyph: '$$$', position: '87% 50%', effect: 'gold' },

    'discount-blast': { src: pricingScene, glyph: '-%', position: '75% 50%', effect: 'red' },
    'local-partnership': { src: growthScene, glyph: '↔', position: '74% 50%', effect: 'green' },
    'content-routine': { src: growthScene, glyph: '▶', position: '82% 50%', effect: 'cyan' },

    'preserve-quality': { src: polishingScene, glyph: '◆', position: '80% 50%', effect: 'cyan' },
    rush: { src: washingScene, glyph: '⚡', position: '82% 50%', effect: 'gold' },
    renegotiate: { src: pricingScene, glyph: '↔', position: '76% 50%', effect: 'green' },

    redo: { src: complaintScene, glyph: '↻', position: '80% 50%', effect: 'cyan' },
    'partial-refund': { src: pricingScene, glyph: 'R$', position: '76% 50%', effect: 'gold' },
    contest: { src: complaintScene, glyph: '!', position: '86% 50%', effect: 'red' },

    marketing: { src: growthScene, glyph: '↗', position: '76% 50%', effect: 'cyan' },
    reserve: { src: growthScene, glyph: '◉', position: '83% 50%', effect: 'green' },
    training: { src: equipmentScene, glyph: '✦', position: '78% 50%', effect: 'blue' },
    helper: { src: growthScene, glyph: '＋', position: '88% 50%', effect: 'gold' },
  };

  return visuals[choiceId] ?? fallbackForDecision(decisionId);
}

function fallbackForDecision(decisionId: string): VisualDefinition {
  const fallbacks: Record<string, VisualDefinition> = {
    'operation-model': { src: garageScene, glyph: '⌂', position: '78% 50%', effect: 'cyan' },
    'equipment-plan': { src: equipmentScene, glyph: '✦', position: '80% 50%', effect: 'blue' },
    'service-focus': { src: washingScene, glyph: '◆', position: '80% 50%', effect: 'cyan' },
    'first-quote': { src: pricingScene, glyph: '$', position: '80% 50%', effect: 'gold' },
    'slow-week': { src: growthScene, glyph: '↗', position: '80% 50%', effect: 'green' },
    'execution-pressure': { src: polishingScene, glyph: '⚡', position: '80% 50%', effect: 'gold' },
    'customer-complaint': { src: complaintScene, glyph: '!', position: '80% 50%', effect: 'red' },
    'growth-choice': { src: growthScene, glyph: '★', position: '80% 50%', effect: 'cyan' },
  };
  return fallbacks[decisionId] ?? fallbacks['service-focus'];
}

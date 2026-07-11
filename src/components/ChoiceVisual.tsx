import type { CSSProperties, SyntheticEvent } from 'react';
import garageChoice from '../assets/choices/garage.webp';
import storeChoice from '../assets/choices/store.webp';
import mobileChoice from '../assets/choices/mobile.webp';
import essentialChoice from '../assets/choices/essential.webp';
import polishingChoice from '../assets/choices/polishing.webp';
import interiorChoice from '../assets/choices/interior.webp';
import completeChoice from '../assets/choices/complete.webp';
import washChoice from '../assets/choices/wash.webp';
import polishChoice from '../assets/choices/polish.webp';
import interiorServiceChoice from '../assets/choices/interior-service.webp';
import balancedChoice from '../assets/choices/balanced.webp';
import lowChoice from '../assets/choices/low.webp';
import balancedPriceChoice from '../assets/choices/balanced-price.webp';
import premiumPriceChoice from '../assets/choices/premium-price.webp';
import discountChoice from '../assets/choices/discount-blast.webp';
import partnershipChoice from '../assets/choices/local-partnership.webp';
import contentChoice from '../assets/choices/content-routine.webp';
import qualityChoice from '../assets/choices/preserve-quality.webp';
import rushChoice from '../assets/choices/rush.webp';
import renegotiateChoice from '../assets/choices/renegotiate.webp';
import redoChoice from '../assets/choices/redo.webp';
import refundChoice from '../assets/choices/partial-refund.webp';
import contestChoice from '../assets/choices/contest.webp';
import marketingChoice from '../assets/choices/marketing.webp';
import reserveChoice from '../assets/choices/reserve.webp';
import trainingChoice from '../assets/choices/training.webp';
import helperChoice from '../assets/choices/helper.webp';
import styles from './ChoiceVisual.module.css';

const choiceImages: Record<string, string> = {
  garage: garageChoice,
  store: storeChoice,
  mobile: mobileChoice,
  essential: essentialChoice,
  polishing: polishingChoice,
  interior: interiorChoice,
  complete: completeChoice,
  wash: washChoice,
  polish: polishChoice,
  'interior-service': interiorServiceChoice,
  balanced: balancedChoice,
  low: lowChoice,
  'balanced-price': balancedPriceChoice,
  'premium-price': premiumPriceChoice,
  'discount-blast': discountChoice,
  'local-partnership': partnershipChoice,
  'content-routine': contentChoice,
  'preserve-quality': qualityChoice,
  rush: rushChoice,
  renegotiate: renegotiateChoice,
  redo: redoChoice,
  'partial-refund': refundChoice,
  contest: contestChoice,
  marketing: marketingChoice,
  reserve: reserveChoice,
  training: trainingChoice,
  helper: helperChoice,
};

const fallbackByDecision: Record<string, string> = {
  'operation-model': garageChoice,
  'equipment-plan': essentialChoice,
  'service-focus': washChoice,
  'first-quote': balancedPriceChoice,
  'slow-week': contentChoice,
  'execution-pressure': qualityChoice,
  'customer-complaint': redoChoice,
  'growth-choice': marketingChoice,
};

const positionByChoice: Record<string, string> = {
  garage: '50% 54%',
  store: '50% 52%',
  mobile: '58% 52%',
  essential: '45% 54%',
  polishing: '58% 54%',
  interior: '64% 54%',
  complete: '58% 54%',
  wash: '52% 55%',
  polish: '55% 55%',
  'interior-service': '58% 54%',
  balanced: '54% 54%',
  low: '52% 52%',
  'balanced-price': '54% 52%',
  'premium-price': '56% 52%',
  'discount-blast': '52% 50%',
  'local-partnership': '54% 50%',
  'content-routine': '56% 50%',
  'preserve-quality': '54% 50%',
  rush: '52% 50%',
  renegotiate: '54% 50%',
  redo: '52% 50%',
  'partial-refund': '54% 50%',
  contest: '56% 50%',
  marketing: '54% 52%',
  reserve: '52% 52%',
  training: '54% 52%',
  helper: '56% 52%',
};

export function ChoiceVisual({ decisionId, choiceId }: { decisionId: string; choiceId: string }) {
  const fallback = fallbackByDecision[decisionId] ?? garageChoice;
  const src = choiceImages[choiceId] ?? fallback;
  const style = {
    '--choice-position': positionByChoice[choiceId] ?? '50% 50%',
  } as CSSProperties;

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== fallback) {
      event.currentTarget.src = fallback;
    }
  };

  return (
    <div className={styles.visual} aria-hidden="true" style={style}>
      <img
        className={styles.image}
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        onError={handleError}
      />
      <div className={styles.depthShade} />
      <div className={styles.focusRing} />
    </div>
  );
}

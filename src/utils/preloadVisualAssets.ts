import garageScene from '../assets/scenes/garage.webp';
import storeScene from '../assets/scenes/store.webp';
import mobileScene from '../assets/scenes/mobile.webp';
import equipmentScene from '../assets/scenes/equipment.webp';
import washingScene from '../assets/scenes/washing.webp';
import polishingScene from '../assets/scenes/polishing.webp';
import pricingScene from '../assets/scenes/pricing.webp';
import complaintScene from '../assets/scenes/complaint.webp';
import growthScene from '../assets/scenes/growth.webp';
import result1StarScene from '../assets/scenes/result-1star.webp';
import result2StarScene from '../assets/scenes/result-2star.webp';
import result3StarScene from '../assets/scenes/result-3star.webp';
import result4StarScene from '../assets/scenes/result-4star.webp';
import result5StarScene from '../assets/scenes/result-5star.webp';
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

const visualAssets = [
  garageScene,
  storeScene,
  mobileScene,
  equipmentScene,
  washingScene,
  polishingScene,
  pricingScene,
  complaintScene,
  growthScene,
  result1StarScene,
  result2StarScene,
  result3StarScene,
  result4StarScene,
  result5StarScene,
  garageChoice,
  storeChoice,
  mobileChoice,
  essentialChoice,
  polishingChoice,
  interiorChoice,
  completeChoice,
  washChoice,
  polishChoice,
  interiorServiceChoice,
  balancedChoice,
  lowChoice,
  balancedPriceChoice,
  premiumPriceChoice,
  discountChoice,
  partnershipChoice,
  contentChoice,
  qualityChoice,
  rushChoice,
  renegotiateChoice,
  redoChoice,
  refundChoice,
  contestChoice,
  marketingChoice,
  reserveChoice,
  trainingChoice,
  helperChoice,
];

let hasStarted = false;

export function preloadVisualAssets(): void {
  if (hasStarted || typeof Image === 'undefined') return;
  hasStarted = true;

  visualAssets.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    void image.decode?.().catch(() => undefined);
  });
}

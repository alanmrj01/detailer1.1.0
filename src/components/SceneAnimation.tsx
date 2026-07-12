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
import type { CSSProperties } from 'react';
import type { AnimationScene } from '../types/config';
import styles from './SceneAnimation.module.css';

interface SceneAnimationProps {
  scene: AnimationScene;
}

const sceneMap: Record<AnimationScene, { src: string; alt: string }> = {
  garage: {
    src: garageScene,
    alt: 'Ilustração 3D de um detailer avaliando iniciar a operação em uma garagem.',
  },
  store: {
    src: storeScene,
    alt: 'Ilustração 3D de um detailer avaliando iniciar a operação em um ponto comercial.',
  },
  mobile: {
    src: mobileScene,
    alt: 'Ilustração 3D de um detailer avaliando iniciar a operação em atendimento delivery.',
  },
  equipment: {
    src: equipmentScene,
    alt: 'Ilustração 3D de um detailer escolhendo equipamentos profissionais.',
  },
  washing: {
    src: washingScene,
    alt: 'Ilustração 3D de lavagem detalhada com espuma e lavadora de alta pressão.',
  },
  polishing: {
    src: polishingScene,
    alt: 'Ilustração 3D de polimento automotivo com politriz.',
  },
  interior: {
    src: equipmentScene,
    alt: 'Ilustração 3D de higienização interna e equipamentos de limpeza.',
  },
  pricing: {
    src: pricingScene,
    alt: 'Ilustração 3D de decisão comercial com diferentes faixas de preço.',
  },
  complaint: {
    src: complaintScene,
    alt: 'Ilustração 3D de reclamação do cliente e inspeção do veículo.',
  },
  growth: {
    src: growthScene,
    alt: 'Ilustração 3D de crescimento do negócio e conquista de estrelas.',
  },
  'result-1star': {
    src: result1StarScene,
    alt: 'Ilustração 3D de resultado de uma estrela, com operação em alerta e necessidade de correção.',
  },
  'result-2star': {
    src: result2StarScene,
    alt: 'Ilustração 3D de resultado de duas estrelas, com estrutura inicial ainda em construção.',
  },
  'result-3star': {
    src: result3StarScene,
    alt: 'Ilustração 3D de resultado de três estrelas, com negócio em equilíbrio e decisões comerciais em evolução.',
  },
  'result-4star': {
    src: result4StarScene,
    alt: 'Ilustração 3D de resultado de quatro estrelas, com operação organizada e base sustentável.',
  },
  'result-5star': {
    src: result5StarScene,
    alt: 'Ilustração 3D de resultado de cinco estrelas, com crescimento forte e excelente desempenho.',
  },
};

export function SceneAnimation({ scene }: SceneAnimationProps) {
  const current = sceneMap[scene] ?? sceneMap.garage;

  const style = { '--scene-image': `url("${current.src}")` } as CSSProperties;

  return (
    <div className={`${styles.scene} ${styles[scene] ?? ''}`} aria-hidden="true" style={style}>
      <img
        className={styles.image}
        src={current.src}
        alt={current.alt}
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />

      <div className={styles.leftShade} />
      <div className={styles.bottomShade} />
      <div className={styles.lightSweep} />
      <div className={styles.frameGlow} />
      <div className={styles.floorGlow} />
      <div className={styles.ambientParticles}><i /><i /><i /><i /></div>

      <div className={styles.strategyPulse}><i /><i /><i /></div>
      <div className={styles.waterSpray}><i /><i /><i /><i /></div>
      <div className={styles.priceCards}><i /><i /><i /></div>
      <div className={styles.alertPulse}>!</div>
      <div className={styles.rewardStars}><i>★</i><i>★</i><i>★</i></div>
    </div>
  );
}

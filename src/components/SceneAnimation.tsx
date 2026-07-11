import garageScene from '../assets/scenes/garage.webp';
import storeScene from '../assets/scenes/store.webp';
import mobileScene from '../assets/scenes/mobile.webp';
import equipmentScene from '../assets/scenes/equipment.webp';
import washingScene from '../assets/scenes/washing.webp';
import polishingScene from '../assets/scenes/polishing.webp';
import pricingScene from '../assets/scenes/pricing.webp';
import complaintScene from '../assets/scenes/complaint.webp';
import growthScene from '../assets/scenes/growth.webp';
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
};

export function SceneAnimation({ scene }: SceneAnimationProps) {
  const current = sceneMap[scene] ?? sceneMap.garage;

  return (
    <div className={`${styles.scene} ${styles[scene] ?? ''}`} aria-hidden="true">
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
      <div className={styles.polishingGlow}><i /><i /></div>
      <div className={styles.priceCards}><i /><i /><i /></div>
      <div className={styles.alertPulse}>!</div>
      <div className={styles.rewardStars}><i>★</i><i>★</i><i>★</i></div>
    </div>
  );
}

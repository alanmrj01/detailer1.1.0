import type { AnimationScene } from '../types/config';
import styles from './SceneAnimation.module.css';

const sceneCopy: Record<AnimationScene, { title: string; subtitle: string }> = {
  garage: { title: 'Defina sua base', subtitle: 'Garagem, loja ou delivery: visualize o modelo da operação.' },
  mobile: { title: 'Atendimento externo', subtitle: 'Rotina dinâmica e deslocamento até o cliente.' },
  store: { title: 'Ponto comercial', subtitle: 'Mais presença visual e custo fixo maior.' },
  equipment: { title: 'Monte seu kit', subtitle: 'Escolha o conjunto de equipamentos para começar.' },
  washing: { title: 'Lavagem detalhada', subtitle: 'Serviço de giro e percepção imediata de valor.' },
  polishing: { title: 'Polimento comercial', subtitle: 'Mais técnica, mais exigência e maior ticket.' },
  interior: { title: 'Higienização interna', subtitle: 'Transformação visual forte e percepção clara do cliente.' },
  pricing: { title: 'Preço e posicionamento', subtitle: 'Margem, conversão e percepção andam juntas.' },
  complaint: { title: 'Reclamação do cliente', subtitle: 'A solução afeta confiança, retrabalho e reputação.' },
  growth: { title: 'Próximo passo', subtitle: 'Use a reserva para crescer com mais segurança.' },
};

export function SceneAnimation({ scene }: { scene: AnimationScene }) {
  const copy = sceneCopy[scene];

  return (
    <div className={`${styles.scene} ${styles[scene]}`} aria-hidden="true">
      <div className={styles.skyGlow} />
      <div className={styles.ground} />
      <div className={styles.grid} />

      <div className={styles.sceneBadge}>
        <strong>{copy.title}</strong>
        <span>{copy.subtitle}</span>
      </div>

      <div className={styles.platform} />

      <div className={`${styles.character} ${styles.tech}`}>
        <span className={styles.head} />
        <span className={styles.body} />
        <span className={`${styles.arm} ${styles.leftArm}`} />
        <span className={`${styles.arm} ${styles.rightArm}`} />
        <span className={`${styles.leg} ${styles.leftLeg}`} />
        <span className={`${styles.leg} ${styles.rightLeg}`} />
      </div>

      <div className={`${styles.character} ${styles.client}`}>
        <span className={styles.head} />
        <span className={styles.body} />
        <span className={`${styles.arm} ${styles.leftArm}`} />
        <span className={`${styles.arm} ${styles.rightArm}`} />
        <span className={`${styles.leg} ${styles.leftLeg}`} />
        <span className={`${styles.leg} ${styles.rightLeg}`} />
      </div>

      <div className={styles.carWrap}>
        <div className={styles.car}>
          <span className={styles.roof} />
          <span className={styles.window} />
          <span className={styles.bodyPanel} />
          <span className={`${styles.wheel} ${styles.wheelLeft}`} />
          <span className={`${styles.wheel} ${styles.wheelRight}`} />
        </div>
      </div>

      <div className={styles.choiceSet}>
        <div className={`${styles.structureCard} ${styles.cardGarage}`}><span>Garagem</span></div>
        <div className={`${styles.structureCard} ${styles.cardStore}`}><span>Loja</span></div>
        <div className={`${styles.structureCard} ${styles.cardMobile}`}><span>Delivery</span></div>
      </div>

      <div className={styles.shelf}>
        <i className={styles.machineTall} />
        <i className={styles.machineRound} />
        <i className={styles.machineBox} />
      </div>

      <div className={styles.priceBoard}><i /><i /><i /></div>
      <div className={styles.chartBoard}><i /><i /><i /><i /></div>
      <div className={styles.clipboard}><span /></div>
      <div className={styles.alertBubble}>!</div>
      <div className={styles.sprayGun}><i /></div>
      <div className={styles.polisher}><i /></div>
      <div className={styles.extractor}><i /></div>
      <div className={styles.coins}><i /><i /><i /></div>
      <div className={styles.foam}><i /><i /><i /><i /></div>
    </div>
  );
}

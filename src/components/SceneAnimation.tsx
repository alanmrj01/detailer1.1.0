import type { AnimationScene } from '../types/config';
import styles from './SceneAnimation.module.css';

export function SceneAnimation({ scene }: { scene: AnimationScene }) {
  return (
    <div className={`${styles.scene} ${styles[scene]}`} aria-hidden="true">
      <div className={styles.aura} />
      <div className={styles.floor} />
      <div className={styles.roomGrid} />

      <div className={`${styles.character} ${styles.mainCharacter}`}>
        <span className={styles.head} />
        <span className={styles.torso} />
        <span className={`${styles.arm} ${styles.armLeft}`} />
        <span className={`${styles.arm} ${styles.armRight}`} />
        <span className={`${styles.leg} ${styles.legLeft}`} />
        <span className={`${styles.leg} ${styles.legRight}`} />
      </div>

      <div className={styles.strategySet}>
        <div className={`${styles.choicePillar} ${styles.choiceGarage}`}><span>Garagem</span></div>
        <div className={`${styles.choicePillar} ${styles.choiceStore}`}><span>Loja</span></div>
        <div className={`${styles.choicePillar} ${styles.choiceMobile}`}><span>Delivery</span></div>
      </div>

      <div className={styles.storeShelf}>
        <span className={styles.shelfBox} />
        <span className={styles.shelfWasher} />
        <span className={styles.shelfPolisher} />
        <span className={styles.shelfExtractor} />
      </div>

      <div className={styles.carStage}>
        <div className={styles.car}>
          <span className={styles.carRoof} />
          <span className={styles.carWindow} />
          <span className={styles.carBody} />
          <span className={`${styles.wheel} ${styles.leftWheel}`} />
          <span className={`${styles.wheel} ${styles.rightWheel}`} />
        </div>
      </div>

      <div className={styles.waterGun}><i /></div>
      <div className={styles.polisher}><i /></div>
      <div className={styles.extractor}><i /></div>
      <div className={styles.coinStack}><i /><i /><i /></div>
      <div className={styles.clipboard}><span /></div>
      <div className={styles.alertBubble}>!</div>

      <div className={`${styles.character} ${styles.clientCharacter}`}>
        <span className={styles.head} />
        <span className={styles.torso} />
        <span className={`${styles.arm} ${styles.armLeft}`} />
        <span className={`${styles.arm} ${styles.armRight}`} />
        <span className={`${styles.leg} ${styles.legLeft}`} />
        <span className={`${styles.leg} ${styles.legRight}`} />
      </div>

      <div className={styles.chartBoard}><i /><i /><i /><i /></div>
    </div>
  );
}

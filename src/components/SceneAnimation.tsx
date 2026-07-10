import type { AnimationScene } from '../types/config';
import styles from './SceneAnimation.module.css';

interface SceneAnimationProps {
  scene: AnimationScene;
}

export function SceneAnimation({ scene }: SceneAnimationProps) {
  return (
    <div className={`${styles.scene} ${styles[scene]}`} aria-hidden="true">
      <svg
        className={styles.artwork}
        viewBox="0 0 900 560"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <SceneDefs />
        <Background />
        <SceneSpotlights />

        {(scene === 'garage' || scene === 'store' || scene === 'mobile') && (
          <StrategyScene selected={scene} />
        )}
        {scene === 'equipment' && <EquipmentScene />}
        {scene === 'washing' && <WashingScene />}
        {scene === 'polishing' && <PolishingScene />}
        {scene === 'interior' && <InteriorScene />}
        {scene === 'pricing' && <PricingScene />}
        {scene === 'complaint' && <ComplaintScene />}
        {scene === 'growth' && <GrowthScene />}
      </svg>
      <div className={styles.vignette} />
    </div>
  );
}

function SceneDefs() {
  return (
    <defs>
      <linearGradient id="sceneSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#102a43" />
        <stop offset="0.55" stopColor="#0b1f33" />
        <stop offset="1" stopColor="#071522" />
      </linearGradient>
      <linearGradient id="floorGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#17354d" />
        <stop offset="1" stopColor="#07111d" />
      </linearGradient>
      <linearGradient id="skinGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffd6ad" />
        <stop offset="0.58" stopColor="#f4b47d" />
        <stop offset="1" stopColor="#d88958" />
      </linearGradient>
      <linearGradient id="shirtGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#83e6ff" />
        <stop offset="0.5" stopColor="#25b8eb" />
        <stop offset="1" stopColor="#0877b0" />
      </linearGradient>
      <linearGradient id="darkFabric" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#26374b" />
        <stop offset="0.6" stopColor="#142235" />
        <stop offset="1" stopColor="#07111d" />
      </linearGradient>
      <linearGradient id="carPaint" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b7efff" />
        <stop offset="0.25" stopColor="#54cef5" />
        <stop offset="0.62" stopColor="#148ec7" />
        <stop offset="1" stopColor="#07547d" />
      </linearGradient>
      <linearGradient id="carGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e5f7ff" stopOpacity="0.92" />
        <stop offset="0.45" stopColor="#6ca5c7" stopOpacity="0.82" />
        <stop offset="1" stopColor="#15324b" stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id="metalGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f1f5f9" />
        <stop offset="0.4" stopColor="#a8bdcc" />
        <stop offset="1" stopColor="#4a6072" />
      </linearGradient>
      <linearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#204765" stopOpacity="0.96" />
        <stop offset="1" stopColor="#0d2235" stopOpacity="0.98" />
      </linearGradient>
      <radialGradient id="stageGlow">
        <stop offset="0" stopColor="#7ae4ff" stopOpacity="0.5" />
        <stop offset="0.52" stopColor="#238fbd" stopOpacity="0.18" />
        <stop offset="1" stopColor="#102b43" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="coinGradient">
        <stop offset="0" stopColor="#fff7b0" />
        <stop offset="0.45" stopColor="#ffd45f" />
        <stop offset="1" stopColor="#d48a15" />
      </radialGradient>
      <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#020814" floodOpacity="0.52" />
      </filter>
      <filter id="objectShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#020814" floodOpacity="0.42" />
      </filter>
      <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="floorGrid" width="44" height="44" patternUnits="userSpaceOnUse">
        <path d="M44 0H0V44" fill="none" stroke="#c9ecff" strokeOpacity="0.07" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

function Background() {
  return (
    <g>
      <rect width="900" height="560" fill="url(#sceneSky)" />
      <ellipse cx="640" cy="145" rx="270" ry="180" fill="url(#stageGlow)" opacity="0.9" />
      <path d="M0 372C188 329 413 342 900 294V560H0Z" fill="url(#floorGradient)" />
      <path d="M0 372C188 329 413 342 900 294V560H0Z" fill="url(#floorGrid)" opacity="0.78" />
      <ellipse cx="640" cy="466" rx="285" ry="55" fill="#020814" opacity="0.38" />
      <g opacity="0.12">
        <circle cx="84" cy="78" r="3" fill="#c5f2ff" />
        <circle cx="126" cy="118" r="2" fill="#c5f2ff" />
        <circle cx="780" cy="82" r="3" fill="#c5f2ff" />
        <circle cx="828" cy="130" r="2" fill="#c5f2ff" />
      </g>
    </g>
  );
}

function SceneSpotlights() {
  return (
    <g className={styles.spotlights} opacity="0.35">
      <path d="M550 -20L385 440H520L660 -20Z" fill="#6bdfff" opacity="0.1" />
      <path d="M790 -20L610 440H748L888 -20Z" fill="#6bdfff" opacity="0.07" />
    </g>
  );
}

function StrategyScene({ selected }: { selected: 'garage' | 'store' | 'mobile' }) {
  return (
    <g>
      <g transform="translate(78 180)">
        <Worker pose="thinking" scale={1.16} />
      </g>
      <g className={styles.strategyCards} transform="translate(330 145)">
        <StrategyCard kind="garage" x={0} selected={selected === 'garage'} />
        <StrategyCard kind="store" x={178} selected={selected === 'store'} />
        <StrategyCard kind="mobile" x={356} selected={selected === 'mobile'} />
      </g>
      <g className={styles.thoughtDots} fill="#9cecff">
        <circle cx="247" cy="185" r="8" opacity="0.92" />
        <circle cx="270" cy="160" r="5" opacity="0.68" />
        <circle cx="286" cy="140" r="3" opacity="0.48" />
      </g>
    </g>
  );
}

function StrategyCard({ kind, x, selected }: { kind: 'garage' | 'store' | 'mobile'; x: number; selected: boolean }) {
  const labels = { garage: 'GARAGEM', store: 'LOJA', mobile: 'DELIVERY' };
  return (
    <g
      className={`${styles.strategyCard} ${selected ? styles.strategyCardSelected : ''}`}
      transform={`translate(${x} 0)`}
      filter="url(#objectShadow)"
    >
      <rect width="154" height="230" rx="26" fill="url(#cardGradient)" stroke={selected ? '#8deaff' : '#4f7188'} strokeWidth={selected ? 4 : 2} />
      <rect x="12" y="14" width="130" height="145" rx="19" fill="#15344a" />
      {kind === 'garage' && <GarageIcon />}
      {kind === 'store' && <StoreIcon />}
      {kind === 'mobile' && <MobileIcon />}
      <text x="77" y="191" fill="#e9f9ff" fontSize="16" fontWeight="900" textAnchor="middle">{labels[kind]}</text>
      <text x="77" y="212" fill="#8db1c6" fontSize="10" fontWeight="700" textAnchor="middle">
        {kind === 'garage' ? 'baixo custo' : kind === 'store' ? 'mais presença' : 'mais mobilidade'}
      </text>
      {selected && (
        <g className={styles.selectedPulse}>
          <circle cx="128" cy="24" r="13" fill="#65ddff" />
          <path d="M121 24l5 5 9-11" fill="none" stroke="#08314a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

function GarageIcon() {
  return (
    <g transform="translate(31 48)">
      <path d="M8 42L47 8l39 34v58H8Z" fill="#6edcff" />
      <path d="M16 48h62v52H16Z" fill="#174b67" />
      <path d="M23 62h48v38H23Z" fill="#0b2435" />
      <path d="M30 76h34" stroke="#8be8ff" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 90h34" stroke="#8be8ff" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function StoreIcon() {
  return (
    <g transform="translate(26 44)">
      <rect x="8" y="30" width="86" height="68" rx="8" fill="#55caef" />
      <path d="M2 34h98L89 10H13Z" fill="#d9f6ff" />
      <path d="M10 34v14M28 34v14M46 34v14M64 34v14M82 34v14" stroke="#1585b5" strokeWidth="10" />
      <rect x="20" y="56" width="31" height="42" rx="5" fill="#15354a" />
      <rect x="59" y="56" width="25" height="23" rx="4" fill="#d6f5ff" />
    </g>
  );
}

function MobileIcon() {
  return (
    <g transform="translate(20 55)">
      <path d="M13 53h83l-8-30H56L42 39H18Z" fill="#62d8f9" />
      <path d="M56 25h26l5 18H50Z" fill="#d9f6ff" opacity="0.88" />
      <circle cx="34" cy="59" r="13" fill="#0a1724" />
      <circle cx="34" cy="59" r="6" fill="#a9c2d1" />
      <circle cx="78" cy="59" r="13" fill="#0a1724" />
      <circle cx="78" cy="59" r="6" fill="#a9c2d1" />
      <path d="M9 51h90" stroke="#e9fbff" strokeOpacity="0.7" strokeWidth="3" />
      <path d="M44 6c21 0 38 8 52 21" fill="none" stroke="#83e7ff" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 8" />
    </g>
  );
}

function EquipmentScene() {
  return (
    <g>
      <g transform="translate(85 195)">
        <Worker pose="choosing" scale={1.08} />
      </g>
      <g transform="translate(275 118)" filter="url(#softShadow)">
        <EquipmentStore />
      </g>
      <g className={styles.shoppingCart} transform="translate(515 365)">
        <path d="M0 0h72l-10 46H15Z" fill="#27475d" stroke="#a9eaff" strokeWidth="3" />
        <circle cx="21" cy="58" r="8" fill="#0b1724" stroke="#a8bfce" strokeWidth="3" />
        <circle cx="57" cy="58" r="8" fill="#0b1724" stroke="#a8bfce" strokeWidth="3" />
        <path d="M70 1l18-28h22" fill="none" stroke="#a9eaff" strokeWidth="5" strokeLinecap="round" />
        <rect x="22" y="9" width="20" height="30" rx="7" fill="#54cff3" />
        <rect x="47" y="14" width="13" height="25" rx="5" fill="#e1f8ff" />
      </g>
    </g>
  );
}

function EquipmentStore() {
  return (
    <g>
      <rect x="0" y="0" width="420" height="292" rx="34" fill="#102a3c" stroke="#2d607b" strokeWidth="3" />
      <rect x="20" y="24" width="380" height="228" rx="24" fill="#173a50" />
      <path d="M42 90h336M42 164h336M42 238h336" stroke="#8edcf2" strokeOpacity="0.22" strokeWidth="8" strokeLinecap="round" />
      <g className={styles.shelfProduct} transform="translate(55 36)">
        <rect width="56" height="47" rx="12" fill="#5dd7f5" />
        <circle cx="18" cy="47" r="11" fill="#0c1723" />
        <circle cx="44" cy="47" r="11" fill="#0c1723" />
        <path d="M14 16h28" stroke="#e7fbff" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className={styles.shelfProduct} transform="translate(157 31)">
        <rect x="8" width="44" height="58" rx="16" fill="#b7efff" />
        <path d="M30 7v43" stroke="#2c8fb8" strokeWidth="7" strokeLinecap="round" />
        <circle cx="30" cy="63" r="14" fill="#0b1926" />
      </g>
      <g className={styles.shelfProduct} transform="translate(268 32)">
        <rect x="0" y="18" width="78" height="28" rx="14" fill="#5ecff0" />
        <circle cx="65" cy="32" r="22" fill="#d7f8ff" stroke="#3ba5ce" strokeWidth="7" />
        <rect x="13" y="42" width="20" height="27" rx="8" fill="#19354a" />
      </g>
      <g className={styles.shelfProduct} transform="translate(54 111)">
        <rect x="10" width="58" height="58" rx="18" fill="#74def8" />
        <path d="M23 19h32M23 31h32M23 43h32" stroke="#17435d" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className={styles.shelfProduct} transform="translate(158 104)">
        <path d="M10 52V17c0-12 10-17 22-17h16c12 0 22 5 22 17v35Z" fill="#d8f7ff" />
        <rect x="18" y="30" width="44" height="25" rx="8" fill="#36add8" />
      </g>
      <g className={styles.shelfProduct} transform="translate(274 114)">
        <rect width="74" height="42" rx="13" fill="#5dcff0" />
        <path d="M14 12h46" stroke="#e1faff" strokeWidth="5" strokeLinecap="round" />
        <path d="M24 50v18M52 50v18" stroke="#8db6c8" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g className={styles.shelfProduct} transform="translate(57 188)">
        <rect width="70" height="36" rx="12" fill="#c1f2ff" />
        <circle cx="16" cy="18" r="8" fill="#2b91bb" />
        <circle cx="35" cy="18" r="8" fill="#2b91bb" />
        <circle cx="54" cy="18" r="8" fill="#2b91bb" />
      </g>
      <g className={styles.shelfProduct} transform="translate(181 187)">
        <rect width="58" height="42" rx="12" fill="#60d2f2" />
        <path d="M10 13h38M10 28h38" stroke="#17465f" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className={styles.shelfProduct} transform="translate(290 184)">
        <path d="M0 34h64L54 0H14Z" fill="#dff9ff" />
        <path d="M16 13h32" stroke="#38a5cb" strokeWidth="6" strokeLinecap="round" />
      </g>
      <rect x="126" y="260" width="170" height="16" rx="8" fill="#6fdcf5" opacity="0.38" />
    </g>
  );
}

function WashingScene() {
  return (
    <g>
      <g transform="translate(325 260)">
        <Car />
      </g>
      <g transform="translate(100 205)">
        <Worker pose="washing" scale={1.05} />
      </g>
      <g className={styles.pressureWasher} transform="translate(214 344)" filter="url(#objectShadow)">
        <rect width="72" height="82" rx="20" fill="#46c4ea" />
        <rect x="17" y="15" width="38" height="12" rx="6" fill="#d9f8ff" />
        <circle cx="18" cy="84" r="13" fill="#0a1724" />
        <circle cx="56" cy="84" r="13" fill="#0a1724" />
        <path d="M55 12c55-18 93-12 120 4" fill="none" stroke="#2b5068" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g className={styles.waterJet}>
        <path d="M295 245C405 230 490 239 567 275" fill="none" stroke="#bcefff" strokeWidth="10" strokeLinecap="round" strokeDasharray="19 14" />
        <path d="M295 245C415 223 506 232 584 270" fill="none" stroke="#61d8ff" strokeOpacity="0.66" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className={styles.foamBubbles} fill="#e8fbff">
        <circle cx="482" cy="285" r="15" />
        <circle cx="512" cy="276" r="11" />
        <circle cx="541" cy="292" r="17" />
        <circle cx="572" cy="282" r="10" />
        <circle cx="606" cy="301" r="14" />
      </g>
      <g transform="translate(715 322)">
        <Client pose="approval" scale={0.92} />
      </g>
    </g>
  );
}

function PolishingScene() {
  return (
    <g>
      <g transform="translate(306 252)">
        <Car />
      </g>
      <g transform="translate(135 218)">
        <Worker pose="polishing" scale={1.04} />
      </g>
      <g className={styles.polisherTool} transform="translate(345 302) rotate(-12)">
        <rect width="104" height="34" rx="17" fill="url(#metalGradient)" />
        <rect x="10" y="7" width="56" height="20" rx="10" fill="#2fc0ea" />
        <circle className={styles.polisherDisc} cx="92" cy="17" r="28" fill="#d6f7ff" stroke="#57cef1" strokeWidth="8" />
      </g>
      <g className={styles.shineSweep}>
        <path d="M443 244l16 30 31 14-31 14-16 30-15-30-31-14 31-14Z" fill="#f4fdff" filter="url(#glow)" />
        <path d="M536 220l10 19 20 9-20 9-10 19-10-19-20-9 20-9Z" fill="#bcefff" filter="url(#glow)" />
      </g>
      <g transform="translate(725 324)">
        <Client pose="approval" scale={0.9} />
      </g>
    </g>
  );
}

function InteriorScene() {
  return (
    <g>
      <g transform="translate(342 256)">
        <Car doorOpen />
      </g>
      <g transform="translate(110 215)">
        <Worker pose="interior" scale={1.06} />
      </g>
      <g className={styles.extractorMachine} transform="translate(270 352)" filter="url(#objectShadow)">
        <rect width="74" height="88" rx="22" fill="#5ed2f2" />
        <rect x="14" y="16" width="46" height="28" rx="10" fill="#d9f7ff" />
        <circle cx="20" cy="91" r="13" fill="#091723" />
        <circle cx="57" cy="91" r="13" fill="#091723" />
        <path d="M53 20c76-25 119 6 137 58" fill="none" stroke="#31536b" strokeWidth="10" strokeLinecap="round" />
      </g>
      <g className={styles.cleanLines} fill="none" stroke="#8ee9ff" strokeWidth="6" strokeLinecap="round">
        <path d="M525 284c24-31 50-39 78-22" />
        <path d="M540 307c23-26 47-31 72-16" />
        <path d="M551 331c21-20 41-23 60-12" />
      </g>
      <g transform="translate(728 325)">
        <Client pose="approval" scale={0.9} />
      </g>
    </g>
  );
}

function PricingScene() {
  return (
    <g>
      <g transform="translate(385 285)">
        <Car scale={0.92} />
      </g>
      <g transform="translate(90 210)">
        <Worker pose="tablet" scale={1.08} />
      </g>
      <g transform="translate(733 300)">
        <Client pose="considering" scale={0.98} />
      </g>
      <g className={styles.priceTags} transform="translate(304 110)">
        <PriceTag x={0} label="ENTRADA" value="R$ 260" tone="low" />
        <PriceTag x={165} label="SUSTENTÁVEL" value="R$ 520" tone="mid" />
        <PriceTag x={330} label="PREMIUM" value="R$ 760" tone="high" />
      </g>
      <g className={styles.decisionLine}>
        <path d="M245 270C356 214 558 210 708 276" fill="none" stroke="#7adff8" strokeOpacity="0.32" strokeWidth="4" strokeDasharray="10 12" />
      </g>
    </g>
  );
}

function PriceTag({ x, label, value, tone }: { x: number; label: string; value: string; tone: 'low' | 'mid' | 'high' }) {
  const colors = {
    low: ['#15415a', '#62d7f4'],
    mid: ['#164f68', '#7ae7ff'],
    high: ['#4a3516', '#ffd365'],
  } as const;
  return (
    <g className={styles.priceTag} transform={`translate(${x} 0)`} filter="url(#objectShadow)">
      <rect width="145" height="102" rx="22" fill={colors[tone][0]} stroke={colors[tone][1]} strokeWidth="3" />
      <text x="72.5" y="34" fill="#cceefa" fontSize="12" fontWeight="800" textAnchor="middle">{label}</text>
      <text x="72.5" y="68" fill="#ffffff" fontSize="24" fontWeight="900" textAnchor="middle">{value}</text>
      <rect x="27" y="82" width="91" height="6" rx="3" fill={colors[tone][1]} opacity="0.52" />
    </g>
  );
}

function ComplaintScene() {
  return (
    <g>
      <g transform="translate(360 272)">
        <Car scale={0.96} />
      </g>
      <g transform="translate(104 214)">
        <Worker pose="clipboard" scale={1.06} />
      </g>
      <g transform="translate(718 295)">
        <Client pose="complaint" scale={1.02} />
      </g>
      <g className={styles.issueMarker} transform="translate(577 298)">
        <circle r="29" fill="#ef4444" opacity="0.22" />
        <circle r="19" fill="#f87171" />
        <text y="8" fill="#7f1d1d" fontSize="25" fontWeight="900" textAnchor="middle">!</text>
      </g>
      <g className={styles.inspectionBeam}>
        <path d="M295 315C395 291 486 292 577 298" fill="none" stroke="#fca5a5" strokeWidth="4" strokeDasharray="9 10" />
      </g>
      <g className={styles.speechBubble} transform="translate(650 144)" filter="url(#objectShadow)">
        <path d="M0 22C0 10 10 0 22 0h134c12 0 22 10 22 22v58c0 12-10 22-22 22H75l-28 22 8-22H22C10 102 0 92 0 80Z" fill="#f8fafc" />
        <path d="M24 32h126M24 52h98M24 72h110" stroke="#60778a" strokeWidth="8" strokeLinecap="round" />
      </g>
    </g>
  );
}

function GrowthScene() {
  return (
    <g>
      <g transform="translate(92 202)">
        <Worker pose="celebrating" scale={1.12} />
      </g>
      <g className={styles.growthDashboard} transform="translate(328 104)" filter="url(#softShadow)">
        <rect width="400" height="290" rx="34" fill="#0f2a3f" stroke="#32627c" strokeWidth="3" />
        <rect x="24" y="25" width="352" height="218" rx="24" fill="#173d55" />
        <path d="M54 205V78M54 205h284" stroke="#88aaba" strokeOpacity="0.4" strokeWidth="3" />
        <g className={styles.chartBars}>
          <rect x="88" y="158" width="44" height="47" rx="10" fill="#3caed5" />
          <rect x="159" y="128" width="44" height="77" rx="10" fill="#51c7e8" />
          <rect x="230" y="92" width="44" height="113" rx="10" fill="#69dcf6" />
          <rect x="301" y="53" width="44" height="152" rx="10" fill="#8cecff" />
        </g>
        <path className={styles.chartLine} d="M89 151l92-45 76 18 78-73" fill="none" stroke="#f7d66a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M319 50l22-4-7 21" fill="none" stroke="#f7d66a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="128" y="258" width="144" height="13" rx="6.5" fill="#75def6" opacity="0.35" />
      </g>
      <g className={styles.coinStack} transform="translate(690 360)">
        <Coin y={58} />
        <Coin y={39} />
        <Coin y={20} />
        <Coin y={1} />
      </g>
      <g className={styles.rewardStars} fill="#ffd45f" filter="url(#glow)">
        <path d="M258 119l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3Z" />
        <path d="M756 115l6 12 14 2-10 10 3 14-13-7-12 7 2-14-10-10 14-2Z" />
        <path d="M793 182l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" />
      </g>
    </g>
  );
}

function Coin({ y }: { y: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <ellipse cx="0" cy="0" rx="47" ry="14" fill="url(#coinGradient)" stroke="#ffe98c" strokeWidth="3" />
      <ellipse cx="0" cy="-5" rx="37" ry="8" fill="#ffe67a" opacity="0.6" />
    </g>
  );
}

function Car({ scale = 1, doorOpen = false }: { scale?: number; doorOpen?: boolean }) {
  return (
    <g className={styles.carGroup} transform={`scale(${scale})`} filter="url(#objectShadow)">
      <ellipse cx="220" cy="170" rx="210" ry="35" fill="#020813" opacity="0.42" />
      <path d="M36 124C48 84 86 64 138 57l41-38h163c53 0 98 32 125 82l36 12c25 8 38 25 38 47v17H19v-19c0-17 6-27 17-34Z" fill="url(#carPaint)" />
      <path d="M139 58l48-42h151c37 0 73 20 99 58Z" fill="url(#carGlass)" />
      <path d="M193 19l-12 56M339 17l24 58" stroke="#1d5575" strokeWidth="6" />
      <path d="M42 127c109-21 277-16 445 5" fill="none" stroke="#e8fbff" strokeOpacity="0.56" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 145h64" stroke="#d7f7ff" strokeWidth="12" strokeLinecap="round" />
      <path d="M416 143h62" stroke="#9ceaff" strokeWidth="11" strokeLinecap="round" />
      <rect x="203" y="88" width="116" height="60" rx="17" fill="#0a4565" opacity="0.48" />
      <path d="M318 88v62" stroke="#8de8ff" strokeOpacity="0.36" strokeWidth="4" />
      <circle cx="126" cy="164" r="45" fill="#07121d" />
      <circle cx="126" cy="164" r="27" fill="url(#metalGradient)" />
      <circle cx="126" cy="164" r="9" fill="#496576" />
      <circle cx="403" cy="164" r="45" fill="#07121d" />
      <circle cx="403" cy="164" r="27" fill="url(#metalGradient)" />
      <circle cx="403" cy="164" r="9" fill="#496576" />
      <path d="M86 115h56" stroke="#c8f5ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M365 112h62" stroke="#c8f5ff" strokeWidth="4" strokeLinecap="round" />
      {doorOpen && (
        <g className={styles.openDoor} transform="translate(310 85) rotate(-10)">
          <path d="M0 0h92v89H0Z" fill="#127da9" stroke="#7de8ff" strokeWidth="5" />
          <path d="M10 12h68v30H10Z" fill="url(#carGlass)" />
          <path d="M13 57h39" stroke="#d2f8ff" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

function Worker({ pose, scale = 1 }: { pose: 'thinking' | 'choosing' | 'washing' | 'polishing' | 'interior' | 'tablet' | 'clipboard' | 'celebrating'; scale?: number }) {
  return (
    <g className={`${styles.person} ${styles[`pose_${pose}`]}`} transform={`scale(${scale})`} filter="url(#objectShadow)">
      <ellipse cx="68" cy="203" rx="50" ry="15" fill="#020814" opacity="0.45" />
      <g className={styles.personBody}>
        <path d="M44 78c5-20 42-25 53 0l7 74H36Z" fill="url(#shirtGradient)" />
        <rect x="47" y="92" width="43" height="9" rx="4.5" fill="#d8f7ff" opacity="0.48" />
        <path d="M48 150h20l-4 51H38Z" fill="url(#darkFabric)" />
        <path d="M70 150h20l17 51H78Z" fill="url(#darkFabric)" />
        <path d="M32 199h37c6 0 9 6 6 12H28c-5-7-2-12 4-12Z" fill="#eef7fb" />
        <path d="M77 199h38c6 0 8 6 5 12H73c-4-7-2-12 4-12Z" fill="#eef7fb" />
      </g>
      <g className={styles.personHead}>
        <ellipse cx="68" cy="48" rx="30" ry="35" fill="url(#skinGradient)" />
        <path d="M40 45c-2-31 18-45 39-41 23 4 29 22 20 42-9-11-18-18-35-20-6 11-14 17-24 19Z" fill="#5b341f" />
        <path d="M48 20c7-13 20-20 33-16" fill="none" stroke="#7b4a2e" strokeWidth="8" strokeLinecap="round" />
        <ellipse cx="57" cy="49" rx="4" ry="5" fill="#173348" />
        <ellipse cx="79" cy="49" rx="4" ry="5" fill="#173348" />
        <path d="M60 64c6 5 12 5 18 0" fill="none" stroke="#9e4b45" strokeWidth="3" strokeLinecap="round" />
      </g>
      <Arm pose={pose} side="left" />
      <Arm pose={pose} side="right" />
      {(pose === 'tablet' || pose === 'clipboard') && (
        <g className={styles.handProp} transform="translate(92 95) rotate(10)">
          <rect width="43" height="58" rx="8" fill={pose === 'tablet' ? '#172d3d' : '#eff7fb'} stroke="#91dff5" strokeWidth="4" />
          {pose === 'tablet' ? (
            <path d="M10 13h23M10 25h23M10 37h15" stroke="#6bdcf9" strokeWidth="4" strokeLinecap="round" />
          ) : (
            <path d="M10 16h23M10 29h18M10 42h23" stroke="#496879" strokeWidth="4" strokeLinecap="round" />
          )}
        </g>
      )}
    </g>
  );
}

function Arm({ pose, side }: { pose: string; side: 'left' | 'right' }) {
  const leftTransforms: Record<string, string> = {
    thinking: 'translate(43 83) rotate(-14)',
    choosing: 'translate(42 83) rotate(22)',
    washing: 'translate(41 84) rotate(18)',
    polishing: 'translate(40 85) rotate(35)',
    interior: 'translate(40 84) rotate(28)',
    tablet: 'translate(43 84) rotate(15)',
    clipboard: 'translate(43 84) rotate(12)',
    celebrating: 'translate(42 85) rotate(-52)',
  };
  const rightTransforms: Record<string, string> = {
    thinking: 'translate(92 83) rotate(-74)',
    choosing: 'translate(92 83) rotate(-35)',
    washing: 'translate(92 84) rotate(-28)',
    polishing: 'translate(92 85) rotate(-42)',
    interior: 'translate(92 84) rotate(-38)',
    tablet: 'translate(91 84) rotate(-18)',
    clipboard: 'translate(91 84) rotate(-12)',
    celebrating: 'translate(92 85) rotate(52)',
  };
  return (
    <g
      className={`${styles.personArm} ${pose === 'thinking' && side === 'right' ? styles.thinkingArm : ''}`}
      transform={(side === 'left' ? leftTransforms : rightTransforms)[pose]}
    >
      <rect x="-8" y="0" width="16" height="58" rx="8" fill="url(#skinGradient)" />
      <circle cy="60" r="10" fill="url(#skinGradient)" />
    </g>
  );
}

function Client({ pose, scale = 1 }: { pose: 'approval' | 'considering' | 'complaint'; scale?: number }) {
  return (
    <g className={`${styles.clientPerson} ${styles[`client_${pose}`]}`} transform={`scale(${scale})`} filter="url(#objectShadow)">
      <ellipse cx="61" cy="200" rx="48" ry="14" fill="#020814" opacity="0.42" />
      <ellipse cx="61" cy="45" rx="28" ry="34" fill="url(#skinGradient)" />
      <path d="M34 44c-4-28 14-42 34-39 21 4 28 20 20 39-9-12-20-17-31-19-6 10-14 16-23 19Z" fill="#2c211d" />
      <ellipse cx="51" cy="48" rx="4" ry="5" fill="#173348" />
      <ellipse cx="71" cy="48" rx="4" ry="5" fill="#173348" />
      <path d="M52 64c6 4 12 4 18 0" fill="none" stroke="#9e4b45" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 76c8-13 39-14 47 1l6 75H31Z" fill="#d8eef8" />
      <path d="M41 151h20l-6 48H30Z" fill="url(#darkFabric)" />
      <path d="M63 151h20l14 48H72Z" fill="url(#darkFabric)" />
      <rect x="22" y="198" width="38" height="12" rx="6" fill="#f4f8fb" />
      <rect x="67" y="198" width="38" height="12" rx="6" fill="#f4f8fb" />
      <ClientArm pose={pose} side="left" />
      <ClientArm pose={pose} side="right" />
    </g>
  );
}

function ClientArm({ pose, side }: { pose: 'approval' | 'considering' | 'complaint'; side: 'left' | 'right' }) {
  const transforms = {
    approval: side === 'left' ? 'translate(36 82) rotate(24)' : 'translate(85 82) rotate(-56)',
    considering: side === 'left' ? 'translate(36 82) rotate(18)' : 'translate(85 82) rotate(-76)',
    complaint: side === 'left' ? 'translate(36 82) rotate(18)' : 'translate(85 82) rotate(-88)',
  };
  return (
    <g className={styles.clientArm} transform={transforms[pose]}>
      <rect x="-7" width="14" height="55" rx="7" fill="url(#skinGradient)" />
      <circle cy="57" r="9" fill="url(#skinGradient)" />
    </g>
  );
}

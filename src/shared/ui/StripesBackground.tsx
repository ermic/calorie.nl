'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Config = {
  stripeW: number;
  pitch: number;
  bendX: number;
  bendY: number;
  bendYRatio?: number;
  cornerR: number;
  opacity: number;
};

const DESKTOP: Config = {
  stripeW: 18,
  pitch: 26,
  bendX: 240,
  bendY: 620,
  cornerR: 120,
  opacity: 0.8,
};

const MOBILE: Config = {
  stripeW: 14,
  pitch: 20,
  bendX: 320,
  bendY: 360,
  bendYRatio: 0.5,
  cornerR: 48,
  opacity: 0.2,
};

const STRIPES = [
  'var(--color-accent-green)',
  'var(--color-accent-yellow)',
  'var(--color-primary-500)',
  'var(--color-danger)',
  'var(--color-accent-blue)',
];

const SQ2 = Math.SQRT2;

// Deterministische FNV-1a hash → [0, 1). Gebruikt om per stripe stabiele
// "random" waardes te kiezen zodat SSR en client identieke paden renderen.
function seededRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

type Joke = {
  fraction: number; // [0.7, 0.8] van het verticale stuk waarop de stripe afbuigt
  thetaRad: number; // hoek (in rad) t.o.v. recht-naar-onderen, signed
  bendR: number;    // straal van het afbuigboogje
};

function stripePath(c: Config, i: number, vbH: number, joke: Joke | null) {
  // Gedeeld middelpunt voor alle stripes, zodat de bochten concentrisch
  // om een denkbeeldige bal "wrappen". Elke stripe i krijgt radius
  // c.cornerR + i*c.pitch, dus de spacing blijft gelijk aan de pitch.
  const cx = c.bendX - c.cornerR;
  const cy = c.bendY + c.cornerR;
  const r = c.cornerR + i * c.pitch;

  // Raakpunt op de 45°-diagonaal (komt vanaf linksboven).
  const tDiagX = cx + r / SQ2;
  const tDiagY = cy - r / SQ2;
  // Raakpunt op de verticale, waarna de stripe naar onderen verdwijnt.
  const tVertX = cx + r;
  const tVertY = cy;

  const startY = -400;
  const startX = tDiagX - (tDiagY - startY);
  const endY = vbH + 400;

  const head = `M ${startX},${startY} L ${tDiagX},${tDiagY} A ${r} ${r} 0 0 1 ${tVertX},${tVertY}`;

  // Geen joke: stripe loopt strak rechtdoor naar onderen.
  if (joke == null) {
    return `${head} L ${tVertX},${endY}`;
  }

  // Punt waar de stripe afbuigt (tussen 70-80% van de verticale weg).
  const pX = tVertX;
  const pY = tVertY + joke.fraction * (endY - tVertY);

  // Boog van richting (0,1) → (sinθ, cosθ) met radius bendR.
  const theta = joke.thetaRad;
  const sign = theta >= 0 ? 1 : -1;
  const absT = Math.abs(theta);
  const bR = joke.bendR;
  const qX = pX + sign * bR * (1 - Math.cos(absT));
  const qY = pY + bR * Math.sin(absT);
  // sweep=0 voor rechter-bocht (center rechts van P), sweep=1 voor linker.
  const sweep = sign > 0 ? 0 : 1;

  // Doortrekken in nieuwe richting tot ruim buiten beeld.
  const exitLen = vbH * 2 + 1000;
  const exitX = qX + exitLen * Math.sin(theta);
  const exitY = qY + exitLen * Math.cos(theta);

  return `${head} L ${pX},${pY} A ${bR} ${bR} 0 0 ${sweep} ${qX},${qY} L ${exitX},${exitY}`;
}

function StripesSvg({
  config,
  className,
  animate,
}: {
  config: Config;
  className: string;
  animate: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewportH, setViewportH] = useState(0);
  const [jokes, setJokes] = useState<(Joke | null)[] | null>(null);
  const uid = useId();
  const gradId = `${uid}-grad`;
  const maskId = `${uid}-mask`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setViewportH(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Genereer écht random afbuig-parameters bij iedere page-load. Loopt
  // alleen client-side zodat SSR-output deterministisch (seeded) blijft
  // en er geen hydration-mismatch optreedt.
  useEffect(() => {
    // Kies 2 indices die strak naar onderen blijven; rest krijgt joke.
    const indices = STRIPES.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const straight = new Set(indices.slice(0, 2));

    // setState in effect is hier opzettelijk: SSR rendert deterministisch
    // met seeded waardes; pas na mount injecteren we Math.random()-waarden
    // zodat elke pageload een ander stripe-pattern krijgt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJokes(
      STRIPES.map((_, i) => {
        if (straight.has(i)) return null;
        const angleSign = Math.random() > 0.5 ? 1 : -1;
        const angleDeg = (15 + Math.random() * 65) * angleSign;
        return {
          fraction: 0.7 + Math.random() * 0.1,
          thetaRad: (angleDeg * Math.PI) / 180,
          bendR: 60 + Math.random() * 80,
        };
      }),
    );
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="xMinYMin slice"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" />
          <stop offset="0.9" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id={maskId}>
          <rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${gradId})`} />
        </mask>
      </defs>
      <g
        mask={`url(#${maskId})`}
        opacity={config.opacity}
        strokeWidth={config.stripeW}
        fill="none"
        strokeLinecap="butt"
      >
        {STRIPES.map((color, i) => {
          const resolved =
            config.bendYRatio != null
              ? { ...config, bendY: viewportH * config.bendYRatio }
              : config;
          const duration = 5 + i * 0.75;
          const delay = i * 0.15;
          const reverse = i % 2 === 1;
          const name = reverse
            ? 'landing-stripe-draw-reverse'
            : 'landing-stripe-draw';

          // Grapje: tussen 70-80% buigt iedere stripe af onder een
          // willekeurige hoek (max ±80° zodat hij niet naar boven eindigt).
          // SSR + initiële client-render gebruiken seeded values (gelijk),
          // daarna injecteert de useEffect écht random params per pageload.
          let joke: Joke | null;
          if (jokes) {
            joke = jokes[i];
          } else {
            const seed = `${color}-${i}`;
            const angleSign = seededRand(`${seed}-s`) > 0.5 ? 1 : -1;
            const angleDeg = (15 + seededRand(`${seed}-a`) * 65) * angleSign;
            joke = {
              fraction: 0.7 + seededRand(`${seed}-f`) * 0.1,
              thetaRad: (angleDeg * Math.PI) / 180,
              bendR: 60 + seededRand(`${seed}-r`) * 80,
            };
          }

          return (
            <path
              key={color}
              d={stripePath(resolved, i, size.h, joke)}
              stroke={color}
              {...(animate
                ? {
                    pathLength: 1,
                    strokeDasharray: '1 1',
                    style: {
                      animation: `${name} ${duration}s ease-out ${delay}s both`,
                    },
                  }
                : {})}
            />
          );
        })}
      </g>
    </svg>
  );
}

export function StripesBackground({ animate = true }: { animate?: boolean }) {
  return (
    <>
      <StripesSvg config={MOBILE} className="sm:hidden" animate={false} />
      <StripesSvg config={DESKTOP} className="hidden sm:block" animate={animate} />
    </>
  );
}

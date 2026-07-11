/**
 * Animated sports line-art, all inline SVG + CSS keyframes (see index.css).
 * Every piece is decorative (aria-hidden), theme-aware via CSS variables,
 * and freezes cleanly under prefers-reduced-motion.
 */

const VOLT = 'rgb(var(--c-ember))';
const ICE = 'rgb(var(--c-cool))';
const HOT = 'rgb(var(--c-hot))';
const GOLD = 'rgb(var(--c-gold))';
const LINE = 'rgb(var(--ink-border))';

/** Football pitch line-drawing that sketches itself in. Use as a card/hero backdrop. */
export function PitchLines({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 400"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke={VOLT} strokeWidth="1.5" opacity="0.5">
        {/* touchline */}
        <rect x="40" y="30" width="560" height="340" rx="4" className="sport-draw" />
        {/* halfway line + center circle */}
        <line x1="320" y1="30" x2="320" y2="370" className="sport-draw" style={{ animationDelay: '0.3s' }} />
        <circle cx="320" cy="200" r="56" className="sport-draw" style={{ animationDelay: '0.5s' }} />
        <circle cx="320" cy="200" r="3" fill={VOLT} stroke="none" />
        {/* left penalty area */}
        <rect x="40" y="120" width="90" height="160" className="sport-draw" style={{ animationDelay: '0.7s' }} />
        <rect x="40" y="160" width="36" height="80" className="sport-draw" style={{ animationDelay: '0.9s' }} />
        <path d="M130 165 A 56 56 0 0 1 130 235" className="sport-draw" style={{ animationDelay: '1.1s' }} />
        {/* right penalty area */}
        <rect x="510" y="120" width="90" height="160" className="sport-draw" style={{ animationDelay: '0.7s' }} />
        <rect x="564" y="160" width="36" height="80" className="sport-draw" style={{ animationDelay: '0.9s' }} />
        <path d="M510 165 A 56 56 0 0 0 510 235" className="sport-draw" style={{ animationDelay: '1.1s' }} />
      </g>
    </svg>
  );
}

/** Spinning geodesic football with a floating drift. */
export function SoccerBall({ size = 72, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`sport-float ${className}`} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" stroke={LINE} strokeWidth="2.5" fill="rgb(var(--ink-card))" />
        <g className="sport-spin">
          {/* center pentagon */}
          <path d="M50 30 L66 42 L60 61 L40 61 L34 42 Z" fill={VOLT} opacity="0.9" />
          {/* seams */}
          <g stroke={LINE} strokeWidth="2.5" strokeLinecap="round">
            <path d="M50 30 L50 9" />
            <path d="M66 42 L85 36" />
            <path d="M60 61 L73 78" />
            <path d="M40 61 L27 78" />
            <path d="M34 42 L15 36" />
          </g>
          {/* edge patches */}
          <g fill={LINE} opacity="0.7">
            <path d="M50 4 L61 8 L57 16 L43 16 L39 8 Z" />
            <path d="M90 40 L93 51 L85 56 L77 45 L81 37 Z" />
            <path d="M10 40 L19 37 L23 45 L15 56 L7 51 Z" />
            <path d="M70 85 L60 91 L54 84 L62 74 L71 76 Z" />
            <path d="M30 85 L29 76 L38 74 L46 84 L40 91 Z" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Concentric passion-radar pulses. Sits behind gauges and stat heroes. */
export function RadarPulse({ size = 180, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="100"
          cy="100"
          r="80"
          stroke={VOLT}
          strokeWidth="1.5"
          className="sport-pulse"
          style={{ animationDelay: `${i * 1.05}s` }}
        />
      ))}
      <circle cx="100" cy="100" r="5" fill={VOLT} className="animate-pulse-glow" />
    </svg>
  );
}

/** Trophy line-art with a slow gold shimmer ring — the Hype-Off centerpiece. */
export function TrophyArt({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`sport-float ${className}`} aria-hidden>
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="54" stroke={GOLD} strokeWidth="1" opacity="0.35" className="sport-spin" strokeDasharray="6 10" />
        <g stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* cup */}
          <path d="M42 30 H78 V52 A18 18 0 0 1 42 52 Z" className="sport-draw" />
          {/* handles */}
          <path d="M42 35 H30 A4 4 0 0 0 26 40 C26 50 34 54 43 54" className="sport-draw" style={{ animationDelay: '0.4s' }} />
          <path d="M78 35 H90 A4 4 0 0 1 94 40 C94 50 86 54 77 54" className="sport-draw" style={{ animationDelay: '0.4s' }} />
          {/* stem + base */}
          <path d="M60 70 V80 M50 88 H70 M46 94 H74" className="sport-draw" style={{ animationDelay: '0.8s' }} />
          <path d="M54 80 H66 L68 88 H52 Z" className="sport-draw" style={{ animationDelay: '0.8s' }} />
        </g>
        {/* spark */}
        <path d="M60 44 l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1 Z" fill={GOLD} opacity="0.9" className="animate-pulse-glow" />
      </svg>
    </div>
  );
}

/** Crowd-wave equalizer: a stadium stand doing the wave. */
export function StadiumWave({ className = '', bars = 14 }: { className?: string; bars?: number }) {
  const colors = [VOLT, ICE, HOT, GOLD];
  return (
    <svg
      className={className}
      viewBox={`0 0 ${bars * 14} 60`}
      fill="none"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    >
      {Array.from({ length: bars }, (_, i) => (
        <g key={i} className="sport-wave" style={{ animationDelay: `${i * 0.14}s` }}>
          <circle cx={i * 14 + 7} cy={26 - (i % 3) * 4} r="4" fill={colors[i % colors.length]} opacity="0.85" />
          <rect
            x={i * 14 + 3}
            y={34 - (i % 3) * 4}
            width="8"
            height={22 + (i % 3) * 4}
            rx="3"
            fill={colors[i % colors.length]}
            opacity="0.35"
          />
        </g>
      ))}
    </svg>
  );
}

/** A tiny corner-flag pennant that ripples. Good for section kickers. */
export function CornerFlag({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <line x1="10" y1="4" x2="10" y2="44" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" />
      <path className="sport-wave" d="M10 6 C20 3 26 9 38 6 L38 20 C26 23 20 17 10 20 Z" fill={HOT} opacity="0.9" />
      <path d="M4 44 H22" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

import { useLayoutEffect, useRef } from 'react';
import { alpha, passionColor, scoreLabel } from '../lib/format';
import { gsap, prefersReducedMotion } from '../lib/motion';

/**
 * Radial passion gauge. The arc length and color both encode the 0–100 score.
 * On mount, GSAP sweeps the arc from zero and counts the number up; later
 * score changes tween via the CSS transition on stroke-dasharray.
 *
 * The number span is rendered with NO React children — its text is set only
 * via textContent in the effects below. (React-managed text nodes must never
 * share a parent with imperative textContent writes, or React crashes with
 * removeChild NotFoundError on the next re-render.)
 */
export default function ScoreGauge({
  score,
  size = 72,
  showLabel = false,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
}) {
  const stroke = size < 60 ? 5 : 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * c;
  const color = passionColor(clamped);

  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const sweeping = useRef(false);

  // Entrance sweep — the [] deps run this once per mount (and StrictMode's
  // dev remount re-sweeps cleanly because the cleanup kills the tween).
  // Declared first so the sync effect below sees `sweeping` set on mount.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;

    sweeping.current = true;
    // Suspend the CSS transition while GSAP drives each frame of the sweep.
    arc.style.transition = 'none';
    const state = { v: 0 };
    const tween = gsap.to(state, {
      v: clamped,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        const d = (state.v / 100) * c;
        arc.setAttribute('stroke-dasharray', `${d} ${c - d}`);
        num.textContent = String(Math.round(state.v));
      },
      onComplete: () => {
        arc.setAttribute('stroke-dasharray', `${dash} ${c - dash}`);
        num.textContent = String(Math.round(clamped));
        arc.style.transition = '';
        sweeping.current = false;
      },
    });
    return () => {
      arc.style.transition = '';
      sweeping.current = false;
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the number in sync on first paint (reduced motion) and whenever the
  // score prop changes after the entrance sweep has finished.
  useLayoutEffect(() => {
    const num = numRef.current;
    if (num && !sweeping.current) {
      num.textContent = String(Math.round(clamped));
    }
  }, [clamped]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          style={{ stroke: 'rgb(var(--ink-border))' }}
          strokeWidth={stroke}
        />
        <circle
          ref={arcRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            transition: 'stroke-dasharray 0.6s ease, stroke 0.6s ease',
            filter: `drop-shadow(0 0 4px ${alpha(color, 55)})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          ref={numRef}
          aria-label={String(Math.round(clamped))}
          className="font-display font-bold leading-none"
          style={{ fontSize: size * 0.3, color }}
        />
        {showLabel && (
          <span
            className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={{ color }}
          >
            {scoreLabel(clamped)}
          </span>
        )}
      </div>
    </div>
  );
}

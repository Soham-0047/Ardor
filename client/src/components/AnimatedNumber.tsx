import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../lib/motion';

/**
 * Counts up (or down) to `value` with GSAP whenever it changes.
 *
 * IMPORTANT: the span is rendered with NO React children — its text is driven
 * exclusively via textContent inside the effect. Mixing React-managed text
 * nodes with imperative textContent mutation detaches React's tracked nodes
 * and crashes with removeChild NotFoundError on the next re-render.
 * The final value is exposed to screen readers via aria-label.
 */
export default function AnimatedNumber({
  value,
  suffix = '',
  duration = 1.1,
  className = '',
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const displayed = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      displayed.current = value;
      el.textContent = `${Math.round(value)}${suffix}`;
      return;
    }

    // Paint the starting value synchronously so there's no blank frame.
    const state = { v: displayed.current };
    el.textContent = `${Math.round(state.v)}${suffix}`;

    const tween = gsap.to(state, {
      v: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = `${Math.round(state.v)}${suffix}`;
      },
      onComplete: () => {
        displayed.current = value;
      },
    });
    return () => {
      displayed.current = state.v;
      tween.kill();
    };
  }, [value, suffix, duration]);

  return <span ref={ref} className={className} aria-label={`${Math.round(value)}${suffix}`} />;
}

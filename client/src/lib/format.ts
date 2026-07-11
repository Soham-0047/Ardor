import type { Domain, Sentiment } from './types';

/**
 * Passion-score color scale: cool (calm) → gold (charged) → hot pink (delirium).
 *
 * The stops are CSS variables (--p0 … --p100, defined per-theme in index.css),
 * and interpolation happens in CSS via color-mix(). That keeps the scale
 * continuous AND theme-aware with zero JS re-rendering on theme toggle.
 */
const STOPS = [0, 45, 65, 82, 100] as const;

export function passionColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const lo = STOPS[i];
    const hi = STOPS[i + 1];
    if (s >= lo && s <= hi) {
      const pct = Math.round(((s - lo) / (hi - lo)) * 100);
      return `color-mix(in oklab, rgb(var(--p${hi})) ${pct}%, rgb(var(--p${lo})))`;
    }
  }
  return 'rgb(var(--p100))';
}

/** Mix any CSS color with transparency — the themed replacement for hex+alpha. */
export function alpha(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Delirium';
  if (score >= 80) return 'Electric';
  if (score >= 68) return 'Charged';
  if (score >= 50) return 'Simmering';
  if (score >= 35) return 'Mild';
  return 'Quiet';
}

export interface Meta {
  label: string;
  emoji: string;
  color: string;
}

export const SENTIMENT_META: Record<Sentiment, Meta> = {
  ecstatic: { label: 'Ecstatic', emoji: '🤩', color: 'rgb(var(--c-gold))' },
  positive: { label: 'Positive', emoji: '😄', color: 'rgb(var(--c-mint))' },
  neutral: { label: 'Neutral', emoji: '😐', color: 'rgb(var(--ink-muted))' },
  tense: { label: 'Tense', emoji: '😬', color: 'rgb(var(--c-violet))' },
  negative: { label: 'Negative', emoji: '😟', color: 'rgb(var(--c-orange))' },
  heartbroken: { label: 'Heartbroken', emoji: '💔', color: 'rgb(var(--c-blue))' },
};

export function sentimentMeta(s: string): Meta {
  return SENTIMENT_META[(s as Sentiment)] ?? SENTIMENT_META.neutral;
}

export const DOMAIN_META: Record<Domain, Meta> = {
  worldcup: { label: 'World Cup', emoji: '⚽', color: 'rgb(var(--c-cool))' },
  rivalry: { label: 'Rivalry', emoji: '⚔️', color: 'rgb(var(--c-hot))' },
  personal: { label: 'Personal', emoji: '🔥', color: 'rgb(var(--c-ember))' },
};

export function domainMeta(d: string): Meta {
  return DOMAIN_META[(d as Domain)] ?? { label: d, emoji: '•', color: 'rgb(var(--ink-muted))' };
}

export function prettyType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function timeAgo(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const secs = Math.round((Date.now() - then) / 1000);
  const abs = Math.abs(secs);
  const fmt = (n: number, unit: string) => `${n}${unit}${secs < 0 ? ' from now' : ' ago'}`;
  if (abs < 60) return 'just now';
  if (abs < 3600) return fmt(Math.round(abs / 60), 'm');
  if (abs < 86400) return fmt(Math.round(abs / 3600), 'h');
  if (abs < 604800) return fmt(Math.round(abs / 86400), 'd');
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short model provenance label, e.g. "Gemini" or "Heuristic". */
export function modelLabel(model: string): string {
  if (model.startsWith('gemini')) return 'Gemini';
  if (model.startsWith('heuristic')) return 'Heuristic';
  return model;
}

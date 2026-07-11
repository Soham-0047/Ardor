import type { ReactNode } from 'react';
import { alpha, domainMeta, sentimentMeta } from '../lib/format';

/** A colored pill. Pass any CSS color (vars welcome); tint/border derive from it. */
export function Pill({
  color,
  children,
  className = '',
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`ff-pill ${className}`}
      style={{
        color,
        backgroundColor: alpha(color, 12),
        border: `1px solid ${alpha(color, 30)}`,
      }}
    >
      {children}
    </span>
  );
}

export function SentimentPill({ sentiment }: { sentiment: string }) {
  const m = sentimentMeta(sentiment);
  return (
    <Pill color={m.color}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </Pill>
  );
}

export function DomainPill({ domain }: { domain: string }) {
  const m = domainMeta(domain);
  return (
    <Pill color={m.color}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </Pill>
  );
}

export function KeyMomentBadge() {
  return (
    <span className="ff-pill border border-gold/40 bg-gold/15 text-gold">
      ★ Key moment
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent = 'rgb(var(--c-ember))',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="ff-card p-4 animate-rise">
      <div className="ff-label">{label}</div>
      <div className="mt-1 text-3xl font-display font-bold tracking-tight" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-bold text-strong">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-border border-t-ember" />
      {label ?? 'Loading…'}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="ff-card flex flex-col items-center justify-center gap-1 p-10 text-center">
      <div className="text-2xl">🕳️</div>
      <div className="font-semibold text-fg">{title}</div>
      {hint && <div className="text-sm text-ink-muted">{hint}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="ff-card border-red-500/40 bg-red-500/10 p-4 text-sm text-danger">
      {message}
    </div>
  );
}

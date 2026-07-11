import { useMemo, useState, type CSSProperties } from 'react';
import { api, type EventQuery } from '../lib/api';
import type { Domain } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { DOMAIN_META, alpha, passionColor, scoreLabel } from '../lib/format';
import { ErrorNote, StatTile } from '../components/ui';
import AnimatedNumber from '../components/AnimatedNumber';
import PassionFeed from '../components/PassionFeed';
import TrendsPanel from '../components/TrendsPanel';
import IntegrationStatus from '../components/IntegrationStatus';
import { RadarPulse } from '../components/SportsArt';

type SortMode = 'recent' | 'score';

const DOMAIN_KEYS = Object.keys(DOMAIN_META) as Domain[];

function activeStyle(color: string): CSSProperties {
  return { color, backgroundColor: alpha(color, 12), borderColor: alpha(color, 40) };
}

export default function DashboardPage() {
  const [domain, setDomain] = useState<Domain | undefined>(undefined);
  const [sort, setSort] = useState<SortMode>('recent');
  const [keyOnly, setKeyOnly] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Hero totals — always global (no domain filter), refreshed after ingest.
  const trends = useAsync(() => api.trends(), [nonce]);

  const query = useMemo<EventQuery>(
    () => ({
      domain,
      sort,
      keyMoment: keyOnly ? true : undefined,
      limit: 40,
    }),
    [domain, sort, keyOnly],
  );

  async function rerunIngest() {
    setIngesting(true);
    setIngestError(null);
    try {
      await api.ingest();
      // Bumping the nonce refetches hero trends (deps) and remounts the feed +
      // trends panel so every surface reflects the freshly ingested moments.
      setNonce((n) => n + 1);
    } catch (e) {
      setIngestError(e instanceof Error ? e.message : 'Ingest failed');
    } finally {
      setIngesting(false);
    }
  }

  const totals = trends.data?.totals;
  const domainCount = trends.data?.byDomain.length ?? 0;
  const avg = totals ? Math.round(totals.avgScore) : 0;

  return (
    <div className="space-y-6">
      {/* Hero band */}
      <section className="ff-card animate-rise relative overflow-hidden p-6 sm:p-8">
        <RadarPulse className="pointer-events-none absolute -right-10 -top-10 opacity-60" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-strong text-balance sm:text-4xl">
              The pulse of fandom, <span className="gradient-text">scored in real time</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              Every match moment and fan reaction, rated 0–100 for passion, made searchable, and
              rewarded.
            </p>
          </div>
          <button
            type="button"
            onClick={rerunIngest}
            disabled={ingesting}
            className="ff-btn-ghost shrink-0 px-3 py-1.5 text-xs"
          >
            {ingesting ? 'Re-running…' : '↻ Re-run ingest'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Total moments"
            value={totals ? <AnimatedNumber value={totals.count} /> : '…'}
            sub="scored across domains"
            accent="rgb(var(--c-cool))"
          />
          <StatTile
            label="Avg passion"
            value={totals ? <AnimatedNumber value={avg} /> : '…'}
            sub={totals ? scoreLabel(avg) : undefined}
            accent={totals ? passionColor(avg) : 'rgb(var(--c-ember))'}
          />
          <StatTile
            label="Key moments"
            value={totals ? <AnimatedNumber value={totals.keyMoments} /> : '…'}
            sub="★ flagged"
            accent="rgb(var(--c-gold))"
          />
          <StatTile
            label="Domains"
            value={trends.data ? <AnimatedNumber value={domainCount} /> : '…'}
            sub="active plugins"
            accent="rgb(var(--c-violet))"
          />
        </div>

        {ingestError && (
          <div className="mt-4">
            <ErrorNote message={ingestError} />
          </div>
        )}
        {trends.error && !ingestError && (
          <div className="mt-4">
            <ErrorNote message={trends.error} />
          </div>
        )}
      </section>

      {/* Filter bar */}
      <div className="ff-card flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDomain(undefined)}
            aria-pressed={domain === undefined}
            className="ff-chip transition hover:text-strong"
            style={domain === undefined ? activeStyle('rgb(var(--c-ember))') : undefined}
          >
            All
          </button>
          {DOMAIN_KEYS.map((d) => {
            const m = DOMAIN_META[d];
            const active = domain === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDomain(active ? undefined : d)}
                aria-pressed={active}
                className="ff-chip transition hover:text-strong"
                style={active ? activeStyle(m.color) : undefined}
              >
                <span aria-hidden>{m.emoji}</span> {m.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-ink-border bg-ink-800/60 p-0.5">
            {(['recent', 'score'] as SortMode[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  sort === s
                    ? 'bg-gradient-to-b from-ember-soft to-ember text-on-accent'
                    : 'text-ink-muted hover:text-strong'
                }`}
              >
                {s === 'recent' ? 'Recent' : 'Top passion'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setKeyOnly((v) => !v)}
            aria-pressed={keyOnly}
            className="ff-chip transition hover:text-strong"
            style={keyOnly ? activeStyle('rgb(var(--c-hot))') : undefined}
          >
            ★ Key moments only
          </button>
        </div>
      </div>

      {/* Feed + sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PassionFeed key={nonce} query={query} />
        </div>
        <aside className="space-y-6">
          <TrendsPanel key={nonce} domain={domain} />
          <IntegrationStatus />
        </aside>
      </div>
    </div>
  );
}

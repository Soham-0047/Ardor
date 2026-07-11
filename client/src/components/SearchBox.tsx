import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { alpha, DOMAIN_META, timeAgo } from '../lib/format';
import type { Domain } from '../lib/types';
import ScoreGauge from './ScoreGauge';
import { DomainPill, EmptyState, ErrorNote, SentimentPill, Spinner } from './ui';

const EMBER = 'rgb(var(--c-ember))';
const DOMAINS = Object.keys(DOMAIN_META) as Domain[];
const EXAMPLES = ['comeback', 'penalty', 'red card', 'streak', 'rivalry'];

/**
 * Self-contained instant search. Debounces keystrokes (~220ms) and queries the
 * `/search` endpoint, which returns recent moments for an empty query.
 */
export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [domain, setDomain] = useState<Domain | undefined>(undefined);

  // Debounce keystrokes before hitting the API.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const { data, loading, error } = useAsync(
    () => api.search(debounced, { domain, limit: 24 }),
    [debounced, domain],
  );

  const results = data?.results ?? [];
  const count = data?.count ?? 0;

  return (
    <div className="space-y-5">
      {/* Search field */}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden>
          🔎
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search comebacks, penalties, rivalries…"
          aria-label="Search scored moments"
          className="ff-input pl-11 pr-4 py-3.5 text-base"
        />
      </div>

      {/* Domain filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="ff-label mr-1">Domain</span>
        <button
          type="button"
          onClick={() => setDomain(undefined)}
          className="ff-chip transition hover:text-strong"
          style={
            domain === undefined
              ? { color: EMBER, borderColor: alpha(EMBER, 40), backgroundColor: alpha(EMBER, 12) }
              : undefined
          }
        >
          All
        </button>
        {DOMAINS.map((d) => {
          const m = DOMAIN_META[d];
          const active = domain === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className="ff-chip transition hover:text-strong"
              style={
                active
                  ? { color: m.color, borderColor: alpha(m.color, 40), backgroundColor: alpha(m.color, 12) }
                  : undefined
              }
            >
              <span aria-hidden>{m.emoji}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Example queries */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="ff-label mr-1">Try</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setQuery(ex)}
            className="ff-chip transition hover:border-ember/50 hover:text-strong"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Result meta */}
      <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
        <span>
          {debounced ? (
            <>
              <span className="font-semibold text-strong">{count}</span> result{count === 1 ? '' : 's'} for{' '}
              <span className="text-ember-soft">“{debounced}”</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-strong">{count}</span> recent moment{count === 1 ? '' : 's'}
            </>
          )}
        </span>
        {loading && <Spinner label="Searching…" />}
      </div>

      {/* States */}
      {error ? (
        <ErrorNote message={error} />
      ) : results.length === 0 && !loading ? (
        <EmptyState
          title="No moments found"
          hint={debounced ? 'Try a different phrase or clear the domain filter.' : 'No scored moments yet.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((r) => {
            const hot = r.passion_score >= 80;
            return (
              <article
                key={r.id}
                className={`ff-card animate-rise flex gap-3 p-4 transition hover:border-ember/40 ${
                  hot ? 'ring-1 ring-ember/40' : ''
                }`}
              >
                <ScoreGauge score={r.passion_score} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                    <DomainPill domain={r.domain} />
                    <span className="ml-auto whitespace-nowrap">{timeAgo(r.occurredAt)}</span>
                  </div>

                  <h3 className="mt-2 font-display text-sm font-semibold text-strong text-balance">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-xs text-ink-muted">{r.one_line_recap}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <SentimentPill sentiment={r.sentiment} />
                    {r.teams.map((t) => (
                      <span key={t} className="ff-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

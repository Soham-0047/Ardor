import { useEffect } from 'react';
import { api, type EventQuery } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import EventCard from './EventCard';
import { EmptyState, ErrorNote, Spinner } from './ui';

const REFRESH_MS = 45_000;

/**
 * The live moment stream. Fully driven by the `query` handed down from the
 * Dashboard filter bar — refetches whenever the query content changes, and
 * silently re-polls in the background so new ingested moments appear without
 * a spinner flash (useAsync keeps the previous data while reloading).
 */
export default function PassionFeed({ query }: { query: EventQuery }) {
  const { data, loading, error, reload } = useAsync(
    () => api.events(query),
    [JSON.stringify(query)],
  );

  useEffect(() => {
    const id = window.setInterval(reload, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [reload]);

  // Spinner only on the very first load — background refreshes keep the list.
  if (loading && !data) {
    return (
      <div className="ff-card p-6">
        <Spinner label="Scoring moments…" />
      </div>
    );
  }

  if (error && !data) return <ErrorNote message={error} />;

  if (!data || data.events.length === 0) {
    return (
      <EmptyState
        title="No moments match yet"
        hint="Loosen the filters or re-run ingest to pull fresh moments."
      />
    );
  }

  const n = data.events.length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="ff-label">
          {n} moment{n === 1 ? '' : 's'}
        </span>
        <span className="h-px flex-1 bg-ink-border" />
        <span className="text-[10px] text-ink-faint" title="The feed re-polls in the background">
          auto-refresh {REFRESH_MS / 1000}s
        </span>
      </div>
      <div className="space-y-3">
        {data.events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

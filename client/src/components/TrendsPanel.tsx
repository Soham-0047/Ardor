import { api } from '../lib/api';
import type { Domain, Trends } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { formatTime, passionColor, scoreLabel, sentimentMeta } from '../lib/format';
import { EmptyState, ErrorNote, SectionHeader, Spinner } from './ui';

const CHART_PX = 104; // max bar height in px (chart track is h-28 = 112px)

/**
 * Compact, value-labeled analytics for the current domain filter:
 * passion over time, sentiment mix, and the hottest teams. Every color here
 * encodes data (passion via passionColor, mood via sentimentMeta) — nothing
 * is purely decorative.
 */
export default function TrendsPanel({ domain }: { domain?: Domain }) {
  const { data, loading, error } = useAsync(() => api.trends(domain), [domain]);

  return (
    <div className="ff-card p-5">
      <SectionHeader
        title="Passion trends"
        subtitle={domain ? 'Filtered to your selection' : 'Across every domain'}
      />

      {loading && <Spinner label="Crunching signals…" />}
      {error && !loading && <ErrorNote message={error} />}

      {!loading && !error && data && data.totals.count === 0 && (
        <EmptyState title="Nothing to chart yet" hint="Ingest some moments to see trends." />
      )}

      {!loading && !error && data && data.totals.count > 0 && (
        <div className="space-y-6">
          <TimelineChart timeline={data.timeline} />
          <SentimentMix sentiment={data.sentiment} />
          <TopTeams teams={data.topTeams} />
        </div>
      )}
    </div>
  );
}

function TimelineChart({ timeline }: { timeline: Trends['timeline'] }) {
  if (timeline.length === 0) return null;
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  return (
    <section>
      <div className="ff-label mb-2">Passion over time</div>
      <div className="flex gap-2">
        <div className="flex h-28 w-6 flex-col justify-between text-[10px] tabular-nums text-ink-faint">
          <span>100</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="flex h-28 items-end gap-1 overflow-x-auto pb-px"
            role="img"
            aria-label={`Average passion across ${timeline.length} time buckets`}
          >
            {timeline.map((t) => (
              <div
                key={t.bucket}
                title={`${formatTime(t.bucket)} · avg ${Math.round(t.avgScore)} · ${t.count} moment${
                  t.count === 1 ? '' : 's'
                }`}
                className="w-2.5 shrink-0 rounded-t transition-[height] duration-500"
                style={{
                  height: `${Math.max(2, Math.round((t.avgScore / 100) * CHART_PX))}px`,
                  backgroundColor: passionColor(t.avgScore),
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
            <span className="truncate">{formatTime(first.bucket)}</span>
            {timeline.length > 1 && <span className="truncate">{formatTime(last.bucket)}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function SentimentMix({ sentiment }: { sentiment: Trends['sentiment'] }) {
  if (sentiment.length === 0) return null;
  const rows = [...sentiment].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section>
      <div className="ff-label mb-2">Sentiment mix</div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const m = sentimentMeta(r.sentiment);
          return (
            <div key={r.sentiment} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 truncate font-medium" style={{ color: m.color }}>
                <span aria-hidden>{m.emoji}</span> {m.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: m.color }}
                />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums text-ink-muted">{r.count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopTeams({ teams }: { teams: Trends['topTeams'] }) {
  if (teams.length === 0) return null;
  const rows = teams.slice(0, 5);

  return (
    <section>
      <div className="ff-label mb-2 flex items-center justify-between">
        <span>Top teams</span>
        <span className="font-normal normal-case text-ink-faint" title="Sum of passion across moments">
          total passion
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((t) => {
          const color = passionColor(t.avgScore);
          return (
            <div key={t.team} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 truncate font-medium text-fg" title={t.team}>
                {t.team}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, Math.min(100, t.avgScore))}%`, backgroundColor: color }}
                  title={`avg passion ${Math.round(t.avgScore)} · ${scoreLabel(t.avgScore)}`}
                />
              </div>
              <span className="w-7 shrink-0 text-right font-semibold tabular-nums" style={{ color }}>
                {Math.round(t.avgScore)}
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-ink-faint">
                {t.totalPassion}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

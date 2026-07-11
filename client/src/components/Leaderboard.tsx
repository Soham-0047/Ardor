import { useApp } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { api } from '../lib/api';
import { EmptyState, ErrorNote, SectionHeader, Spinner } from './ui';

function rankMarker(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

/** Ranked table of the most passionate fans, keyed on Passion Points. */
export default function Leaderboard() {
  const { user } = useApp();
  const { data, loading, error } = useAsync(api.leaderboard, []);
  const rows = data?.leaderboard ?? [];

  return (
    <section className="ff-card p-5 animate-rise">
      <SectionHeader title="Most passionate fans" subtitle="Ranked by Passion Points" />

      {loading && <Spinner label="Loading leaderboard…" />}
      {!loading && error && <ErrorNote message={error} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title="No fans yet" hint="Be the first to join the arena." />
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => {
            const mine = !!user && user._id === row.id;
            return (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  mine ? 'border-ember/60 bg-ember/10' : 'border-ink-border bg-ink-800/40'
                }`}
              >
                <span className="w-7 shrink-0 text-center font-display font-bold text-ink-muted">
                  {rankMarker(row.rank)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-strong">
                    {row.displayName}
                    {mine && (
                      <span className="ml-2 text-xs font-medium text-ember-soft">you</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-faint">
                    <span>🔥 {row.streak} streak</span>
                    <span>🗳️ {row.votesCast} votes</span>
                    <span>
                      🏅 {row.badges} {row.badges === 1 ? 'badge' : 'badges'}
                    </span>
                  </div>
                </div>
                <span className="ff-pill shrink-0 bg-ember/20 text-ember-soft">
                  {row.passionPoints} PP
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import type { Matchup, Tournament } from '../lib/types';
import { useApp } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { api } from '../lib/api';
import { EmptyState, ErrorNote, SectionHeader, Spinner } from './ui';

type Note = { kind: 'badge' | 'info' | 'error'; text: string };

function applyMatchup(t: Tournament, updated: Matchup): Tournament {
  return {
    ...t,
    rounds: t.rounds.map((round) => ({
      ...round,
      matchups: round.matchups.map((m) => (m.id === updated.id ? updated : m)),
    })),
  };
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 50;
}

/**
 * Fan-vs-fan voting bracket. Tallies update optimistically from the vote
 * response, and earned badges surface inline next to the matchup.
 */
export default function TournamentBracket() {
  const { user, setUser } = useApp();
  const { data, loading, error } = useAsync(api.tournament, []);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (data?.tournament) setTournament(data.tournament);
  }, [data]);

  async function vote(m: Matchup, choice: 'a' | 'b') {
    if (!user) return;
    const key = `${m.id}:${choice}`;
    setPending(key);
    setNotes((n) => {
      const next = { ...n };
      delete next[m.id];
      return next;
    });
    try {
      const res = await api.vote(user._id, m.id, choice);
      setTournament((prev) => (prev ? applyMatchup(prev, res.matchup) : prev));
      setUser(res.user);
      const badge = res.newBadge;
      if (badge) {
        setNotes((n) => ({
          ...n,
          [m.id]: { kind: 'badge', text: `🏅 Earned: ${badge.label}` },
        }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Vote failed.';
      const already = /409|already/i.test(msg);
      setNotes((n) => ({
        ...n,
        [m.id]: already
          ? { kind: 'info', text: 'You already voted in this matchup.' }
          : { kind: 'error', text: msg },
      }));
    } finally {
      setPending(null);
    }
  }

  const rounds = tournament?.rounds ?? [];
  const hasMatchups = rounds.some((r) => r.matchups.length > 0);

  return (
    <section className="ff-card p-5 animate-rise">
      <SectionHeader
        title={tournament?.name ?? 'Hype-Off Bracket'}
        subtitle="Back your side — every vote is Passion Points"
      />

      {loading && <Spinner label="Loading bracket…" />}
      {!loading && error && <ErrorNote message={error} />}
      {!loading && !error && !hasMatchups && (
        <EmptyState title="No matchups yet" hint="Check back once the bracket goes live." />
      )}

      {!loading && !error && hasMatchups && (
        <>
          {!user && (
            <div className="mb-4 rounded-xl border border-ember/30 bg-ember/10 px-3 py-2 text-sm text-ember-soft">
              👆 Join the arena above to vote in the bracket.
            </div>
          )}

          <div className="space-y-6">
            {rounds.map((round) => (
              <div key={round.name}>
                <h3 className="ff-label mb-2">{round.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {round.matchups.map((m) => {
                    const total = m.aVotes + m.bVotes;
                    const note = notes[m.id];
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-ink-border bg-ink-800/40 p-3"
                      >
                        <div className="space-y-3">
                          <Side
                            label={m.aLabel}
                            votes={m.aVotes}
                            share={pct(m.aVotes, total)}
                            barClass="bg-ember"
                            clipUrl={m.aClipUrl}
                            winner={m.winner === 'a'}
                            disabled={!user || pending !== null}
                            disabledReason={!user ? 'Join the arena to vote' : undefined}
                            loading={pending === `${m.id}:a`}
                            onVote={() => vote(m, 'a')}
                          />
                          <div className="text-center text-xs font-bold uppercase tracking-widest text-ink-faint">
                            vs
                          </div>
                          <Side
                            label={m.bLabel}
                            votes={m.bVotes}
                            share={pct(m.bVotes, total)}
                            barClass="bg-cool"
                            clipUrl={m.bClipUrl}
                            winner={m.winner === 'b'}
                            disabled={!user || pending !== null}
                            disabledReason={!user ? 'Join the arena to vote' : undefined}
                            loading={pending === `${m.id}:b`}
                            onVote={() => vote(m, 'b')}
                          />
                        </div>
                        {note && (
                          <div
                            className={`mt-2 text-xs ${
                              note.kind === 'badge'
                                ? 'text-gold'
                                : note.kind === 'error'
                                  ? 'text-danger'
                                  : 'text-ink-muted'
                            }`}
                          >
                            {note.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Side({
  label,
  votes,
  share,
  barClass,
  clipUrl,
  winner,
  disabled,
  disabledReason,
  loading,
  onVote,
}: {
  label: string;
  votes: number;
  share: number;
  barClass: string;
  clipUrl?: string | null;
  winner: boolean;
  disabled: boolean;
  disabledReason?: string;
  loading: boolean;
  onVote: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-semibold text-strong">
          {label}
          {winner && <span className="ml-1.5 text-xs text-mint">✓ winner</span>}
        </span>
        <span className="shrink-0 text-xs text-ink-muted">
          {votes} · {share}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full ${barClass} transition-all duration-500`}
          style={{ width: `${share}%` }}
        />
      </div>
      {clipUrl && <audio controls src={clipUrl} className="mt-2 h-8 w-full max-w-[240px]" />}
      <button
        type="button"
        className="ff-btn-ghost mt-2 w-full px-3 py-1.5 text-xs"
        disabled={disabled}
        title={disabledReason}
        onClick={onVote}
      >
        {loading ? 'Voting…' : `Vote ${label}`}
      </button>
    </div>
  );
}

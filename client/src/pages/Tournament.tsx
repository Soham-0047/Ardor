import { useState } from 'react';
import { useApp } from '../lib/store';
import { api } from '../lib/api';
import FanJoin from '../components/FanJoin';
import Leaderboard from '../components/Leaderboard';
import TournamentBracket from '../components/TournamentBracket';
import { ErrorNote } from '../components/ui';
import { TrophyArt } from '../components/SportsArt';

function shortMint(mint: string): string {
  if (!mint) return '—';
  return mint.length > 12 ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : mint;
}

function StatBlock({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-800/40 p-3">
      <div className="ff-label">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tracking-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export default function TournamentPage() {
  const { user, setUser } = useApp();
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  async function mintBadge() {
    if (!user) return;
    setMinting(true);
    setMintError(null);
    try {
      const res = await api.mintBadge(user._id, 'Passion Points', 'Manual demo mint');
      setUser(res.user);
    } catch (e) {
      setMintError(e instanceof Error ? e.message : 'Mint failed.');
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="animate-rise relative flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-strong sm:text-4xl">
            The <span className="gradient-text">Hype-Off</span> Arena
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
            Fan-vs-fan voting on the moments that made you scream. Every vote is
            tournament-linked and stacks <span className="font-semibold text-ember-soft">Passion
            Points</span> — keep a daily streak alive to multiply them and mint badges for the loudest fans.
          </p>
        </div>
        <TrophyArt size={88} className="hidden shrink-0 sm:block" />
      </header>

      {/* Join / identity */}
      <FanJoin />

      {/* Fan card */}
      {user && (
        <section className="ff-card p-5 animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-strong">Your fan card</h2>
            <button
              type="button"
              className="ff-btn-ghost px-3 py-1.5 text-xs"
              onClick={mintBadge}
              disabled={minting}
            >
              {minting ? 'Minting…' : '🏅 Mint a Passion Points badge'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatBlock label="Passion Pts" value={user.passionPoints} color="rgb(var(--c-ember))" />
            <StatBlock label="Streak" value={`${user.streak}🔥`} color="rgb(var(--c-gold))" />
            <StatBlock label="Votes cast" value={user.votesCast} color="rgb(var(--c-cool))" />
          </div>

          {mintError && (
            <div className="mt-3">
              <ErrorNote message={mintError} />
            </div>
          )}

          <div className="mt-4">
            <div className="ff-label mb-2">Badges</div>
            {user.badges.length === 0 ? (
              <p className="text-sm text-ink-muted">No badges yet — vote to earn your first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.badges.map((b) => (
                  <div
                    key={b.mint}
                    className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gold">🏅 {b.label}</span>
                      {b.simulated && <span className="ff-chip">simulated</span>}
                    </div>
                    <div className="mt-0.5 text-ink-muted">{b.reason}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-ink-faint">
                      <span>{shortMint(b.mint)}</span>
                      {b.explorerUrl && (
                        <a
                          href={b.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cool hover:underline"
                        >
                          explorer ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bracket + leaderboard */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TournamentBracket />
        </div>
        <div className="lg:col-span-2">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}

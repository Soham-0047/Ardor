import { useState, type FormEvent } from 'react';
import { useApp } from '../lib/store';
import { ErrorNote } from './ui';

/**
 * Fan onboarding form for the Hype-Off arena. When a fan is already in the
 * arena it collapses to a compact "playing as" strip with a log-out control.
 */
export default function FanJoin({ compact = false }: { compact?: boolean }) {
  const { user, flags, joinFan, logout } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError('Pick a display name to enter the arena.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const w = flags.solana ? wallet.trim() : '';
      await joinFan(name, w ? w : undefined);
      setDisplayName('');
      setWallet('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the arena.');
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className="ff-card flex flex-wrap items-center gap-3 p-4 animate-rise">
        <span className="text-xl" aria-hidden>
          🎟️
        </span>
        <div className="min-w-0">
          <div className="ff-label">In the arena</div>
          <div className="truncate font-display text-base font-semibold text-strong">
            Playing as {user.displayName}
          </div>
        </div>
        <button
          type="button"
          className="ff-btn-ghost ml-auto px-3 py-1.5 text-xs"
          onClick={logout}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`ff-card animate-rise ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          🔥
        </span>
        <h3 className="font-display text-lg font-bold text-strong">Join the Hype-Off</h3>
      </div>
      {!compact && (
        <p className="mt-1 text-sm text-ink-muted">
          Pick a fan name, vote through the bracket, and stack Passion Points.
        </p>
      )}

      <div className={`mt-4 ${flags.solana ? 'grid gap-3 sm:grid-cols-2' : ''}`}>
        <div>
          <label className="ff-label" htmlFor="ff-join-name">
            Display name
          </label>
          <input
            id="ff-join-name"
            className="ff-input mt-1"
            placeholder="e.g. TouchlineTitan"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            autoComplete="off"
          />
        </div>
        {flags.solana && (
          <div>
            <label className="ff-label" htmlFor="ff-join-wallet">
              Wallet <span className="normal-case text-ink-faint">(optional)</span>
            </label>
            <input
              id="ff-join-wallet"
              className="ff-input mt-1"
              placeholder="Solana address"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {flags.solana && (
        <p className="mt-2 text-xs text-ink-faint">
          🏅 Earned badges mint as NFTs on Solana devnet — add a wallet to receive them.
        </p>
      )}

      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}

      <button type="submit" className="ff-btn-primary mt-4 w-full" disabled={submitting}>
        {submitting ? 'Joining…' : 'Enter the arena'}
      </button>
    </form>
  );
}

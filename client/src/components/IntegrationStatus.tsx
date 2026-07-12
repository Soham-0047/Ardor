import { useApp } from '../lib/store';
import { alpha } from '../lib/format';
import { Pill, SectionHeader } from './ui';

const LIVE = 'rgb(var(--c-mint))'; // mint
const FALLBACK = 'rgb(var(--c-gold))'; // gold

interface Capability {
  emoji: string;
  label: string;
  live: boolean;
  note: string;
}

/**
 * The honesty panel: shows exactly which sponsor integrations are wired live
 * vs. running on a graceful local fallback. Green = live, amber = fallback.
 */
export default function IntegrationStatus() {
  const { flags } = useApp();

  const rows: Capability[] = [
    {
      emoji: '🧠',
      label: 'AI passion scoring',
      live: flags.ai,
      note: flags.ai ? 'Live structured extraction (admin-service router)' : 'Deterministic heuristic fallback',
    },
    {
      emoji: '📊',
      label: 'Passion warehouse',
      live: true,
      note: 'Warehouse-scale fan analytics (MongoDB aggregation)',
    },
    {
      emoji: '🔊',
      label: 'ElevenLabs narration',
      live: flags.elevenlabs,
      note: flags.elevenlabs ? 'Live hype narration' : 'Off (add ELEVENLABS_API_KEY)',
    },
    {
      emoji: '◎',
      label: 'Solana badges',
      live: flags.solana,
      note: flags.solana ? 'Devnet minting' : 'Simulated (add SOLANA_MINT_SECRET)',
    },
    {
      emoji: '🍃',
      label: 'MongoDB',
      live: !flags.memoryDb,
      note: flags.memoryDb ? 'In-memory (auto)' : 'Persistent',
    },
    {
      emoji: '⚽',
      label: 'football-data.org',
      live: flags.footballData,
      note: flags.footballData ? 'Live feed' : 'Seeded dataset',
    },
  ];

  return (
    <div className="ff-card p-5">
      <SectionHeader title="Under the hood" subtitle="Sponsor tech, honestly wired" />

      <ul>
        {rows.map((r) => {
          const color = r.live ? LIVE : FALLBACK;
          return (
            <li
              key={r.label}
              className="flex items-center gap-3 border-b border-ink-border/60 py-2.5 last:border-0"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.live ? 'animate-pulse-glow' : ''}`}
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${alpha(color, 60)}` }}
                aria-hidden
              />
              <span className="text-sm" aria-hidden>
                {r.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg">{r.label}</div>
                <div className="truncate text-xs text-ink-muted">{r.note}</div>
              </div>
              <Pill color={color}>{r.live ? 'Live' : 'Fallback'}</Pill>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-snug text-ink-faint">
        Green = live integration. Amber = graceful fallback, so the demo never breaks.
      </p>
    </div>
  );
}

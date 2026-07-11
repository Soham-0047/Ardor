import { useState } from 'react';
import type { ScoredEvent } from '../lib/types';
import { domainMeta, modelLabel, prettyType, timeAgo } from '../lib/format';
import { useFlags } from '../lib/store';
import { api } from '../lib/api';
import ScoreGauge from './ScoreGauge';
import { DomainPill, KeyMomentBadge, SentimentPill } from './ui';

export default function EventCard({ event, compact = false }: { event: ScoredEvent; compact?: boolean }) {
  const flags = useFlags();
  const [audioUrl, setAudioUrl] = useState<string | null>(event.audioUrl ?? null);
  const [narrating, setNarrating] = useState(false);
  const [narrateMsg, setNarrateMsg] = useState<string | null>(null);

  const dm = domainMeta(event.domain);

  async function narrate() {
    setNarrating(true);
    setNarrateMsg(null);
    try {
      const res = await api.narrate(event.id);
      if (res.audioUrl) setAudioUrl(res.audioUrl);
      else setNarrateMsg('Narration is off (enable ElevenLabs).');
    } catch (e) {
      setNarrateMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setNarrating(false);
    }
  }

  return (
    <article
      className="ff-card animate-rise p-4 transition hover:border-ember/40"
      style={{ borderLeft: `3px solid ${dm.color}` }}
    >
      <div className="flex gap-4">
        <ScoreGauge score={event.score.passion_score} size={compact ? 56 : 68} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
            <DomainPill domain={event.domain} />
            <span className="ff-chip">{prettyType(event.type)}</span>
            {event.competition && <span className="truncate">{event.competition}</span>}
            <span className="ml-auto whitespace-nowrap">{timeAgo(event.occurredAt)}</span>
          </div>

          <h3 className="mt-2 font-display text-base font-semibold text-strong text-balance">
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{event.score.one_line_recap}</p>

          {(event.teams.length > 0 || event.players.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.teams.map((t) => (
                <span key={t} className="ff-chip">
                  {t}
                </span>
              ))}
              {event.players.map((p) => (
                <span key={p} className="ff-chip text-cool">
                  {p}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SentimentPill sentiment={event.score.sentiment} />
            {event.score.key_moment && <KeyMomentBadge />}
            <span className="ff-chip" title="Which scorer produced this reading">
              {modelLabel(event.score.model)}
            </span>

            {flags.elevenlabs &&
              (audioUrl ? (
                <audio controls src={audioUrl} className="ml-auto h-8 max-w-[220px]" />
              ) : (
                <button className="ff-btn-ghost ml-auto px-3 py-1 text-xs" onClick={narrate} disabled={narrating}>
                  {narrating ? 'Generating…' : '🔊 Hype narration'}
                </button>
              ))}
          </div>
          {narrateMsg && <p className="mt-1 text-xs text-ink-faint">{narrateMsg}</p>}
        </div>
      </div>
    </article>
  );
}

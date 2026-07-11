import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { ScoredEvent } from '../lib/types';
import EventCard from './EventCard';
import ScoreGauge from './ScoreGauge';
import { EmptyState, ErrorNote, SectionHeader, Spinner } from './ui';

/**
 * The rivalry arena. Pit two sides against each other with a headline and the
 * story — the engine scores the heat and drops it into the ranked feed.
 */
export default function RivalryForm() {
  const { data, loading, error, reload } = useAsync(
    () => api.events({ domain: 'rivalry', sort: 'score', limit: 20 }),
    [],
  );

  const [items, setItems] = useState<ScoredEvent[]>([]);
  useEffect(() => {
    if (data) setItems(data.events);
  }, [data]);

  const [sideA, setSideA] = useState('');
  const [sideB, setSideB] = useState('');
  const [headline, setHeadline] = useState('');
  const [detail, setDetail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [latest, setLatest] = useState<ScoredEvent | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const canSubmit =
    sideA.trim().length > 0 &&
    sideB.trim().length > 0 &&
    headline.trim().length > 0 &&
    detail.trim().length > 0 &&
    !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sideA.trim() || !sideB.trim() || !headline.trim() || !detail.trim()) {
      setFormError('Name both sides, add a headline, and tell the story.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { event } = await api.submitAction('rivalry', {
        sideA: sideA.trim(),
        sideB: sideB.trim(),
        headline: headline.trim(),
        detail: detail.trim(),
      });
      setItems((prev) => [event, ...prev.filter((x) => x.id !== event.id)]);
      setLatest(event);
      setHighlightId(event.id);
      setHeadline('');
      setDetail('');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setHighlightId(null), 4500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not post that — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="ff-card animate-rise space-y-4 p-5">
        <SectionHeader
          title="Start a rivalry"
          subtitle="Two sides, one headline — the engine scores the heat instantly."
        />

        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div>
            <label htmlFor="r-sideA" className="ff-label">
              Side A
            </label>
            <input
              id="r-sideA"
              className="ff-input mt-1.5"
              placeholder="Team Red"
              value={sideA}
              onChange={(e) => setSideA(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="pb-2.5 text-center font-display text-sm font-bold text-hot">VS</div>
          <div>
            <label htmlFor="r-sideB" className="ff-label">
              Side B
            </label>
            <input
              id="r-sideB"
              className="ff-input mt-1.5"
              placeholder="Team Blue"
              value={sideB}
              onChange={(e) => setSideB(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>

        <div>
          <label htmlFor="r-headline" className="ff-label">
            Headline
          </label>
          <input
            id="r-headline"
            className="ff-input mt-1.5"
            placeholder="The derby that decides the title"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={140}
          />
        </div>

        <div>
          <label htmlFor="r-detail" className="ff-label">
            The story
          </label>
          <textarea
            id="r-detail"
            className="ff-input mt-1.5 min-h-[96px] resize-y"
            placeholder="Set the stakes, the bad blood, the history — give the engine something to feel."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
          />
        </div>

        {formError && <ErrorNote message={formError} />}

        <button type="submit" className="ff-btn-primary" disabled={!canSubmit}>
          {submitting ? 'Scoring…' : '⚔️ Ignite the rivalry'}
        </button>
      </form>

      {latest && highlightId === latest.id && (
        <div className="ff-card animate-rise flex items-center gap-4 border-hot/40 bg-hot/5 p-4">
          <ScoreGauge score={latest.score.passion_score} size={64} showLabel />
          <div className="min-w-0">
            <div className="ff-label text-hot">Engine just scored this clash</div>
            <p className="mt-1 truncate font-display font-semibold text-strong">{latest.title}</p>
            <p className="text-sm text-ink-muted">{latest.score.one_line_recap}</p>
          </div>
        </div>
      )}

      <div>
        <SectionHeader
          title="Hottest rivalries"
          subtitle="Ranked by passion score"
          right={
            <button type="button" className="ff-btn-ghost px-3 py-1.5 text-xs" onClick={reload}>
              ↻ Refresh
            </button>
          }
        />

        {loading && items.length === 0 ? (
          <div className="ff-card p-6">
            <Spinner label="Loading rivalries…" />
          </div>
        ) : error ? (
          <ErrorNote message={error} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No rivalries yet"
            hint="Ignite the first clash above — any two sides, any passion."
          />
        ) : (
          <div className="space-y-3">
            {items.map((e) => (
              <div
                key={e.id}
                className={
                  e.id === highlightId
                    ? 'rounded-2xl ring-2 ring-hot ring-offset-2 ring-offset-ink-900 transition'
                    : 'transition'
                }
              >
                <EventCard event={e} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

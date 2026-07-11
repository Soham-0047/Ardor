import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import type { ScoredEvent } from '../lib/types';
import EventCard from './EventCard';
import ScoreGauge from './ScoreGauge';
import { EmptyState, ErrorNote, SectionHeader, Spinner } from './ui';

type EntryType = 'journal' | 'milestone';

/**
 * The off-season personal passion tracker. Log a journal entry or a milestone
 * and watch the same scoring engine read it and react in real time.
 */
export default function PersonalTracker() {
  const { user } = useApp();
  const { data, loading, error, reload } = useAsync(
    () => api.events({ domain: 'personal', sort: 'recent', limit: 30 }),
    [],
  );

  const [items, setItems] = useState<ScoredEvent[]>([]);
  useEffect(() => {
    if (data) setItems(data.events);
  }, [data]);

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('journal');
  const [project, setProject] = useState('');

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

  const canSubmit = title.trim().length > 0 && detail.trim().length > 0 && !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !detail.trim()) {
      setFormError('Give it a title and a few words — the engine needs something to read.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { event } = await api.submitAction('personal', {
        title: title.trim(),
        detail: detail.trim(),
        type: entryType,
        project: project.trim() || undefined,
        author: user?.displayName,
      });
      setItems((prev) => [event, ...prev.filter((x) => x.id !== event.id)]);
      setLatest(event);
      setHighlightId(event.id);
      setTitle('');
      setDetail('');
      setProject('');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setHighlightId(null), 4500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not log that — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="ff-card animate-rise space-y-4 p-5">
        <SectionHeader
          title="Log a passion entry"
          subtitle="Journals and milestones — scored 0–100 the instant you post."
        />

        <div>
          <label htmlFor="p-title" className="ff-label">
            Title
          </label>
          <input
            id="p-title"
            className="ff-input mt-1.5"
            placeholder="Hit a new marathon PR"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-type" className="ff-label">
              Type
            </label>
            <select
              id="p-type"
              className="ff-input mt-1.5"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as EntryType)}
            >
              <option value="journal">📓 Journal</option>
              <option value="milestone">🏁 Milestone</option>
            </select>
          </div>
          <div>
            <label htmlFor="p-project" className="ff-label">
              Project <span className="normal-case text-ink-faint">(optional)</span>
            </label>
            <input
              id="p-project"
              className="ff-input mt-1.5"
              placeholder="Sub-4 project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              maxLength={80}
            />
          </div>
        </div>

        <div>
          <label htmlFor="p-detail" className="ff-label">
            What happened?
          </label>
          <textarea
            id="p-detail"
            className="ff-input mt-1.5 min-h-[96px] resize-y"
            placeholder="Pour the passion in — the more you write, the more the engine has to read."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
          />
        </div>

        {formError && <ErrorNote message={formError} />}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="ff-btn-primary" disabled={!canSubmit}>
            {submitting ? 'Scoring…' : '🔥 Score my entry'}
          </button>
          <span className="text-xs text-ink-faint">
            {user ? `Posting as ${user.displayName}` : 'Posting anonymously'}
          </span>
        </div>
      </form>

      {latest && highlightId === latest.id && (
        <div className="ff-card animate-rise flex items-center gap-4 border-ember/40 bg-ember/5 p-4">
          <ScoreGauge score={latest.score.passion_score} size={64} showLabel />
          <div className="min-w-0">
            <div className="ff-label text-ember-soft">Engine just scored your entry</div>
            <p className="mt-1 truncate font-display font-semibold text-strong">{latest.title}</p>
            <p className="text-sm text-ink-muted">{latest.score.one_line_recap}</p>
          </div>
        </div>
      )}

      <div>
        <SectionHeader
          title="Your passion timeline"
          subtitle="Most recent first"
          right={
            <button type="button" className="ff-btn-ghost px-3 py-1.5 text-xs" onClick={reload}>
              ↻ Refresh
            </button>
          }
        />

        {loading && items.length === 0 ? (
          <div className="ff-card p-6">
            <Spinner label="Loading your timeline…" />
          </div>
        ) : error ? (
          <ErrorNote message={error} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No entries yet"
            hint="Log your first journal or milestone above and watch it get scored."
          />
        ) : (
          <ol className="relative space-y-3 border-l-2 border-ink-border/60 pl-4 sm:pl-6">
            {items.map((e) => (
              <li
                key={e.id}
                className={
                  e.id === highlightId
                    ? 'rounded-2xl ring-2 ring-ember ring-offset-2 ring-offset-ink-900 transition'
                    : 'transition'
                }
              >
                <EventCard event={e} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

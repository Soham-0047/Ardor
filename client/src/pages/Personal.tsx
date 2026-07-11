import { useState } from 'react';
import PersonalTracker from '../components/PersonalTracker';
import RivalryForm from '../components/RivalryForm';

type Tab = 'personal' | 'rivalry';

const TABS: { id: Tab; label: string; emoji: string; blurb: string }[] = [
  { id: 'personal', label: 'Personal passion', emoji: '🔥', blurb: 'Journals & milestones' },
  { id: 'rivalry', label: 'Rivalry arena', emoji: '⚔️', blurb: 'Two sides, one headline' },
];

/**
 * Showcase for the user-driven plugins: the same passion engine that reads
 * World Cup moments also scores personal projects and made-up rivalries.
 */
export default function PersonalPage() {
  const [tab, setTab] = useState<Tab>('personal');

  return (
    <div className="space-y-8">
      <section className="ff-card animate-rise relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ember/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <span className="ff-chip">🧩 User-driven plugins</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-strong sm:text-4xl">
            Passion, <span className="gradient-text">beyond the pitch</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-ink-muted sm:text-base">
            FanForge is not a single-sport toy. The exact engine that grades World Cup moments
            0–100 also reads your off-season projects and the rivalries you dream up — any passion,
            any angle. Post something below and watch it get scored the instant you hit submit.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={active ? 'ff-btn-primary' : 'ff-btn-ghost'}
              aria-pressed={active}
            >
              <span aria-hidden>{t.emoji}</span>
              <span>{t.label}</span>
              <span className={`hidden text-xs font-normal sm:inline ${active ? 'text-on-accent/80' : 'text-ink-faint'}`}>
                · {t.blurb}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'personal' ? <PersonalTracker /> : <RivalryForm />}
    </div>
  );
}

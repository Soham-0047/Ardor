import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { gsap, prefersReducedMotion } from '../lib/motion';
import type { PluginInfo, ScoredEvent } from '../lib/types';
import { alpha, domainMeta, passionColor, prettyType, scoreLabel } from '../lib/format';
import AnimatedNumber from '../components/AnimatedNumber';
import ScoreGauge from '../components/ScoreGauge';
import ThemeToggle from '../components/ThemeToggle';
import { DomainPill, SentimentPill } from '../components/ui';
import { PitchLines, SoccerBall, TrophyArt } from '../components/SportsArt';

/* ────────────────────────────────────────────────────────────────
   Static fallbacks so the landing page renders beautifully even when
   the API isn't running (e.g. client-only preview). When the API is
   up, real scored moments and plugin data replace these.
   ──────────────────────────────────────────────────────────────── */

interface MomentLite {
  id: string;
  title: string;
  recap: string;
  score: number;
  sentiment: string;
  teams: string[];
  domain: string;
  type: string;
}

const FALLBACK_MOMENTS: MomentLite[] = [
  {
    id: 'fb-1',
    title: "Endrick's last-gasp winner!",
    recap: 'From 2–0 down to 3–2 in stoppage time — Brazil complete an impossible comeback.',
    score: 100,
    sentiment: 'ecstatic',
    teams: ['Brazil', 'France'],
    domain: 'worldcup',
    type: 'goal',
  },
  {
    id: 'fb-2',
    title: 'ter Stegen forces a shootout',
    recap: 'A save for the ages in the 120th minute drags Spain vs Germany to penalties.',
    score: 95,
    sentiment: 'tense',
    teams: ['Spain', 'Germany'],
    domain: 'worldcup',
    type: 'great_save',
  },
  {
    id: 'fb-3',
    title: 'Day 2: first end-to-end demo working',
    recap: 'The whole pipeline runs end to end for the first time. This is why I build.',
    score: 72,
    sentiment: 'positive',
    teams: [],
    domain: 'personal',
    type: 'milestone',
  },
];

const FALLBACK_PLUGINS: PluginInfo[] = [
  {
    id: 'worldcup',
    domain: 'worldcup',
    displayName: 'FIFA World Cup 2026',
    description: 'Live match moments scored for raw fan passion and drama.',
    emoji: '⚽',
    acceptsUserActions: false,
  },
  {
    id: 'rivalry',
    domain: 'rivalry',
    displayName: 'Rivalries',
    description: 'Scores the heat of any two-sided rivalry — frameworks, editors, GOAT debates.',
    emoji: '⚔️',
    acceptsUserActions: true,
  },
  {
    id: 'personal',
    domain: 'personal',
    displayName: 'Personal Passion',
    description: 'Off-season mode: tracks the emotional arc of any long-running personal project.',
    emoji: '🔥',
    acceptsUserActions: true,
  },
];

function toLite(e: ScoredEvent): MomentLite {
  return {
    id: e.id,
    title: e.title,
    recap: e.score.one_line_recap,
    score: e.score.passion_score,
    sentiment: e.score.sentiment,
    teams: e.teams,
    domain: e.domain,
    type: e.type,
  };
}

/* ──────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: '01',
    title: 'Ingest',
    text: 'Plugins pull match events, rivalry flashpoints, and journal entries — live feeds with seeded fallbacks.',
    emoji: '📡',
  },
  {
    n: '02',
    title: 'Route',
    text: 'The plugin router tags every event with its passion domain and normalizes it into one schema.',
    emoji: '🔀',
  },
  {
    n: '03',
    title: 'Score',
    text: 'Gemini structured extraction turns raw fan noise into a 0–100 passion score, sentiment, and recap.',
    emoji: '🧠',
  },
  {
    n: '04',
    title: 'Fan out',
    text: 'Every scored moment lands in MongoDB, gets indexed for instant search, and can trigger narration or badges.',
    emoji: '📤',
  },
  {
    n: '05',
    title: 'Surface',
    text: 'A live dashboard: scored feed, search, trends, a fan-vs-fan arena, and a personal passion tracker.',
    emoji: '📊',
  },
];

const FEATURES = [
  {
    emoji: '⚡',
    title: 'Live passion feed',
    text: 'Every moment scored 0–100 with sentiment and a one-line recap, streaming into a filterable feed.',
    to: '/app',
  },
  {
    emoji: '🔎',
    title: 'Instant fan search',
    text: 'Search "comeback", "red card", or any player and jump straight to the moment — passion-ranked full-text.',
    to: '/app/explore',
  },
  {
    emoji: '❄️',
    title: 'Passion warehouse',
    text: 'Every scored moment streams into Snowflake — passion over time, sentiment mix, and the hottest teams at warehouse scale.',
    to: '/app',
  },
  {
    emoji: '🏟️',
    title: 'Hype-Off arena',
    text: 'Fan-vs-fan bracket voting. Every vote earns Passion Points; streaks and thresholds mint badges.',
    to: '/app/tournament',
  },
  {
    emoji: '📓',
    title: 'Personal tracker',
    text: 'Off-season mode: journal your own project streak and watch the same engine score your passion.',
    to: '/app/personal',
  },
  {
    emoji: '🏅',
    title: 'Proof-of-fandom badges',
    text: 'Engagement thresholds mint verifiable "Passion Points" tokens on Solana devnet (feature-flagged).',
    to: '/app/tournament',
  },
];

const PLUGIN_SNIPPET = `interface FanPlugin {
  id: string;                 // "worldcup"
  domain: Domain;             // routing tag
  voicePersona: string;       // narration style
  scoringPrompt: string;      // what "passion" means here
  fetchEvents(): Promise<RawEvent[]>;
  normalizeUserAction?(input): RawEvent;
}`;

const CORE_TECH = [
  { emoji: '🧠', name: 'Google AI (Gemini)', note: 'structured passion scoring' },
  { emoji: '❄️', name: 'Snowflake', note: 'fandom warehouse analytics' },
  { emoji: '🔊', name: 'ElevenLabs', note: 'spoken hype narration' },
  { emoji: '◎', name: 'Solana', note: 'proof-of-fandom badges' },
];

const FLAGGED_TECH = [
  { emoji: '🍃', name: 'MongoDB', note: 'primary store' },
  { emoji: '🚂', name: 'Express + Node.js', note: 'REST API' },
  { emoji: '⚛️', name: 'React + Vite', note: 'dashboard' },
  { emoji: '⚽', name: 'football-data.org', note: 'live feed · seeded fallback' },
];

const ANCHORS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#plugins', label: 'Plugins' },
  { href: '#tech', label: 'Tech' },
];

export default function Landing() {
  const trends = useAsync(() => api.trends(), []);
  const config = useAsync(() => api.config(), []);

  const live = Boolean(trends.data && trends.data.topMoments.length > 0);
  const moments: MomentLite[] = live
    ? trends.data!.topMoments.slice(0, 3).map(toLite)
    : FALLBACK_MOMENTS;
  const plugins = config.data?.plugins?.length ? config.data.plugins : FALLBACK_PLUGINS;
  const totals = trends.data?.totals;

  /* GSAP choreography — scoped to this page, reverted on unmount, and skipped
     entirely under prefers-reduced-motion (elements simply render in place). */
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // Hero entrance: copy column staggers up, moment stack slides in.
      gsap.from('.gs-hero', { y: 26, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.09 });
      gsap.from('.gs-moment', {
        x: 48,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.14,
        delay: 0.25,
      });
      // Then a gentle perpetual float on the stack.
      gsap.to('.gs-moment', {
        y: -6,
        duration: 2.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.4 },
        delay: 1.3,
      });
      // Everything below the fold reveals as it scrolls into view.
      gsap.utils.toArray<HTMLElement>('.gs-reveal').forEach((el, i) => {
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-full" ref={rootRef}>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-ink-border bg-ink-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <a href="#top" className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="font-display text-lg font-bold text-strong">
              Fan<span className="gradient-text">Forge</span>
            </span>
          </a>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {ANCHORS.map((a) => (
              <a key={a.href} href={a.href} className="ff-nav-link">
                {a.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link to="/app" className="ff-btn-primary px-4 py-2 text-xs sm:text-sm">
              Open the dashboard →
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-4">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
          {/* Self-sketching pitch behind the hero copy. */}
          <PitchLines className="pointer-events-none absolute -left-24 top-6 -z-10 h-[26rem] w-[42rem] opacity-40 [mask-image:radial-gradient(closest-side,black,transparent)]" />
          <div>
            <span className="gs-hero ff-chip">
              <span aria-hidden>✨</span> An open, pluggable passion-intelligence platform
            </span>
            <h1 className="gs-hero mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-strong text-balance sm:text-5xl lg:text-[3.4rem]">
              Passion is a signal.
              <br />
              <span className="gradient-text">FanForge scores it.</span>
            </h1>
            <p className="gs-hero mt-5 max-w-xl text-base text-ink-muted sm:text-lg">
              A passion-scoring engine that watches what people love, makes it searchable, tells
              the story out loud, and remembers it forever — starting with the 2026 FIFA World
              Cup, extensible to any fandom.
            </p>
            <div className="gs-hero mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app" className="ff-btn-primary px-6 py-3">
                Launch the dashboard
              </Link>
              <Link to="/app/tournament" className="ff-btn-ghost px-6 py-3">
                Enter the Hype-Off arena
              </Link>
            </div>
            <p className="gs-hero mt-4 text-xs text-ink-faint">
              Runs fully offline — zero API keys, zero database installs. Every integration
              degrades gracefully.
            </p>
          </div>

          {/* Live moment stack */}
          <div className="relative">
            <SoccerBall size={64} className="absolute -top-10 right-2 z-10 hidden sm:block" />
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2rem] opacity-60 blur-2xl"
              style={{
                background: `radial-gradient(24rem 16rem at 60% 20%, ${alpha('rgb(var(--c-hot))', 14)}, transparent 70%)`,
              }}
              aria-hidden
            />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="ff-label">
                  {live ? 'Live from the scoring engine' : 'Sample scored moments'}
                </span>
                <span className="ff-chip">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse-glow"
                    aria-hidden
                  />
                  passion scale 0–100
                </span>
              </div>
              {moments.map((m, i) => (
                <article
                  // Index keys are deliberate: when live data replaces the
                  // fallback, the DOM nodes are reused so the GSAP float
                  // tween keeps running on them.
                  key={i}
                  className="gs-moment ff-card flex gap-4 p-4"
                  style={{
                    borderLeft: `3px solid ${domainMeta(m.domain).color}`,
                    marginLeft: i * 10,
                  }}
                >
                  <ScoreGauge score={m.score} size={i === 0 ? 68 : 56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                      <DomainPill domain={m.domain} />
                      <span className="ff-chip">{prettyType(m.type)}</span>
                      <span
                        className="ml-auto font-semibold"
                        style={{ color: passionColor(m.score) }}
                      >
                        {scoreLabel(m.score)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 truncate font-display text-sm font-semibold text-strong">
                      {m.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{m.recap}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <SentimentPill sentiment={m.sentiment} />
                      {m.teams.slice(0, 2).map((t) => (
                        <span key={t} className="ff-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats strip ───────────────────────────────────── */}
        <section aria-label="Live platform stats" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Moments scored"
            value={totals ? totals.count : 66}
            suffix={totals ? '' : '+'}
            color="rgb(var(--c-cool))"
          />
          <Stat
            label="Avg passion"
            value={totals ? Math.round(totals.avgScore) : 68}
            color="rgb(var(--c-gold))"
          />
          <Stat
            label="Key moments"
            value={totals ? totals.keyMoments : 37}
            suffix={totals ? '' : '+'}
            color="rgb(var(--c-hot))"
          />
          <Stat label="Domains, one engine" value={plugins.length} color="rgb(var(--c-violet))" />
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section id="how" className="scroll-mt-24 py-16 sm:py-20">
          <SectionHeading
            kicker="The loop"
            title="From raw fandom to structured signal"
            subtitle="Five steps, end to end, with a graceful fallback at every stage."
          />
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="gs-reveal ff-card relative p-5">
                <span className="font-mono text-xs font-semibold text-ember">{s.n}</span>
                <div className="mt-2 text-2xl" aria-hidden>
                  {s.emoji}
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-strong">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section id="features" className="scroll-mt-24 pb-16 sm:pb-20">
          <SectionHeading
            kicker="What you get"
            title="Fandom, made measurable"
            subtitle="Every feature is a different lens on the same scored stream."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                to={f.to}
                className="gs-reveal ff-card group p-5 transition hover:border-ember/50"
              >
                <div className="text-2xl" aria-hidden>
                  {f.emoji}
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-strong">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.text}</p>
                <span className="mt-3 inline-block text-xs font-semibold text-ember opacity-0 transition group-hover:opacity-100">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Plugins ───────────────────────────────────────── */}
        <section id="plugins" className="scroll-mt-24 pb-16 sm:pb-20">
          <SectionHeading
            kicker="A platform, not an app"
            title="Any fandom is one plugin away"
            subtitle="World Cup is the flagship demo — the engine doesn't care what the passion is about."
          />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              {plugins.map((p) => {
                const dm = domainMeta(p.domain);
                return (
                  <div
                    key={p.id}
                    className="gs-reveal ff-card flex items-start gap-4 p-5"
                    style={{ borderLeft: `3px solid ${dm.color}` }}
                  >
                    <span className="text-3xl" aria-hidden>
                      {p.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-strong">
                          {p.displayName}
                        </h3>
                        {p.acceptsUserActions && <span className="ff-chip">user-driven</span>}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{p.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="gs-reveal ff-card p-5">
              <div className="ff-label">The whole contract</div>
              <p className="mt-2 text-sm text-ink-muted">
                Implement one interface, register it, and your domain is scored, stored,
                searchable, and surfaced — no core changes.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-ink-border bg-ink-800/70 p-4 font-mono text-xs leading-relaxed text-fg">
                <code>{PLUGIN_SNIPPET}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ── Tech ──────────────────────────────────────────── */}
        <section id="tech" className="scroll-mt-24 pb-16 sm:pb-20">
          <SectionHeading
            kicker="Under the hood"
            title="Four sponsor techs, honestly wired"
            subtitle="Gemini scores it, Snowflake remembers it, ElevenLabs speaks it, Solana proves it — each lights up when keys exist and degrades gracefully when they don't."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="gs-reveal ff-card p-5">
              <div className="ff-label mb-3">Prize-category tech</div>
              <div className="flex flex-wrap gap-2">
                {CORE_TECH.map((t) => (
                  <span key={t.name} className="ff-chip px-3 py-1.5 text-sm">
                    <span aria-hidden>{t.emoji}</span>
                    <span className="font-semibold text-fg">{t.name}</span>
                    <span className="text-ink-faint">· {t.note}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="gs-reveal ff-card p-5">
              <div className="ff-label mb-3">Platform core</div>
              <div className="flex flex-wrap gap-2">
                {FLAGGED_TECH.map((t) => (
                  <span key={t.name} className="ff-chip px-3 py-1.5 text-sm">
                    <span aria-hidden>{t.emoji}</span>
                    <span className="font-semibold text-fg">{t.name}</span>
                    <span className="text-ink-faint">· {t.note}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-faint">
                A broken optional integration can never take down the demo — flags off, fallbacks
                on.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA band ──────────────────────────────────────── */}
        <section className="pb-16 sm:pb-24">
          <div className="gs-reveal ff-card relative overflow-hidden p-8 text-center sm:p-12">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(40rem 14rem at 50% 0%, ${alpha('rgb(var(--c-ember))', 10)}, transparent 70%)`,
              }}
              aria-hidden
            />
            <TrophyArt size={96} className="relative mx-auto -mt-2 mb-2 w-fit" />
            <h2 className="relative font-display text-2xl font-bold text-strong text-balance sm:text-3xl">
              Your fandom deserves a scoreboard.
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-ink-muted">
              Open the dashboard, watch the World Cup get scored in real time, then log your own
              passion project and see the engine react.
            </p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/app" className="ff-btn-primary px-6 py-3">
                Launch the dashboard
              </Link>
              <Link to="/app/explore" className="ff-btn-ghost px-6 py-3">
                Search the moments
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-ink-faint">
          <span>🔥 FanForge · a pluggable passion-intelligence platform</span>
          <span>Gemini + Snowflake + ElevenLabs + Solana · built for the DEV Weekend Challenge</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Small local pieces ─────────────────────────────────────── */

function Stat({
  label,
  value,
  suffix = '',
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="gs-reveal ff-card p-4 text-center">
      <div className="font-display text-3xl font-bold tracking-tight" style={{ color }}>
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="gs-reveal max-w-2xl">
      <span className="ff-label text-ember">{kicker}</span>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-strong text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-ink-muted sm:text-base">{subtitle}</p>
    </div>
  );
}

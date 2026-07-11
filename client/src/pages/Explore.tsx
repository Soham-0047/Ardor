import { useApp } from '../lib/store';
import SearchBox from '../components/SearchBox';
import { StadiumWave } from '../components/SportsArt';

export default function ExplorePage() {
  const { flags } = useApp();
  const gemini = flags.gemini;

  return (
    <div className="space-y-6">
      <section className="ff-card animate-rise relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ember/20 blur-3xl"
          aria-hidden
        />
        <StadiumWave className="pointer-events-none absolute bottom-0 right-4 h-16 w-56 opacity-70 sm:right-8" />
        <h1 className="font-display text-3xl font-bold tracking-tight text-strong sm:text-4xl">
          Search every <span className="gradient-text">scored moment</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">
          Instant, passion-ranked search across every fan and match moment we&apos;ve scored — every
          result carries the structured passion signal Gemini extracted from it.
        </p>

        <div className="mt-4">
          <span className="ff-chip inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${gemini ? 'bg-mint' : 'bg-gold'} animate-pulse`}
              aria-hidden
            />
            {gemini ? 'Gemini-scored' : 'Heuristic-scored'} moments · full-text ranked by passion
          </span>
        </div>
      </section>

      <SearchBox />
    </div>
  );
}

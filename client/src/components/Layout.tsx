import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../lib/store';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { to: '/app', label: 'Live Feed', end: true },
  { to: '/app/explore', label: 'Explore', end: false },
  { to: '/app/tournament', label: 'Hype-Off', end: false },
  { to: '/app/personal', label: 'Personal', end: false },
];

export default function Layout() {
  const { user, flags, configLoading } = useApp();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-ink-border bg-ink-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2" title="FanForge home">
            <span className="text-2xl">🔥</span>
            <span className="font-display text-lg font-bold text-strong">
              Fan<span className="gradient-text">Forge</span>
            </span>
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `ff-nav-link ${isActive ? 'ff-nav-link-active' : ''}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {!configLoading && (
              <span
                className="hidden items-center gap-1.5 text-xs text-ink-faint md:inline-flex"
                title="Passion scoring engine"
              >
                <span className={`h-2 w-2 rounded-full ${flags.ai ? 'bg-mint' : 'bg-gold'} animate-pulse-glow`} />
                {flags.ai ? 'AI' : 'Heuristic'} scoring
              </span>
            )}
            {user ? (
              <div className="flex items-center gap-2 rounded-xl border border-ink-border bg-ink-800/70 px-3 py-1.5">
                <span className="text-sm font-semibold text-strong">{user.displayName}</span>
                <span className="ff-pill bg-ember/20 text-ember-soft">{user.passionPoints} PP</span>
              </div>
            ) : (
              <NavLink to="/app/tournament" className="ff-btn-primary px-3 py-1.5 text-xs">
                Join the arena
              </NavLink>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `ff-nav-link whitespace-nowrap ${isActive ? 'ff-nav-link-active' : ''}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-ink-faint">
        FanForge · a pluggable passion-intelligence platform · AI + MongoDB + ElevenLabs + Solana
        {flags.memoryDb && <span className="ml-1">· in-memory MongoDB</span>}
      </footer>
    </div>
  );
}

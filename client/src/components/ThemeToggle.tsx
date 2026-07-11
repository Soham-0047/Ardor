import { useTheme } from '../lib/theme';

/** Sun/moon switch. Compact enough for headers; label appears on hover. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-border bg-ink-800/60 text-base transition hover:border-ember/50 ${className}`}
    >
      <span aria-hidden>{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}

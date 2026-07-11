/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Every color is a CSS variable (RGB triplet) defined in index.css, with
      // light values on :root and dark values on .dark — so the whole app
      // themes by flipping one class. <alpha-value> keeps /50-style modifiers.
      colors: {
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)', // page background
          800: 'rgb(var(--ink-800) / <alpha-value>)', // inputs / chips
          700: 'rgb(var(--ink-700) / <alpha-value>)', // hover / active fills
          card: 'rgb(var(--ink-card) / <alpha-value>)',
          border: 'rgb(var(--ink-border) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)', // secondary text
          faint: 'rgb(var(--ink-faint) / <alpha-value>)', // labels / timestamps
        },
        fg: 'rgb(var(--fg) / <alpha-value>)', // primary body text
        strong: 'rgb(var(--fg-strong) / <alpha-value>)', // headings / emphasis
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)', // ink on filled accents
        ember: {
          DEFAULT: 'rgb(var(--c-ember) / <alpha-value>)', // brand volt
          soft: 'rgb(var(--c-ember-soft) / <alpha-value>)',
          deep: 'rgb(var(--c-ember-deep) / <alpha-value>)',
        },
        hot: 'rgb(var(--c-hot) / <alpha-value>)',
        cool: 'rgb(var(--c-cool) / <alpha-value>)',
        mint: 'rgb(var(--c-mint) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        violet: 'rgb(var(--c-violet) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -6px var(--glow-brand)',
        'glow-lg': '0 0 32px -6px var(--glow-brand)',
        'glow-hot': '0 0 24px -4px rgba(244, 63, 94, 0.4)',
        card: 'var(--shadow-card)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        rise: 'rise 0.4s ease-out both',
        'pulse-glow': 'pulseGlow 2.2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};

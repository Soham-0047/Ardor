/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#08090f',
          800: '#0c0e17',
          700: '#12152130',
          card: '#151827',
          border: '#242a3d',
          muted: '#8b93ad',
          faint: '#5b6178',
        },
        ember: {
          DEFAULT: '#ff5a3c',
          soft: '#ff7a5c',
          deep: '#e23c22',
        },
        hot: '#ff2d78',
        cool: '#38bdf8',
        mint: '#34d399',
        gold: '#fbbf24',
        violet: '#a78bfa',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(255, 90, 60, 0.45)',
        'glow-hot': '0 0 24px -4px rgba(255, 45, 120, 0.45)',
        card: '0 10px 30px -12px rgba(0, 0, 0, 0.6)',
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

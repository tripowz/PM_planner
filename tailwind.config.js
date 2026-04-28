/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        cockpit: {
          accent: 'var(--accent)',
          bg: 'var(--bg-primary)',
          panel: 'var(--bg-secondary)',
          card: 'var(--bg-tertiary)',
          hover: 'var(--bg-hover)',
          border: 'var(--border-primary)',
          text: 'var(--text-primary)',
          muted: 'var(--text-tertiary)',
        },
      },
    },
  },
  plugins: [],
}

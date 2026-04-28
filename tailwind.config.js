/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', '"SF Pro Text"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['"SF Pro Display"', '"SF Pro Text"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', '"Cascadia Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
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

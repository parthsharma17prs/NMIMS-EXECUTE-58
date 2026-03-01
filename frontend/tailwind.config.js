/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        campus: {
          950: "#000000",
          900: "#080808",
          850: "#0e0e0e",
          800: "#161616",
          700: "#1e1e1e",
          600: "#2a2a2a",
          500: "#3a3a3a",
          400: "#555555",
          300: "#7a7a7a",
          200: "#aaaaaa",
          100: "#d5d5d5",
          50:  "#f0f0f0",
        },
        accent: {
          gold:    "#f0b429",
          coral:   "#ff6b6b",
          teal:    "#0dceda",
          violet:  "#8b5cf6",
          lime:    "#84cc16",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'glow-sky':     '0 0 20px rgba(56,189,248,0.15), 0 0 40px rgba(56,189,248,0.05)',
        'glow-emerald': '0 0 20px rgba(52,211,153,0.15), 0 0 40px rgba(52,211,153,0.05)',
        'glow-amber':   '0 0 20px rgba(251,191,36,0.15), 0 0 40px rgba(251,191,36,0.05)',
        'glow-violet':  '0 0 20px rgba(139,92,246,0.15), 0 0 40px rgba(139,92,246,0.05)',
        'glow-coral':   '0 0 20px rgba(255,107,107,0.15), 0 0 40px rgba(255,107,107,0.05)',
        'card-hover':   '0 8px 32px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.05)',
        'card':         '0 2px 12px rgba(0,0,0,0.2)',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(56,189,248,0.2)' },
          '50%':      { boxShadow: '0 0 30px rgba(56,189,248,0.4)' },
        },
        ringDraw: {
          '0%':   { strokeDashoffset: '339.292' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up':   'fadeInUp 0.5s ease-out both',
        'fade-in':       'fadeIn 0.4s ease-out both',
        'scale-in':      'scaleIn 0.4s ease-out both',
        'slide-in-left': 'slideInLeft 0.4s ease-out both',
        'slide-down':    'slideDown 0.35s ease-out both',
        'shimmer':       'shimmer 2s linear infinite',
        'float':         'float 3s ease-in-out infinite',
        'glow-pulse':    'glowPulse 2.5s ease-in-out infinite',
        'ring-draw':     'ringDraw 1.2s ease-out both',
        'count-up':      'countUp 0.6s ease-out both',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50:  '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
        },
        ink: {
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        forest: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          300: '#93C5FD',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        gold: {
          50:  '#FFF1F2',
          100: '#FFE4E6',
          300: '#FDA4AF',
          500: '#FB7185',
          600: '#F43F5E',
          700: '#E11D48',
        },
        terra: {
          50:  '#FFF1F2',
          300: '#FDA4AF',
          500: '#E11D48',
          700: '#9F1239',
        },
        sage: {
          50:  '#ECFDF5',
          300: '#6EE7B7',
          500: '#10B981',
          700: '#047857',
        },
      },
      fontFamily: {
        display: ['Onest', 'system-ui', 'sans-serif'],
        sans: ['Onest', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['clamp(3rem, 8vw, 5.5rem)', { lineHeight: '1.0', letterSpacing: '-0.04em' }],
        'display-xl':  ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.035em' }],
        'display-lg':  ['clamp(2rem, 4vw, 2.75rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-md':  ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
        '3xl': '36px',
      },
      boxShadow: {
        'soft':       '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        'card':       '0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 24px -6px rgba(15, 23, 42, 0.08)',
        'pop':        '0 8px 20px -4px rgba(37, 99, 235, 0.18), 0 4px 8px -2px rgba(15, 23, 42, 0.06)',
        'pop-lg':     '0 24px 48px -12px rgba(37, 99, 235, 0.25), 0 12px 24px -8px rgba(15, 23, 42, 0.08)',
        'inset-line': 'inset 0 -1px 0 rgba(15, 23, 42, 0.06)',
      },
      backgroundImage: {
        'mesh-blue': 'radial-gradient(800px 400px at 0% 0%, rgba(59, 130, 246, 0.15), transparent 50%), radial-gradient(700px 500px at 100% 100%, rgba(251, 113, 133, 0.12), transparent 50%)',
        'mesh-warm': 'radial-gradient(700px 400px at 100% 0%, rgba(251, 113, 133, 0.18), transparent 50%), radial-gradient(900px 500px at 0% 100%, rgba(59, 130, 246, 0.12), transparent 50%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'pop-in':  'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'float':   'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

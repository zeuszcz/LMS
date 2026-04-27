/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FBF8F1',
          100: '#F5F0E5',
          200: '#EBE4D2',
          300: '#DCD0B5',
          400: '#B8A98A',
        },
        ink: {
          400: '#8B8275',
          500: '#6B6356',
          600: '#52493D',
          700: '#3D362C',
          800: '#2A2520',
          900: '#1F1B16',
        },
        forest: {
          50: '#EFF4F0',
          100: '#D6E2D9',
          300: '#8BAA94',
          500: '#4A6B5A',
          600: '#39574A',
          700: '#2D4A3E',
          800: '#213830',
          900: '#1A2E26',
        },
        gold: {
          50: '#FCF6E5',
          100: '#F8E9C2',
          300: '#EDC76B',
          500: '#D4A03B',
          600: '#B58724',
          700: '#A37820',
        },
        terra: {
          50: '#F9ECE7',
          300: '#D88E72',
          500: '#B85A3D',
          700: '#8C3F26',
        },
        sage: {
          50: '#EEF3EE',
          300: '#A6BDA9',
          500: '#7A9B7E',
          700: '#577A5C',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Display sizes (Fraunces) — generous, editorial
        'display-2xl': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-xl': ['clamp(2.5rem, 6vw, 4.5rem)', { lineHeight: '0.98', letterSpacing: '-0.025em' }],
        'display-lg': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        'paper': '0 1px 0 rgba(31, 27, 22, 0.04), 0 4px 12px -4px rgba(31, 27, 22, 0.08)',
        'paper-md': '0 2px 0 rgba(31, 27, 22, 0.04), 0 12px 24px -8px rgba(31, 27, 22, 0.12)',
        'paper-lg': '0 4px 0 rgba(31, 27, 22, 0.04), 0 24px 40px -12px rgba(31, 27, 22, 0.18)',
        'inset-line': 'inset 0 -1px 0 rgba(31, 27, 22, 0.08)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.122 0 0 0 0 0.106 0 0 0 0 0.086 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'rotate-slow': 'spin 20s linear infinite',
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
      },
    },
  },
  plugins: [],
};

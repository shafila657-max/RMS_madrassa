/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#047857',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5F5F4',
          foreground: '#1C1917',
        },
        accent: {
          DEFAULT: '#D97706',
          foreground: '#FFFFFF',
        },
        background: '#FFFFFF',
        foreground: '#1C1917',
        muted: {
          DEFAULT: '#E7E5E4',
          foreground: '#78716C',
        },
        border: '#E7E5E4',
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        emerald: {
          500: '#047857',
          600: '#059669',
          700: '#047857',
        },
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
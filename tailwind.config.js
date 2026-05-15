/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        camp: {
          beige:    '#FDFCF7',
          cream:    '#F3F0E6',
          sand:     '#E8E4D9',
          sage:     '#6B705C',
          'sage-light': '#8A8F7E',
          olive:    '#A5A58D',
          earth:    '#3F4238',
          bark:     '#5C534A',
          amber:    '#C9A96E',
          'amber-light': '#DFC99E',
          terracotta: '#B07D62',
          error:    '#A0413A',
          'error-light': '#FDF2F1',
          success:  '#4A7A5B',
          'success-light': '#F0F7F2',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'camp':   '1rem',
        'camp-lg': '1.5rem',
        'camp-xl': '2rem',
      },
      boxShadow: {
        'camp-sm':  '0 1px 3px 0 rgba(63, 66, 56, 0.04), 0 1px 2px -1px rgba(63, 66, 56, 0.04)',
        'camp':     '0 4px 12px -2px rgba(63, 66, 56, 0.06), 0 2px 6px -2px rgba(63, 66, 56, 0.04)',
        'camp-lg':  '0 10px 30px -4px rgba(63, 66, 56, 0.08), 0 4px 12px -4px rgba(63, 66, 56, 0.04)',
        'camp-xl':  '0 20px 50px -8px rgba(63, 66, 56, 0.10), 0 8px 20px -8px rgba(63, 66, 56, 0.04)',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'slide-right':   'slideRight 0.35s ease-out',
        'scale-in':      'scaleIn 0.3s ease-out',
        'pulse-gentle':  'pulseGentle 2s ease-in-out infinite',
        'spin-slow':     'spin 1.2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

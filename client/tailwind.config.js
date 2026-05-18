/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef0ff',
          100: '#e0e3ff',
          200: '#c7cbff',
          300: '#a5abff',
          400: '#8080ff',
          500: '#6357ff',
          600: '#5236f5',
          700: '#4425d9',
          800: '#3920b0',
          900: '#30208b',
          950: '#1d1260',
        },
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in':     'slideIn 0.2s ease-out',
        'scale-in':     'scaleIn 0.15s ease-out',
        'fade-up':      'fadeUp 0.6s ease-out both',
        'fade-up-slow': 'fadeUp 0.9s ease-out both',
        'float':        'float 6s ease-in-out infinite',
        'float-delay':  'float 6s ease-in-out 2s infinite',
        'shimmer':      'shimmer 2.5s linear infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':    'spin 8s linear infinite',
        'gradient':     'gradientShift 6s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        '200': '200%',
      },
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
};

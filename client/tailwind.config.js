// Brand colors (shared by client, admin and website; keep them in sync)
const brand = {
  50: '#eef3ff',
  100: '#dbe5ff',
  200: '#bccfff',
  300: '#8eaeff',
  400: '#5a85ff',
  500: '#2b5cff',
  600: '#003dff',
  700: '#0031d1',
  800: '#0028a8',
  900: '#00227f',
  950: '#001452',
};
const neutral = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // Product palette: brand blue + neutral slate. The other hue names used
      // in components point at the brand blue, so every accent is the same blue.
      colors: {
        gray: neutral,
        blue: brand,
        indigo: brand,
        violet: brand,
        purple: brand,
        cyan: brand,
        teal: brand,
      },
      boxShadow: {
        sm: '0 8px 18px rgba(0, 61, 255, 0.08)',
        md: '0 14px 34px rgba(15, 23, 42, 0.1)',
        lg: '0 20px 50px rgba(15, 23, 42, 0.12)',
        xl: '0 28px 80px rgba(15, 35, 31, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'page-enter': 'pageEnter 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pageEnter: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

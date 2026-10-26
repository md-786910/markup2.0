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
        // Crisp, neutral elevation (no colored glows)
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        lg: '0 12px 32px rgba(15, 23, 42, 0.10)',
        xl: '0 24px 60px rgba(15, 23, 42, 0.16)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Wordmark only ("Kommently" next to the logo), same as the website
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
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
      },
    },
  },
  plugins: [],
};

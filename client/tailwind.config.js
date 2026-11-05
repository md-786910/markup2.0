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

// Typography (TYPOGRAPHY-README.md): the only allowed text styles. Same block in
// client, admin and website; keep them in sync with src/styles/typography.css.
// Use text-display/h1/h2/h3/h4/body-lg/body/body-sm/label/overline/caption,
// never arbitrary sizes such as text-[13px]. The heaviest weight is 600.
const fontFamily = {
  sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  serif: ['var(--font-serif)', 'Georgia', 'serif'],
  mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
};
const fontSize = {
  display: ['clamp(44px, 7vw, 72px)', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '600' }],
  h1: ['clamp(36px, 5vw, 56px)', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '600' }],
  h2: ['clamp(28px, 3.5vw, 40px)', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
  h3: ['24px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
  h4: ['20px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
  'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0' }],
  body: ['16px', { lineHeight: '1.5', letterSpacing: '0' }],
  'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0' }],
  label: ['14px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '500' }],
  overline: ['12px', { lineHeight: '1.2', letterSpacing: '0.06em', fontWeight: '500' }],
  caption: ['12px', { lineHeight: '1.4', letterSpacing: '0' }],
  // Kommently design system (kommently-design-system/tokens.json), the denser
  // scale of the signed-in app shell: page-title once per page, section-title
  // for settings sections, card-title for project names, ui for body text
  // (13px), ui-label for form labels / pills / table headers, micro for badges.
  'page-title': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'section-title': ['15px', { lineHeight: '22px', letterSpacing: '0', fontWeight: '600' }],
  'card-title': ['13.5px', { lineHeight: '20px', letterSpacing: '0', fontWeight: '600' }],
  ui: ['13px', { lineHeight: '20px', letterSpacing: '0' }],
  'ui-label': ['12.5px', { lineHeight: '18px', letterSpacing: '0', fontWeight: '500' }],
  micro: ['11.5px', { lineHeight: '16px', letterSpacing: '0', fontWeight: '500' }],
};
const fontWeight = { normal: '400', medium: '500', semibold: '600' };

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    fontSize,
    fontWeight,
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
        // Design system: 3.2:1 border for inputs, selects, checkboxes, toggle tracks
        control: '#8091a7',
      },
      boxShadow: {
        // Crisp, neutral elevation (no colored glows)
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        lg: '0 12px 32px rgba(15, 23, 42, 0.10)',
        xl: '0 24px 60px rgba(15, 23, 42, 0.16)',
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
      },
      fontFamily,
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'page-enter': 'pageEnter 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
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

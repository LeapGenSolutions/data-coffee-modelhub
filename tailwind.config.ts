import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hub: {
          bg:          '#0D0F10',
          side:        '#161819',
          panel:       '#1E2122',
          hover:       '#26292B',
          active:      '#2E3235',
          border:      '#2C2F31',
          text:        '#ECECEC',
          'text-sec':  '#A8ADB0',
          'text-muted':'#6E7377',
          accent:      '#10A37F',
          'accent-hi': '#13BD93',
        },
        provider: {
          claude: '#D97757',
          openai: '#74AA9C',
          gemini: '#6E8EF7',
        },
      },
      borderRadius: {
        'hub-lg': '16px',
        'hub-md': '12px',
        'hub-sm': '9px',
      },
      width: {
        'sidebar-w': '264px',
      },
      fontSize: {
        'hub-xs':   ['11px',  { lineHeight: '1.4' }],
        'hub-sm':   ['13px',  { lineHeight: '1.5' }],
        'hub-base': ['14px',  { lineHeight: '1.55' }],
        'hub-lg':   ['15px',  { lineHeight: '1.4' }],
        'hub-xl':   ['17px',  { lineHeight: '1.3' }],
        'hub-2xl':  ['24px',  { lineHeight: '1.2' }],
        'hub-3xl':  ['27px',  { lineHeight: '1.15' }],
      },
      spacing: {
        '4.5': '18px',
        '7.5': '30px',
        '8.5': '34px',
      },
      boxShadow: {
        'hub-glow':       '0 0 20px rgba(16,163,127,0.15)',
        'hub-glow-strong':'0 0 30px rgba(16,163,127,0.25)',
        'hub-float':      '0 14px 40px rgba(0,0,0,0.5)',
        'hub-card':       '0 2px 8px rgba(0,0,0,0.2)',
      },
      keyframes: {
        blink: {
          '0%, 80%, 100%': { opacity: '0.25' },
          '40%':           { opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'blink':         'blink 1.2s infinite',
        'fade-in':       'fade-in 0.25s ease-out',
        'slide-in-left': 'slide-in-left 0.2s ease-out',
        'scale-in':      'scale-in 0.15s ease-out',
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
};

export default config;

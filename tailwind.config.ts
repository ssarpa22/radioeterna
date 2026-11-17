import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { ink: '#0A1730', navy: { DEFAULT: '#12284B', soft: '#1D3A66' }, paper: '#FBF9F4', line: '#E6E0D2',
      gold: { DEFAULT: '#C9A24A', deep: '#7A5C14', soft: '#F1E4BE' }, sky: '#2F5C9E', ok: '#2E7D5B', danger: '#B3372F' },
    fontFamily: { display: ['var(--font-display)', 'Georgia', 'serif'], sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
  } },
} satisfies Config;

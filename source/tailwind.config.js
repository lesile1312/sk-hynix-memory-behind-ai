/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050507',
        paper: '#F4F1EA',
        muted: '#96969B',
        ice: '#9CCBEB',
        silver: '#B8BEC7',
        line: 'rgba(255,255,255,0.14)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        label: ['"Jost"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

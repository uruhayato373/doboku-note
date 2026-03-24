import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Hiragino Kaku Gothic ProN"', 'Meiryo', 'YuGothic', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        base: '14px',
      },
      colors: {
        primary: {
          DEFAULT: '#1a56db',
          dark: '#1648b8',
          darker: '#123d9c',
          darkest: '#0e3280',
          light: '#3b73e8',
          lighter: '#6b9cf0',
          lightest: '#dce7fb',
        },
      },
    },
  },
  plugins: [],
};

export default config;

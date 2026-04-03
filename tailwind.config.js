/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // ダークモードをクラスベースで有効化
  theme: {
    extend: {
      colors: {
        // カッコム専用カラーパレット（青系統一）
        primary: {
          50: '#eff6ff',   // 非常に薄い青
          100: '#dbeafe',  // 薄い青
          200: '#bfdbfe',  // 薄い青
          300: '#93c5fd',  // 薄い青
          400: '#60a5fa',  // 青
          500: '#3b82f6',  // メイン青
          600: '#2563eb',  // 濃い青
          700: '#1d4ed8',  // 濃い青
          800: '#1e40af',  // 濃い青
          900: '#1e3a8a',  // 最も濃い青
        },
        // アクセントカラー（シアン系）
        accent: {
          50: '#ecfeff',   // 非常に薄いシアン
          100: '#cffafe',  // 薄いシアン
          200: '#a5f3fc',  // 薄いシアン
          300: '#67e8f9',  // 薄いシアン
          400: '#22d3ee',  // シアン
          500: '#06b6d4',  // メインシアン
          600: '#0891b2',  // 濃いシアン
          700: '#0e7490',  // 濃いシアン
          800: '#155e75',  // 濃いシアン
          900: '#164e63',  // 最も濃いシアン
        },
        neutral: {
          50: "#f8fafc", // 背景色
          900: "#0f172a", // テキスト色
        },
      },
      fontFamily: {
        sans: ["Noto Sans JP", "Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      typography: {
        DEFAULT: {
          css: {
            // 改行処理の改善
            'p': {
              marginBottom: '1rem',
              lineHeight: '1.8', // 行間を1.8に設定（読みやすい）
            },
            'ul, ol': {
              marginBottom: '1rem',
              lineHeight: '1.8', // 箇条書きの行間も統一
            },
            'li': {
              marginBottom: '0.5rem',
              lineHeight: '1.8', // リスト項目の行間も統一
            },
            'li:last-child': {
              marginBottom: '0',
            },
            'h1 + p, h2 + p, h3 + p, h4 + p': {
              marginTop: '1rem',
            },
            // 見出しの適切なスペーシング
            'h1, h2, h3, h4': {
              marginTop: '2rem',
              marginBottom: '1rem',
              lineHeight: '1.4', // 見出しは少し詰めめ
            },
            // 全体的な行間設定
            'maxWidth': 'none',
            'lineHeight': '1.8', // デフォルト行間
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

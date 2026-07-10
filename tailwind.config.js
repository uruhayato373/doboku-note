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
      screens: {
        // Zenn-aligned breakpoints（Zenn本番CSSの max-width 式に一致する min-width 値）
        'zenn-tiny': '401px',      // ≥401 （Zenn ≤400 の反転）
        'zenn-sp': '577px',        // ≥577 （Zenn ≤576 の反転）
        'zenn-tablet': '769px',    // ≥769 （Zenn ≤768 の反転）
        'zenn-desktop': '993px',   // ≥993 （Zenn ≤992 の反転、サイドバー可視化境界）
      },
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
        // Semantic color tokens — UI・SVG 共通（globals.css の CSS 変数を参照）
        ink: {
          strong: 'var(--ink)',
          body: 'var(--ink-body)',
          muted: 'var(--ink-muted)',
        },
        brand: {
          DEFAULT: 'var(--accent)',
          fill: 'var(--accent-fill)',
          deep: 'var(--accent)',
        },
        positive: {
          DEFAULT: 'var(--color-positive)',
          fill: 'var(--color-positive-fill)',
        },
        warn: {
          DEFAULT: 'var(--color-warn)',
          fill: 'var(--color-warn-fill)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          fill: 'var(--color-danger-fill)',
        },
        surface: 'var(--bg)',
        'token-border': 'var(--rule-soft)',
        // Editorial tokens (handoff)
        editorial: {
          accent: 'var(--accent)',
          'accent-fill': 'var(--accent-fill)',
          paper: 'var(--paper)',
          bg: 'var(--bg)',
          ink: 'var(--ink)',
          'ink-body': 'var(--ink-body)',
          'ink-muted': 'var(--ink-muted)',
          rule: 'var(--rule)',
          'rule-soft': 'var(--rule-soft)',
        },
      },
      fontFamily: {
        // 2026-04-29 #84 LCP 改善: next/font (Inter / Noto_Sans_JP) を全削除し system font に統一。
        // render-blocking @font-face CSS の除去で AdSense 審査に必要な PSI Performance ≥ 70 を狙う。
        // 2026-06-26: 参考サイト(sidejobearn)に合わせ「游ゴシック優先のゴシック1種」を全要素へ統一。
        // 見出しの明朝(serif)は廃止し、serif は同一ゴシックスタックへのエイリアスとする
        // （多数のコンポーネントが font-serif を使うため、トークン側で一括ゴシック化する）。
        sans: [
          "游ゴシック体",
          "Yu Gothic",
          "YuGothic",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "游ゴシック体",
          "Yu Gothic",
          "YuGothic",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      typography: {
        DEFAULT: {
          css: {
            fontSize: '16px',
            lineHeight: '1.8',
            maxWidth: 'none',
            'p': {
              marginBottom: '1rem',
              lineHeight: '1.8',
            },
            'ul, ol': {
              marginBottom: '1rem',
              lineHeight: '1.8',
            },
            'li': {
              marginBottom: '0.5rem',
              lineHeight: '1.8',
            },
            'li:last-child': {
              marginBottom: '0',
            },
            'h1 + p, h2 + p, h3 + p, h4 + p': {
              marginTop: '1rem',
            },
            'h1, h2, h3, h4': {
              marginTop: '2rem',
              marginBottom: '1rem',
              lineHeight: '1.4',
            },
          },
        },
      },
      borderRadius: {
        'card-inline': 'var(--radius-card-inline)',
        'card-content': 'var(--radius-card-content)',
        'card-section': 'var(--radius-card-section)',
        'card-hero': 'var(--radius-card-hero)',
      },
      boxShadow: {
        'card-content': 'var(--shadow-card-content)',
        'card-section': 'var(--shadow-card-section)',
        'card-hover': 'var(--shadow-card-hover)',
        'soft': 'var(--shadow-soft)',
        'lift': 'var(--shadow-lift)',
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

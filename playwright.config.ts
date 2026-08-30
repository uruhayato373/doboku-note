import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
// 既定はビルド成果物の静的配信（3025）。E2E_DEV=1 のときだけ dev サーバー（3020）。
// ポートを分けているのは、dev が起動中でも reuseExistingServer が取り違えないようにするため。
const useDevServer = Boolean(process.env.E2E_DEV);
const port = useDevServer ? 3020 : 3025;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  ...(isCI ? { workers: 2 } : {}),
  timeout: 30_000,
  // 初回コンパイル待ちは globalSetup のウォームアップで assertion の外へ出している。
  // ここは「温まったサーバーに対する妥当な待ち」に留める（伸ばしすぎると本物の遅延を見逃す）。
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  reporter: isCI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    // 127.0.0.1 ではなく localhost で叩く。この開発機では 127.0.0.1 宛の一部
    // `_next/static/chunks/*.js` が 403 で落ちる（同じサーバーでも localhost 宛は全て 200）。
    // クライアント JS が欠けてハイドレーションが壊れ、smoke の「コンソールエラーなし」と
    // select の onChange で遷移するテストが落ちていた。製品ではなく経路の問題なので経路を寄せる。
    baseURL: `http://localhost:${port}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  /**
   * 既定はビルド成果物（out/）の静的配信。`E2E_DEV=1` を付けたときだけ dev サーバーを使う。
   *
   * dev を既定にしていた頃は、初めて踏むルートがリクエスト時にコンパイルされるため、
   * 基準類の章記事 344 本を足した時点で落ちるテストが実行ごとに入れ替わる状態になった
   * （実装は正しいのに赤・2 回目は通る）。さらに旧 `/category/` `/docs/` は Cloudflare の
   * `_redirects` でしか存在せず dev では必ず 404 で、リダイレクト前提の検査が成立しなかった。
   * 静的配信ならコンパイルが無く、`_redirects` も scripts/static-server.mjs が適用する。
   *
   * 事前に `npm run build` が要る。out/ が無ければ serve が理由を出して落ちる（黙って空を配らない）。
   */
  webServer: {
    command: useDevServer ? 'npm run dev -- --hostname 127.0.0.1' : 'npm run serve',
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});

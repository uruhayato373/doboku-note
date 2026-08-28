import { defineConfig, devices } from '@playwright/test';

/**
 * 管理画面（tools/admin-app）専用の E2E 設定。
 *
 * **本体サイトの playwright.config.ts とは分離する**。admin はローカル dev 専用で本番へ
 * デプロイせず、CI で build もしない方針なので、CI の e2e workflow には載せない
 * （load したい場合は `npm run test:e2e:admin` を手で叩く）。
 *
 * webServer は `npm run admin`（next dev・127.0.0.1:3021）。既に起動していれば再利用する。
 */
export default defineConfig({
  testDir: './e2e-admin',
  // 並列ワーカーが未コンパイルのページへ同時初回アクセスすると next dev のコンパイルが
  // 直列化し無関係なテストまで timeout する（2026-08-28）。globalSetup で主要ルートを
  // 直列に一度ずつ叩いてから並列実行することで、この道連れタイムアウトを軽減する。
  globalSetup: './e2e-admin/global-setup.ts',
  fullyParallel: true,
  // dev サーバーは 1 プロセスの next dev（CI のような水平分散インフラではない）。
  // 既定 workers（CPU コア基準・このマシンで 16 前後）で叩くと、SSR 側の重い処理
  // （kindle ページの git log 子プロセス起動・brain の全ファイル stat 等）が同時実行の
  // キューで詰まり、対象外の既存テストまで expect timeout(7.5s) で道連れに落ちる
  // （`--workers=1` では新規・既存とも全件緑になることを確認済み・2026-08-28）。
  // 単一サーバーが安定してさばける並列数へ絞る。
  workers: 4,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3021',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run admin',
    url: 'http://127.0.0.1:3021',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

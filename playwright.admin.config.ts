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
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 7_500 },
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

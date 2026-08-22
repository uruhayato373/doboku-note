#!/usr/bin/env node
/**
 * google-console-login.mjs — GSC/GA4 用の永続 Chrome プロファイルを headed で開き、
 * 人間がログイン・2FA・CAPTCHA を完了するのを待つ（ローカル専用）。
 *
 * 一度ログインすれば `.local/playwright-google-profile/` に保持され、以降の
 * fetch-gsc-ui-csv.mjs / fetch-ga4-ui-csv.mjs は再ログイン不要。
 *
 * 使い方:
 *   npm run google-console:login
 *   node scripts/google-console-login.mjs --headless   # 既にログイン済みかの確認だけ
 *
 * 安全弁:
 *   - CAPTCHA / 2FA を自動突破しない（人間の操作を待つだけ）
 *   - Cookie / メールアドレスを標準出力しない
 *   - 無限待機せず loginMaxWaitMs で打ち切り、状態を 120 秒ごとに表示
 */
import {
  loadConfig,
  launchContext,
  waitForHumanLogin,
  isSignedInToGsc,
} from "./lib/google-console-browser.mjs";

const argv = process.argv.slice(2);
const HEADLESS = argv.includes("--headless");

async function main() {
  const cfg = loadConfig();
  console.log("GSC/GA4 ログインプロファイルを開いています（システム Chrome）...");
  console.log(`プロパティ: ${cfg.gsc.property}`);
  const ctx = await launchContext(cfg, { headless: HEADLESS });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  try {
    await page.goto(cfg.gsc.baseUrl, { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs });

    if (await isSignedInToGsc(page).catch(() => false)) {
      console.log("既にログイン済みです（GSC 本体が表示されています）。");
    } else if (HEADLESS) {
      console.log("未ログインです。`npm run google-console:login`（headed）で手動ログインしてください。");
      await ctx.close();
      process.exit(3);
    } else {
      console.log(
        "\nブラウザで Google アカウントにログインし、必要なら 2 段階認証・CAPTCHA を完了してください。" +
          "\nこのターミナルはログイン完了を自動検知します（最大 " +
          Math.round((cfg.browser.loginMaxWaitMs || 900000) / 60000) +
          " 分）。\n",
      );
      const ok = await waitForHumanLogin(page, cfg);
      if (!ok) {
        console.error("ログインが確認できませんでした（タイムアウト）。もう一度実行してください。");
        await ctx.close();
        process.exit(4);
      }
      console.log("ログインを確認しました。プロファイルに保存されました。");
    }
  } finally {
    // headed の場合はユーザーがブラウザを閉じられるよう少し待ってから閉じる
    if (!HEADLESS) await page.waitForTimeout(1500);
    await ctx.close();
  }
  console.log("完了。以降 fetch-gsc-ui-csv / fetch-ga4-ui-csv は再ログイン不要です。");
}

main().catch(async (e) => {
  console.error("Error:", e?.message || e);
  process.exit(1);
});

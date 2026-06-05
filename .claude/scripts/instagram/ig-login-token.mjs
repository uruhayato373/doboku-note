/**
 * Instagram ログイン版（graph.instagram.com）アクセストークン検証 / 長期化ツール
 *
 * 認証ルート: Instagram API with Instagram Login（Facebook ログイン版とは別物）
 * post-from-schedule.cjs が使う graph.instagram.com に対応する正しいトークンを扱う。
 *
 * 使い方:
 *   # 1) ダッシュボードで取得したトークンの疎通確認 + IG ユーザーID 取得
 *   node .claude/scripts/instagram/ig-login-token.mjs --token IGAA...
 *
 *   # 2) 短期トークンを長期トークン(60日)に交換する（INSTAGRAM_APP_SECRET が必要）
 *   node .claude/scripts/instagram/ig-login-token.mjs --token IGAA... --exchange
 *
 *   # 3) 検証/交換した結果を .env.local に保存する
 *   node .claude/scripts/instagram/ig-login-token.mjs --token IGAA... --exchange --save
 *
 *   # 4) 既存の長期トークンを更新（期限延長, 60日 → さらに60日）
 *   node .claude/scripts/instagram/ig-login-token.mjs --token IGAA... --refresh --save
 *
 * .env.local（任意・--exchange 時のみ必要）:
 *   INSTAGRAM_APP_SECRET=...   # Instagram API setup 画面の「Instagram app secret」
 *
 * 保存先キー（--save 時）:
 *   INSTAGRAM_ACCESS_TOKEN          ← post-from-schedule.cjs が読む
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID   ← 同上（graph.instagram.com の me.user_id）
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const ENV_PATH = resolve(ROOT, ".env.local");
const BASE = "https://graph.instagram.com";

// --- 引数パース ---
const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}
const token = flagValue("--token");
const doExchange = args.includes("--exchange");
const doRefresh = args.includes("--refresh");
const doSave = args.includes("--save");

if (!token) {
  console.error("Usage: node ig-login-token.mjs --token IGAA... [--exchange] [--refresh] [--save]");
  process.exit(1);
}

// --- .env.local 読み込み（任意） ---
function parseEnv(content) {
  const map = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}
function updateEnv(content, key, value) {
  const regex = new RegExp(`^(${key}=).*$`, "m");
  return regex.test(content)
    ? content.replace(regex, `$1${value}`)
    : content.replace(/\n*$/, "") + `\n${key}=${value}\n`;
}
const envContent = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
const env = parseEnv(envContent);

async function getJson(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

let activeToken = token;

// --- 1) 短期 → 長期トークン交換 ---
if (doExchange) {
  const secret = env["INSTAGRAM_APP_SECRET"];
  if (!secret) {
    console.error("❌ --exchange には .env.local の INSTAGRAM_APP_SECRET が必要です");
    process.exit(1);
  }
  console.log("\n[exchange] 短期 → 長期トークンに交換中...");
  const url =
    `${BASE}/access_token?grant_type=ig_exchange_token` +
    `&client_secret=${encodeURIComponent(secret)}` +
    `&access_token=${encodeURIComponent(activeToken)}`;
  const data = await getJson(url);
  activeToken = data.access_token;
  console.log(`  ✓ 長期トークン取得（有効期限: ${Math.round((data.expires_in ?? 0) / 86400)} 日）`);
}

// --- 1') 長期トークンの更新（期限延長） ---
if (doRefresh) {
  console.log("\n[refresh] 長期トークンを更新中...");
  const url =
    `${BASE}/refresh_access_token?grant_type=ig_refresh_token` +
    `&access_token=${encodeURIComponent(activeToken)}`;
  const data = await getJson(url);
  activeToken = data.access_token;
  console.log(`  ✓ 更新完了（有効期限: ${Math.round((data.expires_in ?? 0) / 86400)} 日）`);
}

// --- 2) 疎通確認 + IG ユーザーID 取得 ---
console.log("\n[verify] graph.instagram.com/me で疎通確認中...");
const me = await getJson(
  `${BASE}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(activeToken)}`,
);
console.log("  ✓ トークン有効");
console.log(`    username     : ${me.username}`);
console.log(`    account_type : ${me.account_type}`);
console.log(`    user_id      : ${me.user_id}`);

if (!me.user_id) {
  console.error("❌ user_id が取得できませんでした。プロアカウントか確認してください。");
  process.exit(1);
}

// --- 3) .env.local に保存 ---
if (doSave) {
  let updated = envContent;
  updated = updateEnv(updated, "INSTAGRAM_ACCESS_TOKEN", activeToken);
  updated = updateEnv(updated, "INSTAGRAM_BUSINESS_ACCOUNT_ID", String(me.user_id));
  writeFileSync(ENV_PATH, updated, "utf8");
  console.log("\n✅ .env.local を更新:");
  console.log(`    INSTAGRAM_ACCESS_TOKEN        = (${activeToken.length} 文字)`);
  console.log(`    INSTAGRAM_BUSINESS_ACCOUNT_ID = ${me.user_id}`);
} else {
  console.log("\n（--save 未指定のため保存していません。GitHub Secrets / .env.local 用の値:）");
  console.log(`    INSTAGRAM_ACCESS_TOKEN        = ${activeToken}`);
  console.log(`    INSTAGRAM_BUSINESS_ACCOUNT_ID = ${me.user_id}`);
}

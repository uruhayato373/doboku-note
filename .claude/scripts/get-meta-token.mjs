/**
 * Meta 長期アクセストークン取得スクリプト
 *
 * 使い方:
 *   node .claude/scripts/get-meta-token.mjs --short-token {短期トークン}
 *
 * 前提:
 *   .env.local に META_APP_ID と META_APP_SECRET が設定済みであること
 *
 * 実行後:
 *   .env.local の META_LONG_LIVED_TOKEN と META_INSTAGRAM_BUSINESS_ACCOUNT_ID を自動更新する
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ENV_PATH = resolve(ROOT, '.env.local');

// .env.local をパース
function parseEnv(content) {
  const map = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

// .env.local の特定キーを更新
function updateEnv(content, key, value) {
  const regex = new RegExp(`^(${key}=).*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `$1${value}`);
  }
  return content + `\n${key}=${value}`;
}

// コマンドライン引数
const args = process.argv.slice(2);
const shortTokenIdx = args.indexOf('--short-token');
if (shortTokenIdx === -1 || !args[shortTokenIdx + 1]) {
  console.error('Usage: node get-meta-token.mjs --short-token {短期トークン}');
  process.exit(1);
}
const shortToken = args[shortTokenIdx + 1];

// .env.local から App ID / App Secret を読み込み
const envContent = readFileSync(ENV_PATH, 'utf8');
const env = parseEnv(envContent);

const appId = env['META_APP_ID'];
const appSecret = env['META_APP_SECRET'];

if (!appId || !appSecret) {
  console.error('META_APP_ID または META_APP_SECRET が .env.local に未設定です');
  process.exit(1);
}

const BASE = 'https://graph.facebook.com/v21.0';

// 1. 短期 → 長期トークン変換
console.log('\n[1/3] 長期トークンを取得中...');
const exchangeUrl = new URL(`${BASE}/oauth/access_token`);
exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
exchangeUrl.searchParams.set('client_id', appId);
exchangeUrl.searchParams.set('client_secret', appSecret);
exchangeUrl.searchParams.set('fb_exchange_token', shortToken);

const exchangeRes = await fetch(exchangeUrl);
if (!exchangeRes.ok) {
  const body = await exchangeRes.text();
  console.error(`トークン変換失敗: ${exchangeRes.status} ${body}`);
  process.exit(1);
}
const { access_token: longToken, expires_in } = await exchangeRes.json();
console.log(`  ✓ 長期トークン取得（有効期限: ${Math.round(expires_in / 86400)} 日）`);

// 2. Facebook Page ID を取得
console.log('\n[2/3] Facebook Page ID を取得中...');
const pagesUrl = new URL(`${BASE}/me/accounts`);
pagesUrl.searchParams.set('access_token', longToken);

const pagesRes = await fetch(pagesUrl);
if (!pagesRes.ok) {
  const body = await pagesRes.text();
  console.error(`Page 取得失敗: ${pagesRes.status} ${body}`);
  process.exit(1);
}
const pagesData = await pagesRes.json();
const pages = pagesData.data ?? [];
if (pages.length === 0) {
  console.error('Facebook Page が見つかりません。Instagram Business アカウントが Facebook ページに接続されているか確認してください。');
  process.exit(1);
}

console.log(`  ✓ ${pages.length} 件のページを取得`);
pages.forEach((p, i) => console.log(`    [${i}] ${p.name} (id: ${p.id})`));

// 3. 各ページの Instagram Business Account ID を取得
console.log('\n[3/3] Instagram Business Account ID を取得中...');
let igAccountId = null;

for (const page of pages) {
  const igUrl = new URL(`${BASE}/${page.id}`);
  igUrl.searchParams.set('fields', 'instagram_business_account');
  igUrl.searchParams.set('access_token', longToken);

  const igRes = await fetch(igUrl);
  if (!igRes.ok) continue;
  const igData = await igRes.json();
  if (igData.instagram_business_account?.id) {
    igAccountId = igData.instagram_business_account.id;
    console.log(`  ✓ Instagram Business Account ID: ${igAccountId} (ページ: ${page.name})`);
    break;
  }
}

if (!igAccountId) {
  console.error('Instagram Business Account が見つかりません。');
  console.error('Instagram アカウントが「プロアカウント」かつ Facebook ページに接続されているか確認してください。');
  process.exit(1);
}

// 4. .env.local を更新
let updated = envContent;
updated = updateEnv(updated, 'META_LONG_LIVED_TOKEN', longToken);
updated = updateEnv(updated, 'META_INSTAGRAM_BUSINESS_ACCOUNT_ID', igAccountId);
writeFileSync(ENV_PATH, updated, 'utf8');

console.log('\n✅ .env.local を更新しました:');
console.log(`  META_LONG_LIVED_TOKEN     = (${longToken.length}文字)`);
console.log(`  META_INSTAGRAM_BUSINESS_ACCOUNT_ID = ${igAccountId}`);
console.log('\n次のステップ:');
console.log('  node .claude/scripts/get-meta-token.mjs で投稿テストを実行');

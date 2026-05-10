/**
 * Meta OAuth 認証スクリプト
 *
 * 1. ローカルサーバーを起動
 * 2. ブラウザで Facebook 認証ページを開く
 * 3. 認証後のコールバックを受け取り、長期トークンに変換
 * 4. .env.local に自動書き込み
 *
 * 事前準備:
 *   Facebook Developer Dashboard → Facebookログイン → 設定 →
 *   有効なOAuthリダイレクトURI に http://localhost:3000/callback を追加
 *
 * 実行: node .claude/scripts/meta-auth.mjs
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ENV_PATH = resolve(ROOT, '.env.local');

const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const BASE = 'https://graph.facebook.com/v21.0';
const SCOPES = ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'].join(',');

function parseEnv(content) {
  const map = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function updateEnv(content, key, value) {
  const regex = new RegExp(`^(${key}=).*$`, 'm');
  return regex.test(content)
    ? content.replace(regex, `$1${value}`)
    : content + `\n${key}=${value}`;
}

const envContent = readFileSync(ENV_PATH, 'utf8');
const env = parseEnv(envContent);
const appId = env['META_APP_ID'];
const appSecret = env['META_APP_SECRET'];

if (!appId || !appSecret) {
  console.error('META_APP_ID または META_APP_SECRET が .env.local に未設定です');
  process.exit(1);
}

const authUrl =
  `https://www.facebook.com/dialog/oauth` +
  `?client_id=${appId}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&response_type=code`;

console.log('\n[meta-auth] ローカルサーバーを起動中...');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>エラー: ${error}</h2><p>${url.searchParams.get('error_description') ?? ''}</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>code パラメーターが見つかりません</h2>');
    return;
  }

  console.log('\n[1/3] 短期トークンを取得中...');

  // code → 短期トークン
  const tokenUrl = new URL(`${BASE}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  tokenUrl.searchParams.set('code', code);

  const tokenRes = await fetch(tokenUrl);
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    const msg = JSON.stringify(tokenData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>トークン取得失敗</h2><pre>${msg}</pre>`);
    server.close();
    return;
  }

  console.log('  ✓ 短期トークン取得');

  // 短期 → 長期トークン
  console.log('[2/3] 長期トークンに変換中...');
  const exchangeUrl = new URL(`${BASE}/oauth/access_token`);
  exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token');
  exchangeUrl.searchParams.set('client_id', appId);
  exchangeUrl.searchParams.set('client_secret', appSecret);
  exchangeUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

  const exchangeRes = await fetch(exchangeUrl);
  const exchangeData = await exchangeRes.json();

  if (!exchangeData.access_token) {
    const msg = JSON.stringify(exchangeData);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>長期トークン変換失敗</h2><pre>${msg}</pre>`);
    server.close();
    return;
  }

  const longToken = exchangeData.access_token;
  const expiresInDays = Math.round((exchangeData.expires_in ?? 0) / 86400);
  console.log(`  ✓ 長期トークン取得（有効期限: ${expiresInDays} 日）`);

  // Instagram Business Account ID を取得
  console.log('[3/3] Instagram Business Account ID を取得中...');
  const pagesRes = await fetch(
    `${BASE}/me/accounts?access_token=${longToken}`
  );
  const pagesData = await pagesRes.json();
  const pages = pagesData.data ?? [];

  let igAccountId = null;
  for (const page of pages) {
    const igRes = await fetch(
      `${BASE}/${page.id}?fields=instagram_business_account&access_token=${longToken}`
    );
    const igData = await igRes.json();
    if (igData.instagram_business_account?.id) {
      igAccountId = igData.instagram_business_account.id;
      console.log(`  ✓ Instagram Business Account ID: ${igAccountId} (${page.name})`);
      break;
    }
  }

  // .env.local を更新
  let updated = envContent;
  updated = updateEnv(updated, 'META_LONG_LIVED_TOKEN', longToken);
  if (igAccountId) {
    updated = updateEnv(updated, 'META_INSTAGRAM_BUSINESS_ACCOUNT_ID', igAccountId);
  }
  writeFileSync(ENV_PATH, updated, 'utf8');

  const successHtml = `
    <html><body style="font-family:sans-serif;padding:2rem">
    <h2>✅ 認証成功！</h2>
    <p>META_LONG_LIVED_TOKEN を .env.local に保存しました（${expiresInDays}日有効）</p>
    ${igAccountId ? `<p>META_INSTAGRAM_BUSINESS_ACCOUNT_ID: ${igAccountId}</p>` : '<p style="color:red">⚠️ Instagram Business Account ID が見つかりません</p>'}
    <p>このタブを閉じてください。</p>
    </body></html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(successHtml);

  console.log('\n✅ .env.local を更新しました');
  if (!igAccountId) {
    console.log('⚠️  Instagram Business Account ID が見つかりませんでした');
    console.log('   Instagram アカウントが Facebook ページに接続されているか確認してください');
  }

  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`  ポート ${PORT} で待機中`);
  console.log('\n  ブラウザで Facebook 認証ページを開きます...\n');
  try {
    execSync(`open "${authUrl}"`);
  } catch {
    console.log('  以下のURLをブラウザで開いてください:');
    console.log(`  ${authUrl}\n`);
  }
});

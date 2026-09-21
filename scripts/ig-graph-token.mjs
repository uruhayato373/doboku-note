#!/usr/bin/env node
// ig-graph-token.mjs — Instagram Graph API のトークンを取得・確認する Mac ローカル補助スクリプト。
// CI では使わない（CI は GitHub Secrets に置いた長期トークンをそのまま fetch-ig-insights.mjs が読む）。
//
// 手順（初回だけ）:
//   1. Graph API Explorer (https://developers.facebook.com/tools/explorer/) で対象アプリを選び、
//      User トークンに instagram_basic, instagram_manage_insights, pages_show_list,
//      pages_read_engagement を付けて生成する（有効期限は短期・約1時間）。
//   2. その短期 User トークンを --user-token に渡して exchange する（長期 60 日 User トークンが出る）:
//        node scripts/ig-graph-token.mjs exchange --user-token <短期トークン>
//   3. 出力された長期 User トークンで page-token を実行し、対象ページの Page トークンと
//      紐づく instagram_business_account.id を確認する:
//        node scripts/ig-graph-token.mjs page-token --print-token
//   4. Page トークン（長期・実質無期限）を debug で確認する:
//        IG_GRAPH_ACCESS_TOKEN=<page token> node scripts/ig-graph-token.mjs debug
//   5. 問題なければ GitHub Secrets へ登録する:
//        gh secret set IG_GRAPH_ACCESS_TOKEN
//        gh secret set IG_BUSINESS_ACCOUNT_ID
//
// 環境変数: IG_GRAPH_ACCESS_TOKEN（debug 用）, META_APP_ID / META_APP_SECRET（exchange 用）。
//   .env.local から読む（loadEnvLocal・すでに process.env にあれば上書きしない）。
//
// 使い方:
//   node scripts/ig-graph-token.mjs debug
//   node scripts/ig-graph-token.mjs exchange --user-token <短期User トークン>
//   node scripts/ig-graph-token.mjs page-token [--print-token]
//
// トークン値は明示指定（--print-token / exchange の結果）以外は表示しない。
// exit code: 0 = 正常 / 1 = 引数不備・認証・ネットワーク失敗。

import { loadEnvLocal } from './lib/asset-storage.mjs';
import { createIgGraphClient } from './lib/ig-graph.mjs';

const TAG = '[ig-graph-token]';
const BASE = 'https://graph.facebook.com';
const API_VERSION = process.env.IG_GRAPH_API_VERSION || 'v23.0';

loadEnvLocal();

const [sub, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : null;
};

async function getJson(url) {
  const res = await fetch(url);
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || (body && body.error)) {
    const msg = (body && body.error && body.error.message) || `HTTP ${res.status}`;
    throw new Error(String(msg).slice(0, 300));
  }
  return body;
}

async function cmdDebug() {
  const token = process.env.IG_GRAPH_ACCESS_TOKEN;
  if (!token) {
    console.error(`${TAG} 環境変数 IG_GRAPH_ACCESS_TOKEN が未設定です`);
    process.exit(1);
  }
  const client = createIgGraphClient({ token, igUserId: 'unused', apiVersion: API_VERSION });
  const info = await client.debugToken();
  console.log(`${TAG} type=${info.type ?? '-'} expires_at=${info.expiresAt || '無期限'} data_access_expires_at=${info.dataAccessExpiresAt || '無期限'} scopes=${(info.scopes || []).join(',') || '-'}`);
}

async function cmdExchange() {
  const userToken = flag('--user-token');
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!userToken || !appId || !appSecret) {
    console.error(`${TAG} --user-token / 環境変数 META_APP_ID / META_APP_SECRET のいずれかが不足しています`);
    process.exit(1);
  }
  const url = `${BASE}/${API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(userToken)}`;
  const body = await getJson(url);
  // 長期トークンは stdout にだけ出す（ファイルへ書かない）。
  console.log(body.access_token);
}

async function cmdPageToken() {
  const printToken = rest.includes('--print-token');
  const token = process.env.IG_GRAPH_ACCESS_TOKEN;
  if (!token) {
    console.error(`${TAG} 環境変数 IG_GRAPH_ACCESS_TOKEN（長期 User トークン）が未設定です`);
    process.exit(1);
  }
  const url = `${BASE}/${API_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(token)}`;
  const body = await getJson(url);
  const pages = body.data || [];
  if (pages.length === 0) {
    console.log(`${TAG} ページが 0 件です（トークンのスコープ・権限を確認してください）`);
    return;
  }
  for (const p of pages) {
    const igId = p.instagram_business_account && p.instagram_business_account.id ? p.instagram_business_account.id : '(未連携)';
    const tokenLen = p.access_token ? p.access_token.length : 0;
    console.log(`${TAG} page id=${p.id} name=${p.name} instagram_business_account.id=${igId} pageTokenLength=${tokenLen}`);
    if (printToken && p.access_token) console.log(`  token=${p.access_token}`);
  }
}

if (sub === 'debug') await cmdDebug();
else if (sub === 'exchange') await cmdExchange();
else if (sub === 'page-token') await cmdPageToken();
else {
  console.error(`${TAG} usage: node scripts/ig-graph-token.mjs <debug|exchange --user-token <token>|page-token [--print-token]>`);
  process.exit(1);
}

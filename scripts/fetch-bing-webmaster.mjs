#!/usr/bin/env node
/**
 * fetch-bing-webmaster.mjs — Bing Webmaster Tools API から検索クエリ・ページ・日次トラフィックを取得する。
 *
 * なぜ: GA4 の Organic Search は bing が google の数十倍（2026-09 の 14 日で 2,683 対 82 users）で、
 * bot 混入の疑いを GA4 だけでは確かめられない。Bing 側の実クリック・表示と照合し、成長ダイジェストでは
 * google（GSC 突合）と bing を分けて扱う。
 *
 * 認証: 環境変数 BING_WEBMASTER_API_KEY（Bing Webmaster Tools → 設定 → API アクセス で発行し GitHub Secret へ）。
 * サイト: BING_SITE_URL（既定 https://doboku-note.com/。Bing に登録した URL と完全一致が必要）。
 *
 * Usage:
 *   node scripts/fetch-bing-webmaster.mjs            # 取得して書く
 *   node scripts/fetch-bing-webmaster.mjs --dry-run  # 取得だけ
 *
 * 出力: .claude/state/metrics/bing/bing-YYYY-MM-DD.json（直近 12 週のバケットだけを残す）
 * exit: 0 全取得 / 1 取得失敗あり（取れた分は書く）/ 2 検査不成立（キー未設定＝ファイルは書かない・0 と記録しない）
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { normalizeBing, redactKey } from './lib/bing-webmaster.mjs';
import { addDays, jst } from './lib/business-direction.mjs';

dotenv.config({ path: '.env.local', quiet: true });

const TAG = '[bing-webmaster]';
const OUT_DIR = '.claude/state/metrics/bing';
const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const ENDPOINTS = { query: 'GetQueryStats', page: 'GetPageStats', traffic: 'GetRankAndTrafficStats' };

async function main() {
  const key = process.env.BING_WEBMASTER_API_KEY;
  const siteUrl = process.env.BING_SITE_URL || 'https://doboku-note.com/';
  if (!key) {
    console.error(`${TAG} 検査不成立: BING_WEBMASTER_API_KEY が未設定（Bing Webmaster Tools → 設定 → API アクセスで発行し GitHub Secret へ登録）`);
    return 2;
  }
  const today = jst();
  const since = addDays(today, -84);
  const out = { schemaVersion: 1, siteUrl, fetchedAt: new Date().toISOString(), since, sections: {} };
  for (const [kind, method] of Object.entries(ENDPOINTS)) {
    const url = `${API}/${method}?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      const rows = normalizeBing(kind, JSON.parse(text), { since });
      out.sections[kind] = { ok: true, rows };
    } catch (e) {
      out.sections[kind] = { ok: false, error: redactKey(e?.message ?? e).slice(0, 300) };
    }
  }
  const entries = Object.entries(out.sections);
  const failed = entries.filter(([, s]) => !s.ok);
  for (const [kind, s] of entries) console.log(`${TAG} ${kind}: ${s.ok ? `${s.rows.length} 行` : `失敗 ${s.error}`}`);
  console.log(`${TAG} ${siteUrl} 区画 ${entries.length} 件中 取得 ${entries.length - failed.length} / 失敗 ${failed.length}（${since} 以降のバケット）`);
  if (failed.length === entries.length) return 1;
  if (!process.argv.includes('--dry-run')) {
    mkdirSync(OUT_DIR, { recursive: true });
    const file = join(OUT_DIR, `bing-${today}.json`);
    writeFileSync(file, `${JSON.stringify(out)}\n`);
    console.log(`${TAG} → ${file}`);
  }
  return failed.length ? 1 : 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (e) => { console.error(`${TAG} 失敗: ${redactKey(e?.stack ?? e)}`); process.exitCode = 1; },
);

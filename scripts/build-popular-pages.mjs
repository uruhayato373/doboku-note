#!/usr/bin/env node
/**
 * build-popular-pages.mjs
 *
 * 最新の GA4 ページ別スナップショット（.claude/state/metrics/ga4/ga4-page-*.json、
 * CI が `npm run fetch-ga4-data -- --dimension page` で取得・コミット）を読み、
 * 正規公開 URL（および移行期間中の旧 /docs URL）の記事を activeUsers 降順に並べた
 * `src/config/popular-pages.json` を生成する。
 *
 * 用途: カテゴリ hub の「よく読まれている記事」特集＋サイドバー人気ランキング。
 * 設計方針: app は .claude/state（zone C 機械データ）を直接読まず、ビルド時に distill した
 * src/config の JSON を読む（refresh-indexes と同じ作法・data-storage-decision ADR 準拠）。
 *
 * スナップショットが無い/壊れている場合は空データを書いて exit 0（ビルドを止めない）。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { slugFromKey } from './lib/url-normalization.mjs';

const GA4_DIR = join(process.cwd(), '.claude', 'state', 'metrics', 'ga4');
const OUT = join(process.cwd(), 'src', 'config', 'popular-pages.json');

/** 最新の ga4-page-*.json（ファイル名のタイムスタンプ順）を返す。無ければ null。 */
function latestPageSnapshot() {
  let files;
  try {
    files = readdirSync(GA4_DIR).filter((f) => f.startsWith('ga4-page-') && f.endsWith('.json'));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  files.sort(); // ga4-page-YYYY-MM-DDThh-mm-ss.json は辞書順 = 時系列順
  return join(GA4_DIR, files[files.length - 1]);
}

function build() {
  const snapshot = latestPageSnapshot();
  const empty = { window: null, generatedFrom: null, pages: [] };

  if (!snapshot) {
    writeFileSync(OUT, JSON.stringify(empty, null, 2) + '\n');
    console.log('[build-popular-pages] ga4-page スナップショット無し → 空データを書き出し');
    return;
  }

  let data;
  try {
    data = JSON.parse(readFileSync(snapshot, 'utf8'));
  } catch {
    writeFileSync(OUT, JSON.stringify(empty, null, 2) + '\n');
    console.log('[build-popular-pages] スナップショット parse 失敗 → 空データを書き出し');
    return;
  }

  const rows = Array.isArray(data.rows) ? data.rows : [];
  const pages = rows
    .map((r) => ({
      slug: typeof r.page === 'string' ? slugFromKey(r.page) : null,
      activeUsers: Math.round(Number(r.activeUsers) || 0),
      sessions: Math.round(Number(r.sessions) || 0),
    }))
    .filter((p) => typeof p.slug === 'string' && p.slug.length > 0)
    .sort((a, b) => b.activeUsers - a.activeUsers);

  const out = {
    window: data.meta ? { start: data.meta.startDate ?? null, end: data.meta.endDate ?? null } : null,
    generatedFrom: basename(snapshot),
    pages,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`[build-popular-pages] ${pages.length} 件の公開記事を ${out.generatedFrom} から生成`);
}

build();

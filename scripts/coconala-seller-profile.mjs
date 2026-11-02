#!/usr/bin/env node
/**
 * coconala-seller-profile.mjs — ココナラの公開プロフィールから「評価: N件」を読み、日付つきで data/coconala/seller-profile.json に残す（DN-0943）。
 * ログインは要らない（公開ページ）。読み手は チャネル設計の KPI「評価の数」（scripts/lib/channel-economics.mjs）。土曜のココナラの段（coconala-local-routine）が回す。
 *
 *   node scripts/coconala-seller-profile.mjs             取得して台帳に書く（同じ日は置き換え）
 *   node scripts/coconala-seller-profile.mjs --dry-run   取得して表示だけ
 * 終了コード: 0 = 成功 / 1 = ページは取れたが評価の数を読めない（ページの形が変わった） / 2 = ページを取れない（検査不成立）
 */
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { isCliEntry } from './lib/cli-run.mjs';

const DRY = process.argv.includes('--dry-run');
const TAG = '[coconala-seller-profile]';

/** 公開プロフィールの HTML から評価の数を読む（meta の説明文の「評価: N件」）。読めなければ null */
export function parseRatingCount(html) {
  const m = String(html).match(/評価:\s*([0-9,]+)\s*件/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

function main() {
  const { profileUrl } = readDataset(REPO_ROOT, 'config.coconala-account');
  let html = '';
  try {
    html = execFileSync('curl', ['-sS', '--ssl-no-revoke', '-m', '40', '-A', 'Mozilla/5.0', profileUrl], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    console.error(`${TAG} 検査不成立: 公開プロフィールを取れない（${String(e.message).split('\n')[0]}）`);
    process.exit(2);
  }
  const ratingCount = parseRatingCount(html);
  if (ratingCount == null) {
    console.error(`${TAG} ✗ ページは取れたが「評価: N件」が見つからない（ページの形が変わった可能性）: ${profileUrl}`);
    process.exit(1);
  }
  const date = todayJst();
  console.log(`${TAG} 評価 ${ratingCount} 件（${date}）`);
  if (DRY) return;
  const prev = readDatasetIf(REPO_ROOT, 'coconala.seller-profile');
  const rows = [...(prev?.rows ?? []).filter((r) => r.date !== date), { date, ratingCount, fetchedAt: new Date().toISOString() }].sort((a, b) => a.date.localeCompare(b.date));
  writeDataset(REPO_ROOT, 'coconala.seller-profile', { schemaVersion: 1, profileUrl, rows });
}

if (isCliEntry(import.meta.url)) main();

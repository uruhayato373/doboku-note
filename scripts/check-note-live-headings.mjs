#!/usr/bin/env node
/**
 * check-note-live-headings.mjs — note 公開記事の live 本文整合性 横断検査（3検査）
 *
 * SoT（content/note/⋆⋆/article.md frontmatter noteStatus=published）の全記事について
 * note public API で live 本文を取得し、次の破損を検出する:
 *   (1) URL 見出し   — <h1-6> 内に URL（cardify グリッチ・目次に URL 露出。2026-07-14 発覚）
 *   (2) 空引用       — 中身空の <blockquote>（複数行 blockquote が paste 脱落した痕跡）
 *   (3) 画像欠落     — live <img> 数 < SoT 期待枚数（本文画像が除去されて載らない。2026-07-15 発覚）
 *   (4) 見出し食い違い — 原稿の見出し（note で h2 になる # / ##）とライブの h2 が一致しない
 *                       （冒頭 CTA の部分更新で CTA 文が見出しになり、直後の見出しが割れた。2026-09-23 発覚）
 *   (5) 太字記号     — ライブ本文に ** が記号のまま残る（太字にならなかった強調。2026-09-23 発覚）
 *   (6) 画像過多     — live <img> 数 > SoT 期待枚数（同じ画像行の重複が live に残る。2026-09-24 追加）
 *   (7) リンク切れ   — ライブ本文のサイト内リンクが存在しないページを指す（404。2026-09-24 追加）
 *   (4)〜(7) は再公開台帳と本文ハッシュが一致する記事（301 等価＝旧 /docs → 新 URL の張り替えだけの記事を含む）
 *   だけを見る。原稿を直して未再公開の記事は
 *   ライブが古いのが正常で、そちらは check-note-republish（同じ週次ジョブ）が要再公開として出す。
 *
 * SoT 期待画像数 = 本文の `![](...)` 行数（frontmatter/コメント除く）。有料記事は API 本文が
 * paywall で切断されるため「有料境界より前の画像のみ」を期待値とし、境界が SoT に無い有料は
 * 画像検査を skip（PARTIAL 表示）。
 *
 * 使い方:
 *   npm run check-note-live-headings              # 全 published を検査（並列8・約1分）
 *   node scripts/check-note-live-headings.mjs 共通 # パス部分一致で絞り込み
 *   node scripts/check-note-live-headings.mjs --paths  # BAD の article.md パスのみ出力（修復list生成用）
 *
 * 終了コード: BAD 1件以上 → exit 1。FETCH_ERR は WARN 扱い（ネットワーク偽陰性と区別）。
 * 真実源: .claude/knowledge/reference/note-api-verification.md「live 本文整合性検査」
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchNoteBody, findUrlHeadings, countEmptyBlockquotes, countImgs, sotH2s, liveH2s, diffHeadings, findLiteralStars, findBrokenSiteLinks, stripHtmlComments } from './lib/note-live-check.mjs';
import { bodyHash, canonBodyHash, loadState } from './lib/note-republish-hash.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawArgs = process.argv.slice(2);
const PATHS_ONLY = rawArgs.includes('--paths');
const FILTER = rawArgs.find((a) => !a.startsWith('--')) || '';
const CONCURRENCY = 8;

function walk(dir, acc) {
  for (const c of readdirSync(dir)) {
    const p = join(dir, c);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    // 型別ファイル（article-<型>.md）を落とさない。固定名だと建設部門の大半が
    // 最初から対象外になり「検査したつもり」になる（2026-08-13 に verify-note-status で
    // 同じ欠陥が 195 本を無検査にしていた）。
    else if (/^article(-[^/\\]+)?\.md$/.test(c)) acc.push(p);
  }
  return acc;
}

// SoT から期待画像数を導出（有料は境界より前のみ）。境界不明の有料は null（画像検査 skip）。
function expectedImagesOf(raw) {
  const fm = raw.startsWith('---') ? raw.split('---')[1] || '' : '';
  const isPaid = /notePricing:\s*"?paid"?/.test(fm);
  const boundary = (fm.match(/paidBoundary:\s*"?(.+?)"?\s*$/m) || [])[1] || '試験問題|予想問題';
  let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '').replace(/<!--[\s\S]*?-->\r?\n?/g, '');
  const lines = body.split('\n');
  const isImg = (l) => /^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(l) && !/^\s*!\[[^\]]*\]\(https?:/.test(l);
  if (!isPaid) return lines.filter(isImg).length;
  const bre = new RegExp('^##\\s+(' + boundary + ')');
  const bIdx = lines.findIndex((l) => bre.test(l.trim()));
  if (bIdx < 0) return null; // 境界不明の有料＝機械検証不能（PARTIAL）
  return lines.slice(0, bIdx).filter(isImg).length;
}

// 見出し比較の上限行（有料は公開 API が有料境界の手前しか返さない）。境界不明の有料は null（比較しない）。
function headingLimitOf(raw) {
  const fm = raw.startsWith('---') ? raw.split('---')[1] || '' : '';
  const md = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
  if (!/notePricing:\s*"?paid"?/.test(fm)) return { md, limit: Infinity };
  const boundary = (fm.match(/paidBoundary:\s*"?(.+?)"?\s*$/m) || [])[1] || '試験問題|予想問題';
  const bre = new RegExp('^##\\s+(' + boundary + ')');
  const idx = stripHtmlComments(md).split('\n').findIndex((l) => bre.test(l.trim()));
  return { md, limit: idx < 0 ? null : idx };
}

const ledger = loadState();
const republished = ledger.hashes || {};
const canonLedger = ledger.canonHashes || {};
const targets = [];
let reserved = 0;
let driftSkipped = 0;
for (const f of walk(join(ROOT, 'content/note'), [])) {
  if (FILTER && !f.includes(FILTER)) continue;
  const raw = readFileSync(f, 'utf8');
  if (!raw.startsWith('---')) continue;
  const fm = raw.split('---')[1] || '';
  // 公開判定は「noteUrl 非空 OR noteStatus に publish」（check-note-3set / check-note-boundary と同一）。
  // 2026-07-31: `noteStatus: published` を必須にしていたため、この行を持たない公開済み記事
  // 351 本（建設部門208・総監107・土木28・コンクリート診断士8）を無言でスキップし、
  // 698 本中 347 本しか検査していなかった。CLAUDE.md §9「検査ゼロを PASS と呼ばない」の同型。
  if (!/^noteUrl:\s*\S/m.test(fm) && !/noteStatus:.*publish/.test(fm)) continue;
  // 予約投稿（noteStatus: reserved）は noteUrl/noteId の書き戻しがあっても go-live 前で、
  // 公開 API は本文を返さない（画像 0 で必ず BAD になる偽赤・2026-09-17 の W8〜W11 予約で実発生）。
  // go-live 後は verify-note-status --fix が published に是正するので、そこから検査に入る。
  if (/^noteStatus:\s*reserved\b/m.test(fm)) { reserved++; continue; }
  const m = fm.match(/noteId:\s*"?(n[0-9a-f]{12})"?/);
  if (!m) continue;
  const path = f.slice(ROOT.length + 1).replaceAll('\\', '/');
  // 301 等価（記録時の版との差分が旧 /docs → 新 URL の張り替えだけ）の記事も、live は記録時の本文のまま。
  // ここで外すと再公開しない限り永久に (4)〜(7) の対象外になる（2026-09-24 の 546 本）
  const rec = republished[path];
  const canon = canonLedger[path];
  const inSync = rec === bodyHash(raw) || (!!canon && canon.of === rec && canon.canon === canonBodyHash(raw));
  if (!inSync) driftSkipped++;
  const { md, limit } = headingLimitOf(raw);
  targets.push({ noteId: m[1], path, expectedImgs: expectedImagesOf(raw), sotHeadings: inSync && limit != null ? sotH2s(md, limit) : null, inSync });
}
if (!PATHS_ONLY) {
  console.log(`[check-note-live-headings] published ${targets.length} 件を検査（予約中 ${reserved} 件は go-live 前のため対象外）`);
  console.log(`  見出し・太字記号・画像過多・リンク切れの検査は再公開台帳と一致する ${targets.length - driftSkipped} 件（301 等価を含む・要再公開 ${driftSkipped} 件はライブが古いのが正常なので除外）`);
}

async function check({ noteId, path, expectedImgs, sotHeadings, inSync }) {
  const { body, error, unmeasurable } = await fetchNoteBody(noteId, { retries: 2, delayMs: 2000 });
  if (error) return { noteId, path, status: 'FETCH_ERR', labels: [], err: error.slice(0, 50) };
  // 未ログインで中身が返らない記事（メンバーシップ限定等）は body='' なので、そのまま検査すると
  // 存在する画像を「画像欠落 live=0/sot=N」と誤診する（2026-07-30 に3件の phantom を実証）。
  if (unmeasurable) return { noteId, path, status: 'UNMEASURABLE', labels: [], urlH: [] };
  const urlH = findUrlHeadings(body);
  const emptyBq = countEmptyBlockquotes(body);
  const imgLive = countImgs(body);
  const labels = [];
  if (urlH.length) labels.push(`[URL見出し ${urlH.length}]`);
  if (emptyBq) labels.push(`[空引用 ${emptyBq}]`);
  const partial = expectedImgs == null;
  if (!partial && imgLive < expectedImgs) labels.push(`[画像欠落 live=${imgLive}/sot=${expectedImgs}]`);
  const details = [...urlH];
  if (sotHeadings) {
    const { missing, extra } = diffHeadings(sotHeadings, liveH2s(body));
    if (missing.length || extra.length) {
      labels.push(`[見出し食い違い 欠落${missing.length}/余分${extra.length}]`);
      for (const h of missing) details.push(`欠落: ${h.slice(0, 60)}`);
      for (const h of extra) details.push(`余分: ${h.slice(0, 60)}`);
    }
  }
  if (inSync) {
    const stars = findLiteralStars(body);
    if (stars.length) {
      labels.push(`[太字記号 ${stars.length}]`);
      details.push(...stars.slice(0, 3).map((x) => `記号: ${x}`));
    }
    if (!partial && imgLive > expectedImgs) labels.push(`[画像過多 live=${imgLive}/sot=${expectedImgs}]`);
    const broken = findBrokenSiteLinks(body);
    if (broken.length) {
      labels.push(`[リンク切れ ${broken.length}]`);
      details.push(...broken.slice(0, 3).map((x) => `404: ${x}`));
    }
  }
  return { noteId, path, status: labels.length ? 'BAD' : (partial && expectedImgs !== 0 ? 'PARTIAL' : 'OK'), labels, urlH: details };
}

const results = [];
for (let i = 0; i < targets.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(targets.slice(i, i + CONCURRENCY).map(check))));
}

const bad = results.filter((r) => r.status === 'BAD');
const errs = results.filter((r) => r.status === 'FETCH_ERR');
const partials = results.filter((r) => r.status === 'PARTIAL');
const unmeas = results.filter((r) => r.status === 'UNMEASURABLE');

if (PATHS_ONLY) {
  for (const r of bad) console.log(r.path);
  process.exit(bad.length ? 1 : 0);
}

for (const r of bad) {
  console.error(`  BAD ${r.noteId} ${r.path} ${r.labels.join(' ')}`);
  if (r.urlH.length) console.error(`      ${r.urlH.join('\n      ')}`);
}
if (partials.length) console.log(`  PARTIAL: 有料で境界不明のため画像検査skip ${partials.length} 件（paywall で機械検証不能）`);
if (unmeas.length) {
  console.log(`  UNMEASURABLE: 未ログイン API が中身を返さない ${unmeas.length} 件（メンバーシップ限定等・不整合ではない）: ${unmeas.slice(0, 3).map((r) => r.noteId).join(', ')}${unmeas.length > 3 ? '…' : ''}`);
  console.log('    実体は著者ログインで確認する（詳細は .claude/knowledge/reference/note-api-verification.md）。');
}
if (errs.length) console.log(`  WARN: FETCH_ERR ${errs.length} 件（ネットワーク未達・再実行かプロキシ外で確認）: ${errs.slice(0, 3).map((r) => r.noteId).join(', ')}${errs.length > 3 ? '…' : ''}`);

if (bad.length) {
  console.error(`[check-note-live-headings] ✗ live 本文に不整合 ${bad.length} 件（URL見出し/空引用/画像欠落/見出し食い違い/太字記号/画像過多/リンク切れ）。修復: node scripts/note-update-body.mjs --article <path> --commit`);
  process.exit(1);
}

// 検査不成立を PASS にしない: 取得できていないなら「不整合なし」ではなく「検査できていない」。
// （2026-07-28 まで、全件 FETCH_ERR でも「✓ 0 件検査・不整合なし」と出て緑になっていた）
const failRate = targets.length ? errs.length / targets.length : 0;
if (targets.length > 0 && failRate > 0.2) {
  console.error(`\n[check-note-live-headings] ✗ 検査不成立: ${targets.length}本中${errs.length}本が取得失敗（${Math.round(failRate * 100)}%）`);
  console.error('  live を取得できていないため「不整合なし」は成立しない。curl が使えるか・プロキシ env・レート制限を確認する。');
  process.exit(1);
}
console.log(`[check-note-live-headings] ✓ ${results.length - errs.length - unmeas.length} 件検査・不整合なし${partials.length ? `（PARTIAL ${partials.length}）` : ''}${unmeas.length ? `（計測不能 ${unmeas.length}）` : ''}${errs.length ? `（未達 ${errs.length} 件は要再実行）` : ''}`);

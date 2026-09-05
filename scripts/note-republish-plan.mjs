#!/usr/bin/env node
/**
 * note-republish-plan.mjs — DN-0003（note ライブ反映の一括消化）の投入対象を毎回作り直す。
 *
 * 背景: `check-note-republish --json` の driftFiles をそのまま `note-update-body --list` に
 *   流すと、画像持ち（CDN 確定失敗で 4 割 ABORT）と PDF 配布記事（ローカルに実体が無ければ
 *   fail-closed で中断）が投入バッチに混ざり、失敗率が上がって 3 連続失敗の安全弁に
 *   すぐ引っかかる。2026-08-25 にこの分類を `.tmp` へ 2 回書き捨てていた
 *   （前日ぶんが残っていない・DN-0003 カードの「対象は毎回 --json から再生成する」を
 *   毎回スクリプトごと再実装していた）ので、分類ロジックを永続化する。
 *
 * 分類（投入する順に優先度が高い）:
 *   ready        画像なし・PDF 配布の約束なし・会員限定でない → そのまま投入できる
 *   pdfMissing   画像なし・PDF 配布を約束・ローカルに実体なし → drive-vault-sync --pull か spec 再生成が先
 *   pdfReady     画像なし・PDF 配布を約束・ローカルに実体あり → --reattach-pdf 付きで投入できる
 *   hasImage     画像あり → DN-0009（CDN 確定失敗）の決着待ち
 *   membership   会員限定 → 公開範囲の扱いが別（このツールでは対象外のまま報告のみ）
 *   aborted      中断台帳に記録あり → バッチに混ぜず単独 --force-retry 枠
 *
 * Usage:
 *   node scripts/note-republish-plan.mjs                     # 分類件数のレポートのみ
 *   node scripts/note-republish-plan.mjs --out list.txt       # ready を書き出す（既定 100 件上限）
 *   node scripts/note-republish-plan.mjs --out list.txt --limit 50
 *   node scripts/note-republish-plan.mjs --json
 * exit: 0 常に（レポートツール。承認前提の投入は note-update-body 側の責務）
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { parseNoteArticle } from './lib/note-frontmatter.mjs';

const NAME = 'note-republish-plan';
const ABORT_LEDGER = '.claude/state/note-update-aborted.json';

/**
 * 記事1本の投入バケットを決める（優先順位はファイル冒頭コメントの分類表と同じ:
 * unreadable(呼び出し側で判定) > aborted > membership > hasImage > pdf系(pdfReady/pdfMissing) > ready）。
 * parseNoteArticle() の返り値と、中断台帳から作った noteId の Set を受け取る純関数。
 * テスト（tests/note-republish-classify.test.mjs）から直接呼べるよう export する。
 *
 * pdf系は「a.pdfPromise（本文が PDF 配布を約束している）」だけでなく
 * 「a.localPdfs.length > 0（記事ディレクトリに実際に PDF がある）」でも該当させる。
 * DN-0147: 本文の言い回しが PDF_PROMISE_RE のどの signature にも一致しなくても、
 * PDF 実体があるなら「PDF 付き」として扱い、画像なし記事と同じ ready 扱いで
 * 一括バッチに混ぜない（--reattach-pdf 抜きで投入すると添付が失われる）。
 * @param {ReturnType<typeof parseNoteArticle>} a
 * @param {Set<string>} abortedSet
 * @returns {'aborted'|'membership'|'hasImage'|'pdfReady'|'pdfMissing'|'ready'}
 */
export function classifyArticle(a, abortedSet) {
  if (a.noteId && abortedSet.has(a.noteId)) return 'aborted';
  if (a.isMembership) return 'membership';
  if (a.imageCount > 0) return 'hasImage';
  if (a.pdfPromise || a.localPdfs.length > 0) return a.localPdfs.length ? 'pdfReady' : 'pdfMissing';
  return 'ready';
}

// import 時に CLI を走らせない（テストから classifyArticle を使うため）。
// ガードが無いと、この下の execFileSync / process.exit がテスト実行そのものを殺す。
const isMain = process.argv[1] && process.argv[1].endsWith('note-republish-plan.mjs');

function main() {
  const argv = process.argv.slice(2);
  const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  const OUT = arg('--out');
  const LIMIT = Number(arg('--limit', '100')) || 100;
  const JSON_OUT = argv.includes('--json');

  let report;
  try {
    const out = execFileSync('node', ['scripts/check-note-republish.mjs', '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    report = JSON.parse(out);
  } catch (e) {
    console.error(`[${NAME}] FAIL: check-note-republish --json の実行に失敗: ${e.message.split('\n')[0]}`);
    process.exit(1);
  }
  const driftFiles = report.driftFiles || [];
  if (driftFiles.length === 0) {
    console.log(`[${NAME}] drift 0 件。投入対象なし。`);
    process.exit(0);
  }

  const aborted = new Set();
  if (existsSync(ABORT_LEDGER)) {
    try { for (const a of JSON.parse(readFileSync(ABORT_LEDGER, 'utf8')).aborted || []) aborted.add(a.noteId); } catch { /* 台帳が壊れていても分類は続ける */ }
  }

  const buckets = { ready: [], pdfMissing: [], pdfReady: [], hasImage: [], membership: [], aborted: [], unreadable: [] };
  for (const rel of driftFiles) {
    const p = rel.replace(/\\/g, '/');
    let a;
    try { a = parseNoteArticle(p); } catch { buckets.unreadable.push(p); continue; }
    buckets[classifyArticle(a, aborted)].push(a);
  }

  const byExam = (list) => {
    const out = {};
    for (const a of list) { const e = a.path.split('/')[2] || '?'; out[e] = (out[e] || 0) + 1; }
    return out;
  };

  if (JSON_OUT) {
    const shape = (list) => list.map((a) => ({ path: a.path, noteId: a.noteId, price: a.price }));
    console.log(JSON.stringify({
      drift: driftFiles.length,
      ready: shape(buckets.ready), pdfMissing: shape(buckets.pdfMissing), pdfReady: shape(buckets.pdfReady),
      hasImage: buckets.hasImage.length, membership: buckets.membership.length,
      aborted: buckets.aborted.map((a) => a.noteId), unreadable: buckets.unreadable,
    }, null, 2));
  } else {
    console.log(`[${NAME}] drift ${driftFiles.length} 件（うち読めず ${buckets.unreadable.length}）`);
    console.log(`  ready（投入可能）      ${buckets.ready.length}  ${JSON.stringify(byExam(buckets.ready))}`);
    console.log(`  pdfReady（要 --reattach-pdf） ${buckets.pdfReady.length}`);
    console.log(`  pdfMissing（実体なし・要 hydrate/再生成） ${buckets.pdfMissing.length}`);
    console.log(`  hasImage（DN-0009 待ち） ${buckets.hasImage.length}`);
    console.log(`  membership（対象外・報告のみ） ${buckets.membership.length}`);
    console.log(`  aborted（中断台帳あり・単独 --force-retry 枠） ${buckets.aborted.length}`);
    for (const a of buckets.aborted) console.log(`    ${a.noteId}  ${a.path}`);
    if (buckets.unreadable.length) { console.log('  読めなかったファイル:'); for (const p of buckets.unreadable) console.log(`    ${p}`); }
  }

  if (OUT) {
    const batch = buckets.ready.slice(0, LIMIT);
    writeFileSync(OUT, `${batch.map((a) => a.path).join('\n')}\n`, 'utf8');
    console.log(`\n[${NAME}] ready ${batch.length} 件（上限 ${LIMIT}）→ ${OUT}`);
    if (batch.length < buckets.ready.length) console.log(`  残り ${buckets.ready.length - batch.length} 件は次回 --out で続けて出す`);
  }
}

if (isMain) main();

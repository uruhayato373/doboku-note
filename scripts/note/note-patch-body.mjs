#!/usr/bin/env node
/**
 * note-patch-body.mjs — 公開済みの note 記事を、本文を消さずに指定した箇所だけ書き換えて更新する。
 *
 * なぜ要るか: note-update-body は本文を全部消して貼り直すため、原稿に無い PDF 添付のカードが消え、貼り直しに
 * 失敗すると購入者が PDF を受け取れない事故が続いた（2026-07-28・07-31 ほか）。見出しの言い換えのような小さな
 * 修正はここで流し、添付・画像・リンクカード・有料境界・試し読みラインには触らない（lib/note-editor-patch.mjs）。
 *
 * 使い方:
 *   node scripts/note/note-patch-body.mjs --patches .tmp/note-patches/<名前>.json            # 確認だけ（既定・保存しない）
 *   node scripts/note/note-patch-body.mjs --patches <file> --commit [--max 50] [--only <パスの先頭>]
 *   npm run note-patch-body -- --patches <file> --commit
 * 入力: { "items": [{ "article": "content/note/…/article.md", "baseHash": "<直す前の bodyHash>", "afterHash": "<直した後>", "ops": [...] }] }
 *   作るのは scripts/maint/fix-note-grader-claims.mjs（原稿を直すのと同時に書き出す）。
 * 1 記事の流れ: 著者として API を読む（公開されていない下書きがあれば飛ばす）→ 編集画面を開く → 前提の確認（置き換える文の数が原稿の旧版と同じ）→ 書き換え →
 *   添付・画像・埋め込みの数が変わっていないか確認 → 境界を動かさずに「更新する」→ 編集画面を開き直し、著者として API の本文（有料部分を含む）でも確かめる。
 *   前提が合わない記事は触らずに飛ばす（理由を結果ファイルに残す）。書き換え後の確認で外れたら保存せずに止める。
 * 台帳: 直す前の原稿が公開ページと同じだった記事（台帳のハッシュ＝baseHash）で、原稿が afterHash のままのときだけ
 *   再公開ハッシュを記録する。それ以外は「未反映」のまま残し、週次の同期に任せる。
 * 結果: .tmp/note-patch-results-<日時>.json（成功・飛ばし・失敗と理由）。
 * exit: 0 = 失敗なし（飛ばしはあってよい）/ 1 = 失敗あり・連続失敗で中断 / 2 = ログインのアカウント違い
 * 罠: 保存したあとに確認で外れた記事は、公開ページが書き換わっている。結果ファイルの failedAfterSave を人が見る。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from '../lib/repository-paths.mjs';
import { launchNoteContext, assertAccountGate } from '../lib/note-browser.mjs';
import { publishLive } from '../lib/note-live-publish.mjs';
import { assertLiveBody, formatLiveIssues } from '../lib/note-live-check.mjs';
import { bodyHash, loadState, recordPublishedHash } from '../lib/note-republish-hash.mjs';
import { alreadyApplied, applyOps, htmlCounts, invariantProblems, liveHtmlProblems, planProblems, readBlocks, snapshotEditor, verifyProblems } from '../lib/note-editor-patch.mjs';
import { sleep } from '../lib/sleep.mjs';

const args = parseCliArgs({
  patches: { type: 'string' },
  commit: { type: 'boolean' },
  max: { type: 'string' },
  only: { type: 'string' },
  'max-consecutive-fail': { type: 'string' },
}, process.argv.slice(2));
if (!args.patches) { console.error('--patches <file> が要る'); process.exit(2); }
const MAX = Number(args.max || 50);
const MAX_CONSEC = Number(args.maxConsecutiveFail || 3);

const input = JSON.parse(readFileSync(join(ROOT, args.patches), 'utf8'));
const items = (input.items || []).filter((it) => !args.only || it.article.startsWith(args.only)).slice(0, MAX);
console.log(`[patch] 対象 ${items.length} 記事（入力 ${input.items?.length ?? 0}・上限 ${MAX}）${args.commit ? '' : '・確認だけ（保存しない）'}`);
if (!items.length) { console.log('[patch] 対象 0 件（何もしない）'); process.exit(0); }

function frontmatter(raw) {
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const f = (k) => (fm.match(new RegExp(`^${k}:\\s*["']?(.*?)["']?\\s*$`, 'm')) || [])[1] || '';
  return { noteId: f('noteId') || (f('noteUrl').match(/\/n\/([0-9a-z]+)/) || [])[1] || '', pricing: f('notePricing') };
}

/** 著者として API を読む（会員限定・有料の部分も入った本文と、公開されていない下書きの有無）。 */
async function readAsAuthor(noteId) {
  try {
    const r = await ctx.request.get(`https://note.com/api/v3/notes/${noteId}`, { timeout: 30000 });
    if (!r.ok()) return null;
    const d = (await r.json())?.data;
    return d ? { body: d.body || '', hasDraft: !!d.has_draft } : null;
  } catch { return null; }
}

async function openEditor(page, noteId) {
  await page.goto(`https://editor.note.com/notes/${noteId}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
  await sleep(4000);
}

const results = { startedAt: new Date().toISOString(), commit: !!args.commit, ok: [], already: [], skipped: [], failed: [], failedAfterSave: [] };
const ctx = await launchNoteContext();
let consec = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  const gate = await assertAccountGate(page);
  if (!gate.ok) { console.error('ABORT: アカウントが dobokunote ではない'); process.exit(2); }

  for (const it of items) {
    const raw = readFileSync(join(ROOT, it.article), 'utf8');
    const { noteId, pricing } = frontmatter(raw);
    const isPaid = pricing === 'paid';
    const tag = `[${noteId}]`;
    console.log(`\n${tag} ${it.article.replace('content/note/', '')}`);
    try {
      if (!/^n[0-9a-f]{6,}$/.test(noteId)) { results.skipped.push({ article: it.article, reason: 'noteId が無い（未公開）' }); continue; }
      // 公開されていない下書きがあると、エディタは公開版ではなく下書きを開く。下書きの上で書き換えて「更新する」を
      // 押すと、下書きの中身（全文置換が途中で止まった本文など）が公開される。2026-11-28 に 2 本で、画像やリンク
      // カードが欠けた下書きが残っていた。下書きのある記事は触らない。
      const pre = await readAsAuthor(noteId);
      if (!pre) throw new Error('著者として記事を読めない（ログイン切れ・通信）');
      if (pre.hasDraft) { console.log(`${tag} 公開されていない下書きがある → 触らずに飛ばす`); results.skipped.push({ article: it.article, reason: 'has_draft（公開されていない下書きがある）' }); consec = 0; continue; }
      if (!liveHtmlProblems(it.ops, pre.body).length) { console.log(`${tag} 公開本文はすでに直っている → 飛ばす`); results.already.push({ article: it.article }); consec = 0; continue; }
      await openEditor(page, noteId);
      const blocks = await readBlocks(page);
      if (!blocks.length) throw new Error('エディタの本文を読めない');
      if (alreadyApplied(it.ops, blocks)) { console.log(`${tag} すでに反映済み → 飛ばす`); results.already.push({ article: it.article }); consec = 0; continue; }
      const planBad = planProblems(it.ops, blocks);
      if (planBad.length) { console.log(`${tag} 前提が合わない → 触らずに飛ばす: ${planBad.join(' / ')}`); results.skipped.push({ article: it.article, reason: planBad.join(' / ') }); consec = 0; continue; }
      if (!args.commit) { console.log(`${tag} 確認 OK（--commit で書き換える）`); results.ok.push({ article: it.article, dryRun: true }); continue; }

      const before = await snapshotEditor(page);
      const applied = await applyOps(page, it.ops, { tag });
      if (!applied.ok) throw new Error(`書き換えられない: ${applied.reason}`);
      await sleep(1500);
      const after = await snapshotEditor(page);
      const bad = [...verifyProblems(it.ops, await readBlocks(page)), ...invariantProblems(before, after)];
      if (bad.length) throw new Error(`書き換え後の確認で外れた（保存しない）: ${bad.join(' / ')}`);

      if (!(await publishLive(page, noteId, undefined, isPaid, { preserveLines: true, screenshotPrefix: 'np' }))) throw new Error('「更新する」まで進めない（保存していない可能性が高い。スクショ .tmp/np-*）');

      // 公開された版を開き直して確かめる（有料部分も著者のエディタなら読める）
      await sleep(3000);
      await openEditor(page, noteId);
      const liveBlocks = await readBlocks(page);
      const liveSnap = await snapshotEditor(page);
      const postBad = [...verifyProblems(it.ops, liveBlocks), ...invariantProblems(before, liveSnap)];
      const post = await readAsAuthor(noteId);
      if (!post) postBad.push('更新後に著者として記事を読めない');
      else {
        postBad.push(...liveHtmlProblems(it.ops, post.body));
        if (post.hasDraft) postBad.push('更新後も下書きが残っている');
        const a = htmlCounts(pre.body); const b = htmlCounts(post.body);
        if (a.pdf !== b.pdf || a.img !== b.img || a.figure !== b.figure) postBad.push(`公開本文の添付・画像・埋め込みが変わった（pdf ${a.pdf}→${b.pdf}・img ${a.img}→${b.img}・figure ${a.figure}→${b.figure}）`);
      }
      const chk = await assertLiveBody(noteId, { paid: isPaid });
      if (!chk.fetchError && !chk.ok) postBad.push(`公開本文の検査: ${formatLiveIssues(chk, null)}`);
      if (postBad.length) {
        console.error(`${tag} FAIL（保存後）: ${postBad.join(' / ')}`);
        results.failedAfterSave.push({ article: it.article, noteId, reason: postBad.join(' / ') });
        break; // 保存後の外れは系統的な原因を疑い、残りを流さない
      }
      const st = loadState();
      const recorded = st.hashes?.[it.article] === it.baseHash && bodyHash(readFileSync(join(ROOT, it.article), 'utf8')) === it.afterHash
        && recordPublishedHash(it.article);
      console.log(`${tag} OK（添付 ${liveSnap.attachments.length}・画像 ${liveSnap.images}・埋め込み ${liveSnap.embeds} は変わらず）${recorded ? '・再公開ハッシュを記録' : '・台帳は未反映のまま（直す前から未反映の変更がある）'}`);
      results.ok.push({ article: it.article, noteId, recorded: !!recorded });
      consec = 0;
    } catch (e) {
      console.error(`${tag} FAIL: ${e.message.split('\n')[0]}`);
      results.failed.push({ article: it.article, noteId, reason: e.message.split('\n')[0] });
      if (++consec >= MAX_CONSEC) { console.error(`[ABORT] ${MAX_CONSEC} 本続けて失敗したので残りを流さない`); break; }
    }
  }
} finally {
  await ctx.close().catch(() => {});
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  const out = join(ROOT, `.tmp/note-patch-results-${results.startedAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
  console.log(`\n[patch] 成功 ${results.ok.length}・反映済み ${results.already.length}・飛ばし ${results.skipped.length}・失敗 ${results.failed.length}・保存後の失敗 ${results.failedAfterSave.length}（${out.replace(ROOT + '/', '')}）`);
}
process.exit(results.failed.length || results.failedAfterSave.length ? 1 : 0);

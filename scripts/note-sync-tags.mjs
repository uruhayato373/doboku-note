#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
// note-sync-tags.mjs — 公開済み note 記事に hashtags.txt のタグ差分だけを追加する（本文非破壊）。
//
// note-update-body（本文専用・タグ非適用）に対し、これはタグ専用。本文・有料境界・PDFカードには
// 一切触らない。公開API `hashtag_notes` で live タグを読み、hashtags.txt との差分（不足分）のみ
// 公開設定ページのハッシュタグ入力へ追加 →（有料は境界保持／メンバーシップは試し読みフロー）→
// 更新する → 通知いいえ → API 実体検証 → tag hash を in-sync 化（check-note-republish のタグdrift解消）。
//
// 使い方:
//   node scripts/note-sync-tags.mjs --article <path>            # dry-run（不足タグ表示のみ・更新しない）
//   node scripts/note-sync-tags.mjs --article <path> --commit   # 実適用
//   node scripts/note-sync-tags.mjs --list <file> --commit      # バッチ（1行1 article パス）
//   node scripts/note-sync-tags.mjs --article <path> --prune --commit  # 原稿に無いライブタグも消し、原稿と同じ集合にする
//
// 既定は「足すだけ」。ライブが上限99に達していると不足を1つも足せない（2026-09-23 土木もくじ: 余分11・不足7）。
// --prune は原稿に無いタグを公開設定のタグ欄から外してから不足を足す。原稿（hashtags*.txt）が正で、
// 検証は「消すはずのタグが残っていない・足すはずのタグが全部ある」をライブ API で見る。
//
// 安全弁: account=dobokunote assert・不足0なら冪等skip・更新後にAPIで全タグ実在を検証してから記録。
// 会員限定記事は未ログインの公開 API がタグを空で返す（isUnmeasurable）。0 個と読んで足しにいくと既存タグに
// 重なるので dry-run では計画せず、--commit 時にログイン済みブラウザの API で読んでから計画・検証する。

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { chromium } from 'playwright';
import { recordPublishedTagHash } from './lib/note-republish-hash.mjs';
import { NOTE_TAG_CAP, isExactSync, planTagSync, verifyTagSync } from './lib/note-tag-plan.mjs';
import { applyTagsOnSettings, readNoteAsAuthor, tagsOfNote } from './lib/note-tag-editor.mjs';
import { publishLive } from './lib/note-live-publish.mjs';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { isUnmeasurable } from './lib/note-live-check.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const PRUNE = argv.includes('--prune');
const MAX_ADD = Number(getArg('--max-add') || 0) || Infinity; // テスト用: 1記事あたり追加上限
// 公開 API の読み取り間隔。900本を 0.25 秒間隔で読んだ直後に note.com 全体が 403（CloudFront）になった
// （2026-09-23・約1分で解除）。一括では 1 秒空け、403 は待って読み直し、続くなら止める。
const THROTTLE_MS = Number(getArg('--throttle-ms') || 1000);
const GOAL = 90;     // ライブで満たしたい下限
const ARTICLE = getArg('--article');
const LIST = getArg('--list');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!ARTICLE && !LIST) { console.error('--article <path> or --list <file> required'); process.exit(1); }

const articles = LIST
  ? readFileSync(LIST, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
  : [ARTICLE];

const fmField = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };

// 入力（article*.md か hashtags*.txt どちらでも）→ { noteId, tagsFile, desired } / 解決不能なら null。
function resolve(inputPath) {
  const dir = dirname(inputPath);
  const base = inputPath.replace(/^.*\//, '');
  let artPath, tagsFile;
  const hm = base.match(/^hashtags(-[^.]+)?\.txt$/);
  if (hm) {
    tagsFile = inputPath;
    artPath = join(dir, `article${hm[1] || ''}.md`);
    if (!existsSync(artPath)) artPath = join(dir, 'article.md'); // フォールバック
  } else {
    artPath = inputPath;
    const am = base.match(/^article(-[^.]+)?\.md$/);
    const suffix = am && am[1] ? am[1] : '';
    tagsFile = [suffix && join(dir, `hashtags${suffix}.txt`), join(dir, 'hashtags.txt')].filter(Boolean).find(existsSync);
  }
  if (!artPath || !existsSync(artPath)) return { err: 'article.md なし', noteId: null };
  if (!tagsFile || !existsSync(tagsFile)) return { err: 'hashtags なし', noteId: null };
  const raw = readFileSync(artPath, 'utf8');
  const noteId = fmField(raw, 'noteId') || (fmField(raw, 'noteUrl') || '').match(/n[0-9a-f]{10,}/)?.[0];
  const desired = readFileSync(tagsFile, 'utf8').split(/\r?\n/).flatMap((l) => l.split(/\s+/)).map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 99);
  const seen = new Set(); const dtags = [];
  for (const t of desired) if (!seen.has(t)) { seen.add(t); dtags.push(t); }
  return { noteId, tagsFile, desired: dtags, isPaid: fmField(raw, 'notePricing') === 'paid' };
}

// 取得は curl 経路（2026-07-28 修正）: Node の fetch はプロキシ env を見ないため会社 PC では
//   全件失敗し、全記事が [skip] API 取得失敗 → 「追加すべきタグなし（全て in-sync）」と表示して
//   **exit 0＝同期したつもりで1件も同期していない偽 PASS** になっていた。

async function liveTags(noteId, retries = 3) {
  let blocked = 0;
  for (let a = 0; a <= retries; a++) {
    const r = spawnSync('curl', [
      '-sS', '-m', '30', '--ssl-no-revoke', '-w', '\n%{http_code}',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const raw = (r.stdout || '').trim();
    const code = raw.slice(raw.lastIndexOf('\n') + 1);
    const out = raw.slice(0, raw.lastIndexOf('\n')).trim();
    if (code === '403') { // アクセス制限: 間隔を大きく空けて読み直す。最後まで 403 なら blocked を返す
      blocked++;
      if (a < retries) { spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${60000 * (a + 1)})`]); continue; }
      return { blocked: true };
    }
    if (out.startsWith('{')) {
      try {
        const d = JSON.parse(out)?.data || {};
        return { tags: tagsOfNote(d), unmeasurable: isUnmeasurable(d) };
      } catch { /* retry */ }
    }
    if (a < retries) spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${1200 * (a + 1)})`]);
  }
  return null;
}

// ---- dry-run: 差分だけ表示 ----
const plans = [];
const deferred = []; // 会員限定など、未ログインではタグを読めない記事（--commit でログインして読む）
// --commit で、ライブが既に原稿と完全一致している記事はタグハッシュだけ記録する。記録しないと
// check-note-republish に「記録だけのずれ」が残り続ける（2026-09-23: 一括同期後も10本残った）。
let recorded = 0;
const recordInSync = (tagsFile) => { if (COMMIT && recordPublishedTagHash(relative(ROOT, tagsFile))) recorded++; };
let fetchFail = 0;
let considered = 0;
for (const a of articles) {
  const { noteId, tagsFile, desired, err } = resolve(a);
  if (err) { console.log(`[skip] ${err}: ${a}`); continue; }
  if (!noteId) { console.log(`[skip] noteId なし（未公開?）: ${a}`); continue; }
  considered++;
  if (considered > 1) await sleep(THROTTLE_MS);
  const got = await liveTags(noteId);
  if (got?.blocked) { console.error(`\n[note-sync-tags] ✗ note.com が 403（アクセス制限）を返し続ける。続けると長引くので中断（${considered}本目）。時間を置いて再実行する。`); process.exit(2); }
  if (got == null) { console.log(`[skip] API 取得失敗: ${noteId}`); fetchFail++; continue; }
  if (got.unmeasurable) {
    console.log(`[defer] ${noteId} 公開 API ではタグを読めない（会員限定など）→ --commit 時にログインして読む  ${a.replace(/^content\/note\//, '')}`);
    deferred.push({ a, noteId, tagsFile, desired });
    continue;
  }
  const live = got.tags;
  // note 上限を超えると更新が全体拒否されるため、追加は上限内に切る（prune なら余分を消した後の空きで数える）。
  const plan = planTagSync({ live, desired, prune: PRUNE });
  const note = plan.overflow ? ` (上限${NOTE_TAG_CAP}で${plan.overflow}件は追加不可)` : '';
  const extraNote = PRUNE ? ` 削除${plan.extra.length}` : (plan.extraCount ? ` 余分=${plan.extraCount}（--prune で削除）` : '');
  console.log(`[plan] ${noteId} live=${live.length} desired=${desired.length} 不足=${plan.missing.length}${extraNote} → 追加${plan.addable.length}で live=${plan.willBe}${plan.willBe < GOAL ? ' ⚠<90' : ''}${note}  ${a.replace(/^content\/note\//, '')}`);
  if (plan.changed) plans.push({ a, noteId, tagsFile, desired, plan, missing: plan.addable, extra: plan.extra, liveCount: live.length });
  else if (isExactSync(plan)) recordInSync(tagsFile);
}

// 取得できていないなら「in-sync」ではなく「判定できていない」。緑を返さない（偽 PASS の封じ）。
if (fetchFailDominant(fetchFail, considered)) {
  console.error(`\n[note-sync-tags] ✗ 判定不成立: ${considered}本中${fetchFail}本が live タグを取得できず（${Math.round((fetchFail / considered) * 100)}%）。`);
  console.error('  live を読めないと「不足なし」は成立しない。curl が使えるか／プロキシ env／レート制限を確認する。');
  process.exit(1);
}

if (!COMMIT) { console.log(`\n[dry-run] ${PRUNE ? '変更' : '追加'}対象 ${plans.length} 記事・ログイン後に判定 ${deferred.length} 記事（--commit で実適用）。`); process.exit(0); }
if (!plans.length && !deferred.length) { console.log(`${PRUNE ? '変更' : '追加'}すべきタグなし（${considered - fetchFail} 本を実検査・全て in-sync・一致の記録 ${recorded} 本）。`); process.exit(0); }

// ---- commit: ブラウザで不足タグを追加 ----
const ctx = await chromium.launchPersistentContext(PROFILE, leanContextOptions({
  headless: false, channel: 'chrome', viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
}));
let ok = 0, fail = 0, partial = 0;
const rejectedAll = new Map(); // 入力欄が受け付けなかったタグ → 件数（原稿側で直す）
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(2000); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // ログイン済みコンテキストの API（著者本人には会員限定記事のタグも返る）
  const authedTags = (noteId) => readNoteAsAuthor(ctx, noteId);
  for (const x of deferred) {
    const got = await authedTags(x.noteId);
    if (!got || got.unmeasurable) { console.log(`[skip] ログインしてもタグを読めない: ${x.noteId}（手動確認）`); fail++; continue; }
    const plan = planTagSync({ live: got.tags, desired: x.desired, prune: PRUNE });
    console.log(`[plan*] ${x.noteId} live=${got.tags.length} desired=${x.desired.length} 不足=${plan.missing.length}${PRUNE ? ` 削除${plan.extra.length}` : ''} → 追加${plan.addable.length}で live=${plan.willBe}（ログインで取得）`);
    if (plan.changed) plans.push({ ...x, plan, missing: plan.addable, extra: plan.extra, liveCount: got.tags.length, viaLogin: true });
    else if (isExactSync(plan)) recordInSync(x.tagsFile);
  }

  for (const p of plans) {
    try {
      console.log(`\n[article] ${p.noteId} — 不足${p.missing.length}タグ追加${p.extra.length ? `・余分${p.extra.length}タグ削除` : ''}`);
      await page.goto(`https://editor.note.com/notes/${p.noteId}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
      await sleep(3000);
      // 公開に進む → タグを外す・足す → 境界・試し読みラインは動かさず更新する（lib/note-live-publish の preserveLines）
      let rejected = [];
      const onSettings = async (pg) => {
        const applied = await applyTagsOnSettings(pg, { add: p.missing.slice(0, MAX_ADD), remove: p.extra });
        if (!applied.ok) console.error(`[3] ABORT: ${applied.reason} → 保存せず中断`);
        rejected = applied.rejected;
        return applied.ok;
      };
      if (!(await publishLive(page, p.noteId, undefined, p.isPaid, { preserveLines: true, onSettings, screenshotPrefix: 'nst' }))) { fail++; continue; }
      console.log('[5] 更新する');

      // 検証: API 再取得でライブが目標(≥90)に達したか。note 上限ゆえ desired 全一致でなく件数で判定。
      await sleep(3000);
      const got = p.viaLogin ? await authedTags(p.noteId) : await liveTags(p.noteId);
      if (got?.blocked) { console.error('[6] ✗ note.com が 403（アクセス制限）→ 残りを中断'); fail++; break; }
      const after = got && !got.unmeasurable ? got.tags : null;
      if (after == null) { console.log('[6] WARN: API検証未達 → 手動確認'); fail++; continue; }
      const v = verifyTagSync({ after, plan: p.plan, liveCount: p.liveCount, rejected });
      if (!v.ok && v.reason === 'count-not-increased') { console.error(`[6] FAIL: ライブ件数が増えていない（${p.liveCount}→${after.length}・上限超過で拒否の可能性）→ 手動確認`); fail++; continue; }
      if (!v.ok) { console.error(`[6] FAIL: 計画と不一致（残った余分: ${v.leftover.join(' ') || 'なし'} / 入らなかった不足: ${v.notAdded.join(' ') || 'なし'}）→ 手動確認`); fail++; continue; }
      if (after.length < GOAL) { console.error(`[6] FAIL: ライブ${after.length}が目標${GOAL}未満 → 手動確認`); fail++; continue; }
      if (v.rejected.length) {
        // 入力できないタグが残る＝原稿とライブは一致しない。ハッシュは記録せず、原稿を直す対象として出す。
        for (const t of v.rejected) rejectedAll.set(t, (rejectedAll.get(t) || 0) + 1);
        console.log(`[6] 一部入力不可（live=${after.length}）: ${v.rejected.join(' ')} は入力欄が受け付けない → 原稿の hashtags を直す`);
        partial++; continue;
      }
      console.log(`[6] API検証OK（live=${after.length}・目標${GOAL}達成）`);
      // ライブが ≥90 に達した＝タグ意図を反映。source タグ hash を in-sync 化（以降の source 変更は再度 drift）。
      if (recordPublishedTagHash(relative(ROOT, p.tagsFile))) console.log('[6b] タグハッシュ記録（in-sync）');
      ok++;
    } catch (e) { console.error(`[FAIL] ${p.noteId}: ${e.message.split('\n')[0]}`); fail++; }
  }
} finally {
  await ctx.close();
}
if (rejectedAll.size) console.log(`\n[rejected] 入力欄が受け付けなかったタグ: ${[...rejectedAll].map(([t, n]) => `${t}(${n})`).join(' ')}`);
console.log(`\n[done] ok=${ok} fail=${fail} partial=${partial} / ${plans.length}（変更不要で一致を記録 ${recorded} 本）`);
process.exit(fail ? 1 : 0);

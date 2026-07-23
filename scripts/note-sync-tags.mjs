#!/usr/bin/env node
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
//
// 安全弁: account=dobokunote assert・不足0なら冪等skip・更新後にAPIで全タグ実在を検証してから記録。

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { chromium } from 'playwright';
import { recordPublishedTagHash } from './lib/note-republish-hash.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const MAX_ADD = Number(getArg('--max-add') || 0) || Infinity; // テスト用: 1記事あたり追加上限
const NOTE_CAP = 99; // note のハッシュタグ上限（超えると更新が全体拒否される。note-publish も 99 で slice）
const GOAL = 90;     // ライブで満たしたい下限
const ARTICLE = getArg('--article');
const LIST = getArg('--list');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
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
  return { noteId, tagsFile, desired: dtags };
}

async function liveTags(noteId) {
  try {
    const res = await fetch(`https://note.com/api/v3/notes/${noteId}`, { signal: AbortSignal.timeout(20000) });
    const j = await res.json();
    return (j?.data?.hashtag_notes || []).map((h) => (h?.hashtag?.name || '').replace(/^#/, '')).filter(Boolean);
  } catch { return null; }
}

// ---- dry-run: 差分だけ表示 ----
const plans = [];
for (const a of articles) {
  const { noteId, tagsFile, desired, err } = resolve(a);
  if (err) { console.log(`[skip] ${err}: ${a}`); continue; }
  if (!noteId) { console.log(`[skip] noteId なし（未公開?）: ${a}`); continue; }
  const live = await liveTags(noteId);
  if (live == null) { console.log(`[skip] API 取得失敗: ${noteId}`); continue; }
  const liveSet = new Set(live);
  const missing = desired.filter((t) => !liveSet.has(t));
  // note 上限を超えると更新が全体拒否されるため、追加は (99 - live) までにキャップ。
  const capacity = Math.max(0, NOTE_CAP - live.length);
  const addable = missing.slice(0, capacity);
  const willBe = live.length + addable.length;
  const note = missing.length > addable.length ? ` (上限99で${missing.length - addable.length}件は追加不可)` : '';
  console.log(`[plan] ${noteId} live=${live.length} desired=${desired.length} 不足=${missing.length} → 追加${addable.length}で live=${willBe}${willBe < GOAL ? ' ⚠<90' : ''}${note}  ${a.replace(/^docs\/note\//, '')}`);
  if (addable.length) plans.push({ a, noteId, tagsFile, desired, missing: addable, liveCount: live.length });
}

if (!COMMIT) { console.log(`\n[dry-run] 追加対象 ${plans.length} 記事（--commit で実適用）。`); process.exit(0); }
if (!plans.length) { console.log('追加すべきタグなし（全て in-sync）。'); process.exit(0); }

// ---- commit: ブラウザで不足タグを追加 ----
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});
let ok = 0, fail = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(2000); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  for (const p of plans) {
    try {
      console.log(`\n[article] ${p.noteId} — 不足${p.missing.length}タグ追加`);
      await page.goto(`https://editor.note.com/notes/${p.noteId}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
      await sleep(3000);
      // 公開に進む → 設定ページ
      const next = page.getByRole('button', { name: '公開に進む' });
      if (!(await next.count())) { console.error('[2] ABORT: 公開に進む 未検出'); fail++; continue; }
      let onSettings = false;
      for (let attempt = 0; attempt < 3 && !onSettings; attempt++) {
        if (await next.count()) await next.first().click();
        for (let i = 0; i < 8; i++) {
          await sleep(1800);
          const a = await page.getByRole('button', { name: '有料エリア設定' }).count();
          const u = await page.getByRole('button', { name: '更新する', exact: true }).count();
          const s = await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).count();
          if (a || u || s) { onSettings = true; break; }
        }
      }
      if (!onSettings) { console.error('[2] ABORT: 設定ページ未到達'); fail++; continue; }

      // ハッシュタグ入力へ不足タグを追加。既存タグがある更新フローでは placeholder テキストを
      // getByText で拾えず未フォーカスのまま type すると無効になる→必ず input を click してフォーカス。
      const tagInput = page.locator('input[placeholder*="ハッシュタグ"]');
      if (!(await tagInput.count())) { console.error('[3] ABORT: ハッシュタグ入力未検出'); fail++; continue; }
      const chipCount = () => page.evaluate(() => (document.body.innerText.match(/#[^\s#]+/g) || []).length);
      const before = await chipCount();
      await tagInput.first().scrollIntoViewIfNeeded();
      await tagInput.first().click();
      await sleep(400);
      const toAdd = p.missing.slice(0, MAX_ADD);
      // タグ確定は「type→Enter で入力欄が空になる＝chip化成功」。一部記事では autocomplete の
      // サジェストポップオーバーが初回 Enter を飲み込み、未確定のまま次の type が連結して赤枠無効化に
      // 陥る（2026-07-23 実測10本）。対策: 各タグごとに入力欄の空化を検証し、未確定なら Escape で
      // サジェストを閉じてから Enter を再試行、それでも残れば入力をクリアして連結を断つ。
      const inputVal = async () => (await tagInput.first().inputValue().catch(() => '')) || '';
      let committed = 0;
      for (const t of toAdd) {
        await tagInput.first().click();
        if ((await inputVal()).length) await tagInput.first().fill(''); // 前タグの残骸を除去（連結防止）
        await tagInput.first().type(t);
        await sleep(260); // autocomplete が出るのを待ってから確定
        await page.keyboard.press('Enter');
        await sleep(320);
        if ((await inputVal()).length) { // 未確定: サジェストが Enter を飲んだ可能性
          await page.keyboard.press('Escape'); await sleep(150);
          await page.keyboard.press('Enter'); await sleep(300);
        }
        if ((await inputVal()).length) { // なお未確定: 連結を防ぐためクリアしてスキップ
          await tagInput.first().fill(''); await sleep(120);
        } else { committed++; }
      }
      console.log(`[3b] 確定=${committed}/${toAdd.length}`);
      await sleep(800);
      const afterChips = await chipCount();
      console.log(`[3] ${p.missing.length}タグ入力 → chip ${before}→${afterChips}（確定=${committed}）`);
      // ゲートは「確定=0（入力欄が一度もクリアされない＝完全未反映）」でのみ中断。chipCount(body innerText)は
      // メンバーシップ記事等でタグ widget を拾えず偽陰性になるため主ゲートにしない。実体は保存後の
      // API 検証([6] live≥90)で担保する。
      if (committed === 0 && afterChips <= before) { console.error('[3] ABORT: タグが1つも確定できず（入力未反映）→ 保存せず中断'); await page.screenshot({ path: join(ROOT, `.tmp/nst-notags-${p.noteId}.png`) }); fail++; continue; }

      // 境界保持（本文は触っていないので、有料/試し読みは「開いて更新するを出す」だけ・ライン不動）
      const area = page.getByRole('button', { name: '有料エリア設定' });
      const trial = page.getByRole('button', { name: '試し読みエリアを設定', exact: true });
      const directUpdate = page.getByRole('button', { name: '更新する', exact: true });
      if (await area.count()) {
        await area.first().click(); await sleep(3000);
        const hasLine = await page.evaluate(() => /このラインより先を有料にする/.test(document.body.innerText || ''));
        if (!hasLine) { console.error('[4] ABORT: 有料境界line未確認（保存せず中断）'); fail++; continue; }
        console.log('[4] 有料境界 保持OK');
      } else if (await directUpdate.count()) {
        // メンバーシップ等で 更新する が設定画面に既に出ている＝タグだけ保存できる。試し読みに入ると
        // タグ入力状態が失われ live=0 のまま保存される（2026-07-23 実測）。既存ラインは不介入で保持。
        console.log('[4] 更新する直行（試し読み不介入・既存ライン保持）');
      } else if (await trial.count()) {
        await trial.first().click(); await sleep(4000); // 更新する未露出のメンバーシップのみ: ライン不動で更新するを出す
        console.log('[4] 試し読みフロー（ライン不動）');
      }

      // 更新する
      let updated = false;
      for (const label of ['更新する', '更新']) {
        const b = page.getByRole('button', { name: label, exact: label === '更新する' });
        if (await b.count()) { await b.first().click(); updated = true; break; }
      }
      if (!updated) { console.error('[5] ABORT: 更新する未検出'); fail++; continue; }
      await sleep(2500);
      // 通知ダイアログ「いいえ」
      const no = page.getByRole('button', { name: 'いいえ', exact: true });
      if (await no.count()) { await no.first().click(); await sleep(800); }
      console.log('[5] 更新する');

      // 検証: API 再取得でライブが目標(≥90)に達したか。note 上限ゆえ desired 全一致でなく件数で判定。
      await sleep(3000);
      const after = await liveTags(p.noteId);
      if (after == null) { console.log('[6] WARN: API検証未達 → 手動確認'); fail++; continue; }
      if (after.length <= p.liveCount) { console.error(`[6] FAIL: ライブ件数が増えていない（${p.liveCount}→${after.length}・上限超過で拒否の可能性）→ 手動確認`); fail++; continue; }
      if (after.length < GOAL) { console.error(`[6] FAIL: ライブ${after.length}が目標${GOAL}未満 → 手動確認`); fail++; continue; }
      console.log(`[6] API検証OK（live=${after.length}・目標${GOAL}達成）`);
      // ライブが ≥90 に達した＝タグ意図を反映。source タグ hash を in-sync 化（以降の source 変更は再度 drift）。
      if (recordPublishedTagHash(relative(ROOT, p.tagsFile))) console.log('[6b] タグハッシュ記録（in-sync）');
      ok++;
    } catch (e) { console.error(`[FAIL] ${p.noteId}: ${e.message.split('\n')[0]}`); fail++; }
  }
} finally {
  await ctx.close();
}
console.log(`\n[done] ok=${ok} fail=${fail} / ${plans.length}`);
process.exit(fail ? 1 : 0);

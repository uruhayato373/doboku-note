#!/usr/bin/env node
/**
 * check-note-live-tags.mjs — note ライブのハッシュタグ不足を検出するゲート
 * ---------------------------------------------------------------------------
 * 背景（2026-07-28）: ソースの `hashtags*.txt` は 748 件すべて 90 個以上で完備なのに、
 *   **note ライブ側は 675 本中 250 本（37%）が 90 未満**だった（0タグ19本・30〜59が214本）。
 *   ハッシュタグは note 検索流入の主要導線なので、そのまま流入機会を失っていた。
 *
 *   長期間気づけなかったのは、タグを見る仕組みが3つとも live を見ていなかったから:
 *     - check-note-hashtags       … ソースのみ（ソースが完璧なので常に緑）
 *     - check-note-republish の tagDrift … ソースの hashtags が「記録時点から変わったか」だけ。
 *                                    live を一切見ない（tagDrift=1 なのに live=0 が19本あった）
 *     - check-note-structure の TAG_SHORT … live を実測する唯一の判定だが sev:'INFO' 固定で
 *                                    `--ci` ゲート（CRITICAL のみ）に載らず誰も落とさない
 *
 *   本ゲートは「ライブのタグ数」だけを独立して見る。TAG_SHORT を CRITICAL に格上げしないのは、
 *   `--ci` が CRITICAL のみ判定で、格上げすると「有料記事の全ロック・課金漏洩」と同列になり
 *   優先度が壊れるため。タグは「壊れている」ではなく「育てる」性質の指標なので別管理にする。
 *
 * 取得は curl（`fetch` はプロキシ env を見ず会社 PC で全滅する）。
 * **取得失敗が支配的なら「検査不成立」で exit 1**＝検査ゼロを PASS と呼ばない（同日 4 ゲートで踏んだ轍）。
 *
 * 使い方:
 *   node scripts/check-note-live-tags.mjs                # 公開済み全件
 *   node scripts/check-note-live-tags.mjs --limit 40     # 先頭N本（デバッグ）
 *   node scripts/check-note-live-tags.mjs --json         # 機械可読
 *   node scripts/check-note-live-tags.mjs --list <file>  # 対象を絞る（1行1 article パス）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, readdirSync, existsSync, writeSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isUnmeasurable } from './lib/note-live-check.mjs';

const ROOT = 'content/note';
const CONFIG = '.claude/config/note-live-tags-allow.json';
const GOAL = 90;
const MAX_FETCH_FAIL_RATE = 0.2;
const THROTTLE_MS = 250;

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const LIMIT = (() => { const i = argv.indexOf('--limit'); return i >= 0 ? Number(argv[i + 1]) : Infinity; })();
const LIST = (() => { const i = argv.indexOf('--list'); return i >= 0 ? argv[i + 1] : null; })();

const cfg = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf-8')) : { allow: {} };
const ALLOW = cfg.allow || {};

const sleep = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    // ファイル名で判定する（join() は Windows で "\" を返すためパス全体の正規表現は不可）。
    else if (/^article(-[^/\\]+)?\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function liveTagCount(noteId, retries = 3) {
  let lastErr = 'unknown';
  for (let a = 0; a <= retries; a++) {
    const r = spawnSync('curl', [
      '-sS', '-m', '30', '--ssl-no-revoke',
      '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json',
      `https://note.com/api/v3/notes/${noteId}`,
    ], { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
    const out = (r.stdout || '').trim();
    if (out.startsWith('{')) {
      try {
        const d = JSON.parse(out)?.data || {};
        // 未ログインで中身が返らない記事（メンバーシップ限定等）は tag=0 に見えるが、それは
        // 「タグが無い」ではなく「読めない」。不足に数えると存在するタグを欠落と誤診する。
        return { n: (d.hashtag_notes || []).length, unmeasurable: isUnmeasurable(d), error: null };
      } catch (e) { lastErr = `parse: ${String(e.message || e)}`; }
    } else {
      lastErr = (r.stderr || '').trim().split('\n')[0] || `non-json (${out.slice(0, 40)})`;
    }
    if (a < retries) sleep(1200 * (a + 1)); // バックオフ（レート制限対策）
  }
  return { n: null, unmeasurable: false, error: lastErr };
}

// 対象の列挙: --list があればそれ、無ければ content/note の公開済み（noteId あり）全件。
let files;
if (LIST) {
  files = readFileSync(LIST, 'utf-8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).filter((p) => existsSync(p));
} else {
  files = walk(ROOT);
}

const targets = [];
for (const f of files) {
  const raw = readFileSync(f, 'utf-8');
  const noteId = (raw.match(/^noteId:[ \t]*["']?(n[0-9a-f]{6,})/m) || [])[1]
    || (raw.match(/^noteUrl:[ \t]*["']?[^"'\n]*\/(n[0-9a-f]{6,})/m) || [])[1];
  if (!noteId) continue; // 未公開
  const rel = relative(process.cwd(), f).replace(/\\/g, '/').replace(/^content\/note\//, '');
  targets.push({ f, rel, noteId });
  if (targets.length >= LIMIT) break;
}

const short = [];
const waived = [];
const unmeasurable = [];
let fetchFail = 0;
let done = 0;
for (const t of targets) {
  if (done++) sleep(THROTTLE_MS);
  if (!JSON_OUT && done % 50 === 0) process.stderr.write(`  ...${done}/${targets.length}\n`);
  const { n, unmeasurable: unmeas, error } = liveTagCount(t.noteId);
  if (error != null && n == null) { fetchFail++; continue; }
  // 計測不能は不足でも充足でもない。数を出さずに別枠へ（実体は著者ログインで確認する）。
  if (unmeas) { unmeasurable.push({ ...t, n: null }); continue; }
  if (n >= GOAL) continue;
  const key = t.rel.replace(/\/article(-[^/]+)?\.md$/, '');
  if (ALLOW[key] || ALLOW[t.rel]) waived.push({ ...t, n });
  else short.push({ ...t, n });
}

// 実検査＝取得できて、かつ数を信用できる本数。計測不能は分母から外して別枠で出す
// （混ぜると「検査した」ように見えてしまう＝CLAUDE.md §9）。
const inspected = targets.length - fetchFail - unmeasurable.length;
const failRate = targets.length ? fetchFail / targets.length : 0;
const notConclusive = targets.length > 0 && failRate > MAX_FETCH_FAIL_RATE;

if (JSON_OUT) {
  writeSync(1, JSON.stringify({ checked: targets.length, inspected, fetchFail, unmeasurable, notConclusive, goal: GOAL, short, waived }, null, 2) + '\n');
  process.exit(notConclusive || short.length ? 1 : 0);
}

console.log(`[check-note-live-tags] 実検査 ${inspected}本（対象${targets.length}・取得失敗${fetchFail}・計測不能${unmeasurable.length}）／目標 ${GOAL} タグ`);

if (unmeasurable.length) {
  console.log(`  計測不能 ${unmeasurable.length} 件（未ログイン API が中身を返さない＝メンバーシップ限定等）:`);
  for (const u of unmeasurable.slice(0, 10)) console.log(`    ${u.rel}`);
  if (unmeasurable.length > 10) console.log(`    … 他 ${unmeasurable.length - 10} 件`);
  console.log('  これは「タグ不足」ではない。実体は著者ログインで確認する（詳細は note-api-verification.md）。');
}

// 検査不成立を PASS にしない（取得できていないなら「不足なし」は成立しない）
if (notConclusive) {
  console.error(`\n[check-note-live-tags] ✗ 検査不成立: ${targets.length}本中${fetchFail}本が取得失敗（${Math.round(failRate * 100)}% > 上限${Math.round(MAX_FETCH_FAIL_RATE * 100)}%）`);
  console.error('  live を取得できていないため「タグ不足なし」は成立しない。curl が使えるか／プロキシ env／レート制限を確認する。');
  process.exit(1);
}

if (waived.length) console.log(`  WAIVED ${waived.length} 件（allowlist・${CONFIG}）`);

if (short.length) {
  console.error(`\n[check-note-live-tags] ✗ ライブのタグが ${GOAL} 未満: ${short.length} 件`);
  for (const s of short.slice(0, 30)) console.error(`  ${String(s.n).padStart(3)} タグ  ${s.rel}`);
  if (short.length > 30) console.error(`  … 他 ${short.length - 30} 件`);
  console.error('\n対処: ソースの hashtags*.txt との差分をライブへ追加する（本文・有料境界は触らない）:');
  console.error('  node scripts/note-sync-tags.mjs --list <対象リスト> --commit');
  console.error(`\n注: ソース側の不足は別ゲート（npm run check-note-hashtags）が見る。本ゲートは live 専用。`);
  console.error('  構造的にライブへ入らない記事（メンバーシップ等）は allowlist に理由つきで登録する。');
  process.exit(1);
}
console.log(`[check-note-live-tags] ✓ 公開記事 ${inspected} 本すべて live タグ ${GOAL} 以上`);

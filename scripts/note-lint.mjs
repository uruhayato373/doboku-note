#!/usr/bin/env node
/**
 * note-lint.mjs — note 記事（.md）の note 非互換をブロックする lint ゲート
 *
 * note は markdown テーブル非対応・独自パーサで太字内全角括弧の描画が崩れる等の制約がある。
 * これらは公開前に必ず除く必要があるが、.mdx 用の pre-commit-mdx.mjs では .md が対象外で
 * すり抜けていた。本スクリプトを pre-commit に組み込み、note 記事のコミットを自動ブロックする。
 *
 * 検査（いずれも BLOCK = exit 1）:
 *   1. pipe 表（markdown テーブル）       — note 非対応
 *   2. 太字内全角括弧 Pattern A            — note 独自パーサで描画崩れ（check-note-bold-paren.mjs を再利用）
 *   3. U+FFFD（文字化け）
 *   4. マガジンURL／{{MAGAZINE_URL}} の非単独行 — 括弧囲み・同一行テキストだと note でリンクカード化できない
 *
 * 使い方:
 *   node scripts/note-lint.mjs                       # staged の docs/note 配下の article.md を検査（pre-commit 用）
 *   node scripts/note-lint.mjs <file|dir> [...]      # 指定パスを検査（手動）。dir は再帰で article.md を探索
 *   npm run note-lint -- 総監記述式-設問3国家施策バンク
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOLD_CHECKER = join(ROOT, '.claude', 'scripts', 'check-note-bold-paren.mjs');

function stagedNoteArticles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8', cwd: ROOT })
      .split('\n').filter((f) => /^docs\/note\/.*\/article\.md$/.test(f))
      .map((f) => join(ROOT, f))
      .filter((f) => existsSync(f));
  } catch { return []; }
}

function walkMd(p) {
  const st = statSync(p);
  if (st.isFile()) return p.endsWith('.md') ? [p] : [];
  return readdirSync(p).flatMap((c) => walkMd(join(p, c)));
}

// --- 個別チェック（[{line, msg}] を返す） ---
function checkPipeTable(content) {
  const out = [];
  let inFence = false;
  content.split('\n').forEach((l, i) => {
    if (/^\s*```/.test(l)) inFence = !inFence;
    if (!inFence && /^\s*\|/.test(l)) out.push({ line: i + 1, msg: `pipe表（note 非対応）: ${l.trim().slice(0, 40)}` });
  });
  return out;
}
function checkMojibake(content) {
  const out = [];
  content.split('\n').forEach((l, i) => { if (l.includes('�')) out.push({ line: i + 1, msg: 'U+FFFD（文字化け）' }); });
  return out;
}
// マガジン誘導URL（注入後の実URL）/ {{MAGAZINE_URL}} プレースホルダは「単独行」でなければ
// note のリンクカードに変換できない（全角括弧で囲む・同一行に文がある＝ただのテキスト）。
// 港湾R03の `（https://note.com/dobokunote/m/xxxx）` 事故の再発防止（2026-06-10 追加）。
function checkMagazineLinkCard(content) {
  const out = [];
  let inFence = false;
  content.split('\n').forEach((l, i) => {
    if (/^\s*```/.test(l)) { inFence = !inFence; return; }
    if (inFence) return;
    const t = l.trim();
    // {{MAGAZINE_URL}} は単独行のみ可
    if (l.includes('{{MAGAZINE_URL}}') && t !== '{{MAGAZINE_URL}}') {
      out.push({ line: i + 1, msg: `{{MAGAZINE_URL}} は単独行に（括弧/同一行テキスト不可・リンクカード化のため）: ${t.slice(0, 40)}` });
    }
    // 注入後の実マガジンURL（英数字ID）は単独行のみ可。markdown リンク [..](..) 内は除外。
    const m = t.match(/https:\/\/note\.com\/dobokunote\/m\/[A-Za-z0-9]+/);
    if (m && !/\]\(/.test(t) && t !== m[0]) {
      out.push({ line: i + 1, msg: `マガジンURLは単独行（括弧なし）に＝リンクカード化のため: ${t.slice(0, 40)}` });
    }
  });
  return out;
}
function checkBoldParen(file) {
  try {
    const r = execSync(`node "${BOLD_CHECKER}" "${file}"`, { encoding: 'utf8', cwd: ROOT });
    if (/NG/.test(r)) {
      return r.split('\n').filter((l) => /L\d+:/.test(l)).map((l) => ({ line: 0, msg: '太字内全角括弧 Pattern A: ' + l.trim() }));
    }
  } catch (e) {
    const r = (e.stdout || '') + (e.stderr || '');
    if (/NG/.test(r)) return [{ line: 0, msg: '太字内全角括弧 Pattern A 検出（詳細は check-note-bold-paren.mjs）' }];
  }
  return [];
}

// --- main ---
const args = process.argv.slice(2);
let files;
if (args.length === 0) {
  files = stagedNoteArticles();
} else {
  files = args.flatMap((a) => {
    const p = existsSync(a) ? a : join(ROOT, 'docs/note', a);
    return existsSync(p) ? walkMd(p) : [];
  });
}

if (files.length === 0) { process.exit(0); }

let violations = 0;
for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const issues = [...checkPipeTable(content), ...checkMojibake(content), ...checkMagazineLinkCard(content), ...checkBoldParen(f)];
  if (issues.length) {
    violations += issues.length;
    const rel = f.replace(ROOT + '\\', '').replace(ROOT + '/', '').replace(/\\/g, '/');
    console.error(`\nNG ${rel}`);
    for (const x of issues) console.error(`   ${x.line ? 'L' + x.line + ' ' : ''}${x.msg}`);
  }
}

if (violations > 0) {
  console.error(`\n❌ note-lint: ${violations} 件の note 非互換を検出。コミットをブロックしました。`);
  console.error('   表は箇条書きへ、太字内全角括弧は **A**（B）形式へ、文字化けは修正、');
  console.error('   マガジンURL/{{MAGAZINE_URL}} は括弧で囲まず URL 単独行にしてください（リンクカード化）。');
  process.exit(1);
}
console.log(`✅ note-lint: ${files.length} 記事 OK`);

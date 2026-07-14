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
 *   4b. マガジンCTA形式（check-note-magazine-cta.mjs）— markdown リンク形式のマガジンURL / マガジンURL同一行の価格(¥)
 *       → bare URL 単独行（リンクカード）に・価格は本文に書かない（改訂で陳腐化）。content-principles.md §14-c
 *   4c. 3点セット充足（check-note-3set.mjs）— 公開状態（noteUrl 非空/noteStatus publish）の記事は
 *       img/cover.png + hashtags.txt 必須（下書きは対象外）。生成漏れの本番到達を防止。content-principles.md §14-d
 *   5. 部分注入 — 同一マガジンに実URL注入済み記事がありながら {{MAGAZINE_URL}} が残る記事（注入漏れ）
 *      → 手作業でなく `npm run note-inject-magazine-url -- <persona> <url>` を使う（CRLF保持・冪等）
 *   6. 廃止セクション見出し — 「## …からのコメント」（合格者／元公務員からのコメント節、2026-06-10 廃止）
 *   7. ツール呼び出しXML残骸 — antml: / <invoke> / <parameter> / <function> / <content>（生成時混入）
 *   8. 段落長（無料記事のみ） — notePricing: free の地の文段落が表示 200 字以上でブロック
 *      （B5 基準 = 1段落2-3文。模範論文など有料は散文答案が仕様のため対象外。SKIP_NOTE_PARA=1 で回避）
 *
 * 使い方:
 *   node scripts/note-lint.mjs                       # staged の docs/note 配下の article.md を検査（pre-commit 用）
 *   node scripts/note-lint.mjs <file|dir> [...]      # 指定パスを検査（手動）。dir は再帰で article.md を探索
 *   npm run note-lint -- 総監記述式-設問3国家施策バンク
 */
import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOLD_CHECKER = join(ROOT, '.claude', 'scripts', 'check-note-bold-paren.mjs');
const MAG_CTA_CHECKER = join(ROOT, '.claude', 'scripts', 'check-note-magazine-cta.mjs');
const SET_CHECKER = join(ROOT, '.claude', 'scripts', 'check-note-3set.mjs');

function stagedNoteArticles() {
  try {
    // -c core.quotepath=false: 日本語パスを引用符+8進エスケープ("docs/note/1\347...")でなく
    // 生UTF-8で出力させる。既定(quotepath=true)だと下の /^docs\/note\// 正規表現に不一致で
    // 日本語パス記事が全て素通りし、pipe表ゲートが一度も発火しなかった（2026-07-04 是正）。
    return execSync('git -c core.quotepath=false diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8', cwd: ROOT })
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
    // クエリ文字列（?utm_source=... 等）・フラグメント付きの単独行URLは正当（リンクカード化可）。
    if (/https:\/\/note\.com\/dobokunote\/m\/[A-Za-z0-9]+/.test(t) && !/\]\(/.test(t)) {
      const isPureUrl = /^https:\/\/note\.com\/dobokunote\/m\/[A-Za-z0-9]+(\?\S*)?$/.test(t);
      if (!isPureUrl) {
        out.push({ line: i + 1, msg: `マガジンURLは単独行（括弧・同一行テキスト不可）＝リンクカード化のため: ${t.slice(0, 40)}` });
      }
    }
  });
  return out;
}
function checkBoldParen(file) {
  try {
    const r = execFileSync(process.execPath, [BOLD_CHECKER, file], { encoding: 'utf8', cwd: ROOT });
    if (/NG/.test(r)) {
      return r.split('\n').filter((l) => /L\d+:/.test(l)).map((l) => ({ line: 0, msg: '太字内全角括弧 Pattern A: ' + l.trim() }));
    }
  } catch (e) {
    const r = (e.stdout || '') + (e.stderr || '');
    if (/NG/.test(r)) return [{ line: 0, msg: '太字内全角括弧 Pattern A 検出（詳細は check-note-bold-paren.mjs）' }];
  }
  return [];
}
// マガジン導線CTAの形式ゲート（check-note-magazine-cta.mjs を再利用）:
//   (1) markdown リンク形式のマガジンURL — bare URL 単独行（リンクカード）でないとカード化されない
//       （旧 checkMagazineLinkCard は `](` 行を除外し markdown リンクがすり抜けていた＝2026-06-12 取りこぼし根本原因）
//   (2) マガジンURL／{{MAGAZINE_URL}} と同一行の価格(¥) — 価格改訂で陳腐化。SoT は src/lib/note-magazines.ts。
//   真実源: content-principles.md §14-c
function checkMagazineCta(file) {
  try {
    const r = execFileSync(process.execPath, [MAG_CTA_CHECKER, file], { encoding: 'utf8', cwd: ROOT });
    if (/NG/.test(r)) {
      return r.split('\n').filter((l) => /L\d+:/.test(l)).map((l) => ({ line: 0, msg: 'マガジンCTA形式: ' + l.trim() }));
    }
  } catch (e) {
    const r = (e.stdout || '') + (e.stderr || '');
    if (/NG/.test(r)) {
      return r.split('\n').filter((l) => /L\d+:/.test(l)).map((l) => ({ line: 0, msg: 'マガジンCTA形式: ' + l.trim() }))
        .concat(/L\d+:/.test(r) ? [] : [{ line: 0, msg: 'マガジンCTA形式違反（詳細は check-note-magazine-cta.mjs）' }]);
    }
  }
  return [];
}
// 3点セット充足ゲート（check-note-3set.mjs を再利用、既定モード=公開状態の記事のみ必須化）:
//   公開状態（frontmatter noteUrl 非空 OR noteStatus に publish 含む）の article.md は
//   img/cover.png + hashtags.txt を必須化。下書きは対象外（欠落が正常）。
//   生成漏れの本番到達を構造防止（2026-06-12、公開済2本が hashtags.txt 欠落で公開された事例）。
//   真実源: content-principles.md §14-d
function checkNote3set(file) {
  try {
    execFileSync(process.execPath, [SET_CHECKER, file], { encoding: 'utf8', cwd: ROOT });
  } catch (e) {
    const r = (e.stdout || '') + (e.stderr || '');
    if (/欠落/.test(r)) {
      return r.split('\n').filter((l) => /^\s*欠落 /.test(l)).map((l) => ({ line: 0, msg: '3点セット未完: ' + l.trim() }));
    }
  }
  return [];
}

// --- 部分注入検知（総監模範論文ペルソナ別マガジン限定）---
// 同一マガジンdir内に「実マガジンURLを単独行で注入済みの記事」と「{{MAGAZINE_URL}} 残存記事」が
// 混在＝マガジン公開後の inject-magazine-url.cjs 実行漏れ。手作業置換でなく専用スクリプトに誘導する
// （2026-06-11 追加。公開前＝全記事 placeholder のときは注入済み記事が無いので発火しない）。
const PERSONA_RE = /docs\/note\/技術士総監\/magazines\/(総監模範論文-[^/]+)\/[^/]+\/article\.md$/;
function injectedMagazineUrl(content) {
  for (const l of content.split('\n')) {
    const t = l.trim();
    if (/^https:\/\/note\.com\/dobokunote\/m\/[A-Za-z0-9]+(\?\S*)?$/.test(t)) return t.replace(/\?\S*$/, '');
  }
  return null;
}
// 検査対象 files から関係するマガジンdir をディスク走査し、部分注入状態を作る。
// 返り値: Map<magName, { url, persona, placeholderSet:Set<正規化絶対パス> }>
function buildPartialInjectionState(files) {
  const mags = new Map(); // magName -> { magDirAbs, persona }
  for (const f of files) {
    const m = f.replace(/\\/g, '/').match(PERSONA_RE);
    if (!m) continue;
    const norm = f.replace(/\\/g, '/');
    const magDirAbs = norm.slice(0, norm.indexOf(m[1]) + m[1].length);
    if (!mags.has(m[1])) mags.set(m[1], { magDirAbs, persona: m[1].replace(/^総監模範論文-/, '') });
  }
  const state = new Map();
  for (const [magName, info] of mags) {
    let url = null;
    const placeholderSet = new Set();
    let entries = [];
    try { entries = readdirSync(info.magDirAbs); } catch { continue; }
    for (const slug of entries) {
      const af = join(info.magDirAbs, slug, 'article.md');
      if (!existsSync(af) || !statSync(af).isFile()) continue;
      const c = readFileSync(af, 'utf8');
      if (!url) { const u = injectedMagazineUrl(c); if (u) url = u; }
      if (c.includes('{{MAGAZINE_URL}}')) placeholderSet.add(af.replace(/\\/g, '/'));
    }
    if (url && placeholderSet.size) state.set(magName, { url, persona: info.persona, placeholderSet });
  }
  return state;
}
function checkPartialInjection(file, state) {
  const m = file.replace(/\\/g, '/').match(PERSONA_RE);
  if (!m) return [];
  const st = state.get(m[1]);
  if (!st || !st.placeholderSet.has(file.replace(/\\/g, '/'))) return [];
  return [{ line: 0, msg: `部分注入: 同一マガジンに実URL注入済み記事があるのに本文へ {{MAGAZINE_URL}} 未反映 → 修正: npm run note-inject-magazine-url -- ${st.persona} ${st.url}` }];
}
// 廃止セクション見出し（2026-06-10 廃止: 合格者／元公務員からのコメント節）。採点者視点と重複し
// 運営者の自己紹介フレーミングが不要なため全廃。建設部門二次QAでは減点ルール化済みだが、再混入を
// pre-commit で物理的に止める（essay/建設部門の両方が対象。2026-06-11 追加）。
function checkDeprecatedSection(content) {
  const out = [];
  content.split('\n').forEach((l, i) => {
    if (/^##\s+.*からのコメント\s*$/.test(l)) {
      out.push({ line: i + 1, msg: `廃止セクション見出し（2026-06-10 廃止: 合格者／元公務員からのコメント節）。削除し採点者視点に統合: ${l.trim().slice(0, 30)}` });
    }
  });
  return out;
}
// 8. 段落長（無料記事のみブロック・2026-07-14 ユーザー決定）。
//    note はスマホ読者が主で、地の文 1 段落は 2-3 文・3 行以内が基準（note-publish-enhancement.md B5）。
//    無料（notePricing: free）の集客記事で 200 字以上の地の文段落を検出したらブロックする。
//    有料・membership は対象外（模範論文は散文答案が仕様＝箇条書き禁止・各施策600字）。
//    計測はリンク URL を除いた表示文字数（[text](url) → text）。回避: SKIP_NOTE_PARA=1（バーンダウン用）。
function checkParagraphLength(file, content) {
  if (process.env.SKIP_NOTE_PARA === '1') return [];
  if (!content.startsWith('---')) return [];
  const fm = content.split('---')[1] || '';
  if (!/notePricing:\s*"?free"?/.test(fm)) return [];
  const out = [];
  let inFence = false;
  content.split('\n').forEach((l, i) => {
    const s = l.trim();
    if (s.startsWith('```')) { inFence = !inFence; return; }
    if (inFence || !s) return;
    // 地の文以外（見出し/リスト/引用/画像/コメント/表/URL単独行/frontmatter区切り）は対象外
    if (/^(#|[-*+]\s|>|!\[|<|\||https?:\/\/|---$|\d+\.\s)/.test(s)) return;
    // 表示文字数で計測（markdown リンクは URL を除きテキストのみ数える）
    const display = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    if (display.length >= 200) {
      out.push({ line: i + 1, msg: `段落が長すぎる（表示${display.length}字 ≥200字）。1段落2-3文に分割（B5: note-publish-enhancement.md）: ${display.slice(0, 30)}…` });
    }
  });
  return out;
}
// ツール呼び出しXMLの残骸（生成時にエージェントの function-call 断片が本文へ混入）。
// note 試験対策記事にこれらのタグが正当に出ることはまずない＝100% 削除対象（契約調達R07事故、2026-06-11）。
function checkToolArtifact(content) {
  const out = [];
  content.split('\n').forEach((l, i) => {
    if (/antml:|<\/?(invoke|parameter|function)\b|<\/?content>/.test(l)) {
      out.push({ line: i + 1, msg: `ツール呼び出しXML残骸（生成時混入）。削除せよ: ${l.trim().slice(0, 40)}` });
    }
  });
  return out;
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

const partialState = buildPartialInjectionState(files);

let violations = 0;
for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const issues = [...checkPipeTable(content), ...checkMojibake(content), ...checkMagazineLinkCard(content), ...checkMagazineCta(f), ...checkNote3set(f), ...checkBoldParen(f), ...checkPartialInjection(f, partialState), ...checkDeprecatedSection(content), ...checkToolArtifact(content), ...checkParagraphLength(f, content)];
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
  console.error('   マガジン導線は markdown リンクでなく bare URL 単独行に・CTA に価格(¥)を書かない（content-principles.md §14-c）。');
  console.error('   公開状態の記事は 3点セット（img/cover.png + hashtags.txt）必須。生成: generate-note-covers.mjs / /note-hashtags（§14-d）。');
  process.exit(1);
}
console.log(`✅ note-lint: ${files.length} 記事 OK`);

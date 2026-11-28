#!/usr/bin/env node
/**
 * fix-note-grader-claims.mjs — note の模範答案の「採点者が見るポイント」「採点者視点でのチェックポイント」などの
 * 言い方を、採点基準を知っているように読めない言い方へ一括で直し、節の頭に前置きの 1 文を入れる。
 * 同時に、公開ページへ同じ変更だけを当てる patches（note-patch-body.mjs の入力）を書き出す。
 *
 * なぜ要るか: 採点基準は公表されていないのに、865 記事が「採点者が見る」と書いていた（2026-11-27、読者の指摘で
 * 総監の記事の言い切りが見つかった）。全文の貼り直しは PDF 添付を消すので、公開ページへは差分だけを当てる。
 *
 * 使い方:
 *   node scripts/maint/fix-note-grader-claims.mjs                 # 確認だけ（件数を出す・書かない）
 *   node scripts/maint/fix-note-grader-claims.mjs --write         # 原稿を直し .tmp/note-patches/grader-claims.json を書く
 *   node scripts/maint/fix-note-grader-claims.mjs --only <パスの先頭> [--write]
 *   node scripts/maint/fix-note-grader-claims.mjs --write --out <名前>.json   # 2 回目以降は別の patches に書く（前の未反映分を上書きしない）
 * 決まり: 置き換えは本文（frontmatter・H1・画像の行・HTML コメントを除く）の全部に当てる。公開ページの
 *   エディタも同じ範囲を数えるので、数が合わない記事は note-patch-body が触らずに飛ばす。改行コード（CRLF）は保つ。
 *   前置きは、直した見出しのうち最初の 1 つの直後に 1 回だけ。すでに「採点基準は公表されていません」がある記事には入れない。
 *   「お詫びと訂正」の節に対象の語がある記事は直さない（以前の書き方の引用を変えないため・一覧に出す）。
 * 罠: 2 回実行しても変わらない（置き換え後の文に元の語が含まれない・前置きは重複して入れない）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';
import { bodyHash } from '../lib/note-republish-hash.mjs';

/** 置き換え表（長い語を先に）。 */
export const REPLACEMENTS = [
  ['の答案で採点者が見るポイント', 'の答案の自己点検ポイント'],
  ['採点者が見ているチェックポイント', '答案の自己点検ポイント'],
  ['採点者が見るポイント', '答案の自己点検ポイント'],
  ['採点者視点でのチェックポイント', '読み手の視点での自己点検'],
  ['採点者視点のチェックポイント', '読み手の視点での自己点検'],
  ['採点者視点のセルフチェック', '読み手の視点での自己点検'],
  ['採点者視点の仕上げ', '読み手の視点での仕上げ'],
  ['採点者視点の一言', '読み手の視点の一言'],
  ['採点側が概要で見ている3つの整合', '概要で確かめたい3つの整合'],
  ['採点で見られる点', '自己点検で見る点'],
  ['採点者視点', '読み手の視点'],
];
/**
 * 本文の「採点者は〜を見ています」型の文（正規表現 → 置き換え）。見出しの表の後に当てる。一致した部分に
 * Markdown の記号（** や [ ]）が入っているものは、公開ページで同じ文字列にならないので置き換えない。
 */
export const PROSE = [
  [/いずれを選んでも、採点者は(「[^。]+」)を共通して(?:見ています|評価します)。/g, 'いずれを選んでも、$1を共通して押さえておくと、答案の筋が通りやすくなります。'],
  [/いずれを選んでも、採点者は次の(\d+)軸を共通して見ています。/g, 'いずれを選んでも、次の$1軸を共通して押さえておきたいところです。'],
  [/採点者はいずれも(「[^。]+」)を共通して見ています。/g, '$1を共通して押さえておきたいところです。'],
  [/(\d+)設問に共通して、採点者は(「[^。]+」)を見ています。/g, '$1設問に共通して、$2を押さえておきたいところです。'],
  [/(\d+)設問とも採点者は(「[^。]+」)を共通して評価します。/g, '$1設問とも、$2を共通して押さえておきたいところです。'],
  [/採点者は次を見ている。/g, '自己点検では、次を確かめる。'],
  [/採点者がチェックするのは次の/g, '自己点検で確かめたいのは次の'],
  [/採点者がチェックする (\d+) 点：/g, '自己点検で確かめたい $1 点：'],
  [/採点者が見る点は次のとおりです。/g, '自己点検で確かめたい点は次のとおりです。'],
  [/が採点者へ伝わりません/g, 'が読み手へ伝わりません'],
  [/を採点者に伝わる順序/g, 'を読み手に伝わる順序'],
  [/採点者に意図が伝わりません/g, '読み手に意図が伝わりません'],
  [/採点者に伝わらなかった/g, '読み手に伝わらなかった'],
  [/採点者が重視するプロセス設計力/g, '答案で求められやすいプロセス設計力'],
  [/（採点者はここを見る）/g, '（自己点検の観点）'],
  [/採点者がどこで減点する(?:の)?かを知り/g, '読み手の立場で、どこが伝わりにくいかを知り'],
  [/（採点者は接続の論理性を見ています）/g, '（接続の論理性が問われるところです）'],
  [/採点者の視点(?:で見る|の)チェックポイント/g, '読み手の視点での自己点検'],
  [/採点者が答案のどこを見るかを整理しました/g, '答案のどこが読み手に伝わりやすいかを整理しました'],
];

export const LEAD = '採点基準は公表されていません。以下は、筆者が読み手の立場で見た自己点検の観点です。';
const LEAD_MARK = '採点基準は公表されていません';

/** エディタに出る行か（frontmatter の後の本文で、H1・画像・HTML コメントを除く）。 */
function visibleFlags(lines) {
  const flags = [];
  let inComment = false; let seenH1 = false;
  for (const l of lines) {
    const t = l.trim();
    let vis = true;
    if (inComment) { vis = false; if (t.includes('-->')) inComment = false; }
    else if (t.startsWith('<!--')) { vis = false; if (!t.includes('-->')) inComment = true; }
    else if (!seenH1 && /^#\s/.test(t)) { vis = false; seenH1 = true; }
    else if (/^!\[[^\]]*\]\([^)]*\)\s*$/.test(t)) vis = false;
    flags.push(vis);
  }
  return flags;
}

const count = (s, w) => s.split(w).length - 1;
const headingText = (l) => l.replace(/^#+\s*/, '').replace(/\*\*|__/g, '').trim();

/**
 * 1 記事を直す（純関数）。{ changed, raw, ops, reason } を返す。raw は改行コードを保った新しい中身。
 */
export function fixArticle(rawIn) {
  const crlf = rawIn.includes('\r\n');
  const raw = rawIn.replace(/\r\n/g, '\n');
  const fm = raw.match(/^﻿?---\n[\s\S]*?\n---\n/)?.[0] ?? '';
  const lines = raw.slice(fm.length).split('\n');
  const vis = visibleFlags(lines);

  // お詫びと訂正の節の中に対象の語があれば直さない
  let inApology = false;
  for (const l of lines) {
    if (/^#+\s/.test(l)) inApology = /お詫びと訂正/.test(l);
    if (inApology && REPLACEMENTS.some(([f]) => l.includes(f))) return { changed: false, reason: 'お詫びと訂正の節に対象の語がある' };
  }

  const ops = [];
  const out = lines.slice();
  for (const [from, to] of REPLACEMENTS) {
    let n = 0;
    for (let i = 0; i < out.length; i++) {
      if (!vis[i] || !out[i].includes(from)) continue;
      n += count(out[i], from);
      out[i] = out[i].split(from).join(to);
    }
    if (n) ops.push({ op: 'replace', from, to, count: n });
  }
  // 本文の文: 一致した文字列ごとに置き換えの操作を作る（公開ページの文と同じになるものだけ）
  for (const [re, rep] of PROSE) {
    const found = new Map();
    for (let i = 0; i < out.length; i++) {
      if (!vis[i]) continue;
      out[i] = out[i].replace(re, (...m) => {
        const from = m[0];
        if (/\*\*|[[\]_`]/.test(from)) return from;
        const to = from.replace(new RegExp(re.source), rep);
        found.set(from, { to, n: (found.get(from)?.n || 0) + 1 });
        return to;
      });
    }
    for (const [from, { to, n }] of found) ops.push({ op: 'replace', from, to, count: n });
  }
  if (!ops.length) return { changed: false };

  // 前置き: 直した見出しのうち最初の 1 つの直後
  const renamed = new Set(REPLACEMENTS.map(([, to]) => to));
  if (!out.some((l) => l.includes(LEAD_MARK))) {
    const idx = out.findIndex((l, i) => vis[i] && /^#{2,4}\s/.test(l) && lines[i] !== l && [...renamed].some((t) => l.includes(t)));
    if (idx >= 0) {
      const heading = headingText(out[idx]);
      const headings = out.filter((l, i) => vis[i] && /^#{2,4}\s/.test(l) && headingText(l) === heading).length;
      out.splice(idx + 1, 0, '', LEAD);
      vis.splice(idx + 1, 0, true, true);
      ops.push({ op: 'insert-after', heading, text: LEAD, headings, count: 1 });
    }
  }
  let next = fm + out.join('\n');
  if (crlf) next = next.replace(/\n/g, '\r\n');
  return { changed: next !== rawIn, raw: next, ops };
}

function main() {
  const args = parseCliArgs({ write: { type: 'boolean' }, only: { type: 'string' }, out: { type: 'string', default: 'grader-claims.json' } });
  const files = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'content/note'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n').filter((f) => /\/article(-[^/]+)?\.md$/.test(f) && (!args.only || f.startsWith(args.only)));
  const items = []; const held = []; let changed = 0; let unpublished = 0;
  for (const rel of files) {
    const abs = join(REPO_ROOT, rel);
    const raw = readFileSync(abs, 'utf8');
    const r = fixArticle(raw);
    if (r.reason) { held.push({ rel, reason: r.reason }); continue; }
    if (!r.changed) continue;
    changed++;
    const noteId = (raw.match(/^noteId:\s*["']?(n[0-9a-f]+)/m) || [])[1];
    if (noteId) items.push({ article: rel, baseHash: bodyHash(raw), afterHash: bodyHash(r.raw), ops: r.ops });
    else unpublished++;
    if (args.write) writeFileSync(abs, r.raw);
  }
  console.log(`[fix-note-grader-claims] 検査 ${files.length} 記事 / 直す ${changed} 記事（公開済み ${items.length}・未公開 ${unpublished}）/ 保留 ${held.length}${args.write ? '' : '（確認だけ・書いていない）'}`);
  for (const h of held) console.log(`  保留: ${h.rel}（${h.reason}）`);
  if (args.write) {
    const dir = join(REPO_ROOT, '.tmp/note-patches');
    mkdirSync(dir, { recursive: true });
    const out = join(dir, args.out);
    const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).items || [] : [];
    const merged = [...prev.filter((p) => !items.some((i) => i.article === p.article)), ...items];
    writeFileSync(out, JSON.stringify({ createdAt: new Date().toISOString(), items: merged }, null, 2) + '\n');
    console.log(`[fix-note-grader-claims] patches: .tmp/note-patches/${args.out}（${merged.length} 記事）`);
  }
  if (!files.length) { console.error('[fix-note-grader-claims] 検査対象 0 件（検査不成立）'); process.exit(1); }
}

if (isCliEntry(import.meta.url)) main();

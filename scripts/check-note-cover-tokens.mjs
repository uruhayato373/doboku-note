#!/usr/bin/env node
/**
 * check-note-cover-tokens.mjs — note カバーの資格トークンが実ディレクトリを網羅しているか
 * ---------------------------------------------------------------------------
 * 背景（2026-08-18）: `content/note/技術士一次/` が note-cover-tokens.json に未登録で、
 *   `generate-note-covers.mjs` の resolveExam が**無言で pe-comprehensive へフォールバック**
 *   していた。色（#16365C）はサイト SSOT が「総監・第一次＝濃紺」と宣言する共有色なので
 *   誤りではないが、fallback は label も総監のものを渡すため、
 *   **カバーの資格表記が「技術士（総合技術監理部門）」のまま出荷**されていた。
 *   対象は `一次択一-過去問PDF`（n466132e6fd74・¥1,480）で、2026-07-11 の公開から
 *   1 か月以上その状態だった。
 *
 *   fallback 自体は同日に throw へ変えたが、**それは「生成したときに気づく」だけ**で、
 *   全件生成は数分かかるため日常的には走らない。ここは同じ欠陥をミリ秒で検出する。
 *
 * 照合の意味論（重要）:
 *   resolveExam は最上位 dir ではなく `dirName.split('/')` の**任意セグメント**を
 *   tokens の dir と突き合わせる（`1級・2級土木/1級土木/...` は 2 段目の "1級土木" で
 *   civil-1 に解決される）。**このゲートも同じ規則で照合する** — 最上位だけを見ると
 *   civil-1 / civil-2 が「実在しない」と誤検出され、構造的に必ず赤いゲート＝偽赤になる
 *   （初版がこれで落ちた。偽赤は偽緑と同じくらい害がある）。
 *
 * 検査（双方向）:
 *   1. article*.md を持つ dir の**どのセグメントも** tokens に一致しない＝フォールバックの入口
 *   2. tokens の dir を含む記事 dir が 1 件も無い＝死んだエントリ（リネーム漏れ）
 *   3. label / short / base / deep / accent が欠けていないか（fallback 時に化ける値）
 *
 * 検査ゼロを PASS と呼ばない（CLAUDE.md §9）: 対象 dir 数と実検査数を必ず出力し、
 * 走査結果が 0 件なら「検査不成立」として exit 2 で落とす。
 *
 * 使い方:
 *   node scripts/check-note-cover-tokens.mjs
 *   node scripts/check-note-cover-tokens.mjs --json
 *
 * exit: 0 合格 / 1 違反 / 2 検査不成立（tokens 不読・note ディレクトリ不在・走査 0 件）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// 照合は生成器の実装をそのまま使う。ここで書き直すと 2 実装がドリフトし、
// ゲートだけが正しく解決できない（civil-1 を civil-1-2 より先に見る特別扱いを取りこぼす）。
import { resolveExam } from './generate-note-covers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = join(ROOT, 'content/note');
const TOKENS = '.claude/knowledge/design-system/note-cover-tokens.json';
const JSON_OUT = process.argv.includes('--json');

/** 必須フィールド。欠けると fallback 時に undefined が描画へ流れる。 */
const REQUIRED = ['dir', 'label', 'short', 'base', 'deep', 'accent'];

/** 型別ファイル（article-II1.md 等）も記事として数える。 */
const ARTICLE_RE = /^article(-[^/\\]+)?\.md$/;

/** article*.md を持つディレクトリの相対パスを列挙する。 */
function collectArticleDirs(base, rel, out) {
  let entries;
  try {
    entries = readdirSync(base, { withFileTypes: true });
  } catch {
    return out;
  }
  if (rel && entries.some((e) => e.isFile() && ARTICLE_RE.test(e.name))) out.push(rel);
  for (const e of entries) {
    if (e.isDirectory()) {
      collectArticleDirs(join(base, e.name), rel ? `${rel}/${e.name}` : e.name, out);
    }
  }
  return out;
}

function main() {
  if (!existsSync(NOTE_DIR)) {
    console.error('✗ 検査不成立: content/note が無い');
    process.exit(2);
  }
  let tokens;
  try {
    tokens = JSON.parse(readFileSync(join(ROOT, TOKENS), 'utf8'));
  } catch (e) {
    console.error(`✗ 検査不成立: ${TOKENS} を読めない（${e.message}）`);
    process.exit(2);
  }

  const exams = Object.entries(tokens.exams ?? {}).filter(
    ([k, v]) => k !== 'comment' && v && typeof v === 'object',
  );
  if (!exams.length) {
    console.error('✗ 検査不成立: tokens.exams が空（パース契約の破損を疑う）');
    process.exit(2);
  }

  const articleDirs = collectArticleDirs(NOTE_DIR, '', []);
  if (!articleDirs.length) {
    console.error('✗ 検査不成立: content/note に article*.md を持つ dir が 1 件も無い');
    process.exit(2);
  }

  const violations = [];
  const usedSlugs = new Set();

  // 1) resolveExam が解決できない記事 dir＝無言フォールバックの入口（現在は throw）。
  //    最上位セグメントごとに 1 件へまとめる（同じ試験配下の数百件を全部並べない）。
  const unresolved = new Map();
  for (const d of articleDirs) {
    try {
      usedSlugs.add(resolveExam(d));
    } catch {
      const top = d.split('/')[0];
      unresolved.set(top, (unresolved.get(top) ?? 0) + 1);
    }
  }
  for (const [top, n] of unresolved) {
    violations.push({
      rule: 'missing-entry',
      at: `content/note/${top}`,
      msg: `どのパスセグメントも tokens.exams の dir に一致しない（記事 ${n} 件）＝カバー生成が総監へフォールバックする。既存試験と同じ色でよい場合も明示的に列挙する`,
    });
  }

  // 2) 死んだエントリ（どの記事 dir からも参照されない宣言）
  for (const [slug, v] of exams) {
    if (v.dir && !usedSlugs.has(slug)) {
      violations.push({
        rule: 'dead-entry',
        at: `${TOKENS} exams.${slug}`,
        msg: `dir="${v.dir}" を含む記事ディレクトリが content/note に 1 件も無い（リネーム漏れ or 未使用）`,
      });
    }
  }

  // 3) 必須フィールドの欠落
  for (const [slug, v] of exams) {
    const missing = REQUIRED.filter((k) => !v[k]);
    if (missing.length) {
      violations.push({
        rule: 'missing-field',
        at: `${TOKENS} exams.${slug}`,
        msg: `必須フィールド欠落: ${missing.join(' / ')}`,
      });
    }
  }

  const summary = `[check-note-cover-tokens] 記事 dir ${articleDirs.length} 件 / tokens エントリ ${exams.length} 件 を実検査 / 違反 ${violations.length} 件`;

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        { articleDirs: articleDirs.length, exams: exams.length, used: [...usedSlugs], violations },
        null,
        2,
      ),
    );
    process.exit(violations.length ? 1 : 0);
  }

  console.log(summary);
  if (!violations.length) {
    console.log('[check-note-cover-tokens] ✓ 全 note 記事ディレクトリが資格トークンへ明示的に解決される');
    process.exit(0);
  }
  for (const v of violations) console.error(`  [${v.rule}] ${v.at}  ${v.msg}`);
  console.error(
    `\n真実源: ${TOKENS}。dir を足したら label / short / base / deep / soft / accent も埋めること。\n` +
      '色を既存試験と共有する場合（例: 技術士第一次＝総監と同じ濃紺）も、\n' +
      '**省略せず明示的に列挙する** — fallback で偶然そこへ着地する経路を残さないため。\n',
  );
  process.exit(1);
}

main();

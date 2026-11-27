#!/usr/bin/env node
/**
 * check-note-overclaim.mjs — note 記事の「根拠の無い言い切り」（採点を断定する語・決まりのように書く語・読者を見下す語）を
 * 基準線のラチェットで止める。
 *
 * なぜ要るか: 2026-11-27、note の無料記事が筆者の目安を「鉄則」「減点必至」「採点上きわめて重要」と採点基準のように
 * 書いていて、読者を不安にさせた（採点基準は公表されておらず、運営者は採点者ではない）。note-lint は書式しか見ない。
 * 語の一覧と判定は scripts/lib/note-overclaim.mjs だけが持つ。
 *
 * 使い方:
 *   npm run check-note-overclaim                                # content/note の article*.md を全件（CI）
 *   node scripts/checks/check-note-overclaim.mjs --staged       # staged の note 記事だけ（pre-commit）
 *   npm run check-note-overclaim -- --update                    # 減った記事の基準線を下げる（増えた記事は上げない）
 *   npm run check-note-overclaim -- --update --allow-increase   # 基準線を現状に書き直す（増える方向も。初期化用）
 *
 * 判定: 記事ごとに、基準線 .claude/config/note-overclaim-baseline.json の件数より増えたら exit 1。
 *       基準線に無い記事は 0 件が条件。減った記事は「基準線を下げられる」と知らせるだけ（exit 0）。
 * 終了コード: 0 = 増加なし / 1 = 増えた記事がある・読めない記事がある・全件で検査対象 0 件（検査不成立）
 *
 * 罠:
 * - 以前の書き方を引用する行（お詫びと訂正）は行末に `<!-- overclaim-ok: 理由 -->`。理由が空だと除外されない。
 * - 「合格を保証するものではありません」のような断り書きは拾わない（lib の冒頭）。
 * - 件数は記事ごとの合計で比べる。1 つ直して 1 つ足すと通る（語ごとには持たない）。
 * - --update は全件のときだけ（--staged とは併用できない）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { isCliEntry, runAsCli } from '../lib/cli-run.mjs';
import { listFiles } from '../lib/fs-walk.mjs';
import { readJson, writeJson } from '../lib/json-io.mjs';
import { OVERCLAIM_RULES, compareWithBaseline, findOverclaims, isNoteArticleName, nextBaseline } from '../lib/note-overclaim.mjs';
import { AGENT_CONFIG_ROOT, NOTE_CONTENT_ROOT, REPO_ROOT } from '../lib/repository-paths.mjs';

const TAG = '[check-note-overclaim]';
const toRel = (abs) => relative(REPO_ROOT, abs).split('\\').join('/');
const BASELINE_REL = `${toRel(AGENT_CONFIG_ROOT)}/note-overclaim-baseline.json`;
const NOTE_REL = toRel(NOTE_CONTENT_ROOT);

/** staged（追加・変更）の note 記事。日本語のパスをそのまま受けるため quotepath=false と -z */
function stagedArticles() {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM', '-z'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  return out
    .split('\0')
    .filter((f) => f.startsWith(`${NOTE_REL}/`) && isNoteArticleName(basename(f)) && existsSync(join(REPO_ROOT, f)))
    .map((f) => join(REPO_ROOT, f));
}

export async function run({ argv = process.argv.slice(2) } = {}) {
  const args = parseCliArgs({ staged: { type: 'boolean' }, update: { type: 'boolean' }, 'allow-increase': { type: 'boolean' } }, argv);
  if (args.staged && args.update) {
    console.error(`${TAG} ✗ --update は全件のときだけ使える（--staged とは併用しない）`);
    return { code: 1 };
  }
  const scope = args.staged ? 'staged の note 記事' : `${NOTE_REL} の article*.md`;
  const files = args.staged ? stagedArticles() : listFiles(NOTE_CONTENT_ROOT, { match: (_p, name) => isNoteArticleName(name), allowMissing: true });

  if (files.length === 0) {
    if (args.staged) {
      console.log(`${TAG} 検査対象 0 件（staged に note 記事が無い＝何も検査していない）`);
      return { code: 0 };
    }
    console.error(`${TAG} ✗ 検査対象 0 件（${scope} が見つからない＝検査不成立）`);
    return { code: 1 };
  }

  const baselineDoc = readJson(REPO_ROOT, BASELINE_REL);
  const baseline = baselineDoc.files;

  const counts = {};
  const hitsByFile = {};
  const byRule = {};
  const unreadable = [];
  for (const abs of files) {
    const rel = toRel(abs);
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch (e) {
      unreadable.push(`${rel}（${e.code ?? e.message}）`);
      continue;
    }
    const hits = findOverclaims(text);
    counts[rel] = hits.length;
    if (hits.length) hitsByFile[rel] = hits;
    for (const h of hits) byRule[h.rule] = (byRule[h.rule] ?? 0) + 1;
  }

  const checked = Object.keys(counts).length;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const { increased, decreased } = compareWithBaseline(counts, baseline, { allFiles: !args.staged });

  console.log(`${TAG} 検査対象 ${files.length} 記事（${scope}）/ 実検査 ${checked} 記事 / 違反のある記事 ${Object.keys(hitsByFile).length} / 違反の総数 ${total}`);
  if (total) console.log(`${TAG} 語ごと: ${OVERCLAIM_RULES.filter((r) => byRule[r.id]).map((r) => `${r.id} ${byRule[r.id]}`).join(' / ')}`);

  if (args.update) {
    const next = nextBaseline(counts, baseline, { allowIncrease: args.allowIncrease });
    const { changed } = writeJson(REPO_ROOT, BASELINE_REL, { ...baselineDoc, files: next });
    const sum = Object.values(next).reduce((a, b) => a + b, 0);
    console.log(`${TAG} 基準線を${changed ? '書き直した' : '変えていない（同じ中身）'}: ${Object.keys(next).length} 記事・${sum} 件（${BASELINE_REL}）`);
    if (args.allowIncrease || increased.length === 0) return { code: unreadable.length ? 1 : 0 };
    console.error(`${TAG} 増えた ${increased.length} 記事は上げていない（上げるなら --update --allow-increase）`);
  }

  for (const u of unreadable) console.error(`${TAG} ✗ 読めない: ${u}`);

  if (decreased.length && !args.update) {
    console.log(`${TAG} 基準線を下げられる ${decreased.length} 記事（npm run check-note-overclaim -- --update）:`);
    for (const d of decreased.slice(0, 20)) console.log(`  ${d.file}: ${d.base} → ${d.now}`);
    if (decreased.length > 20) console.log(`  … 他 ${decreased.length - 20} 記事`);
  }

  if (increased.length) {
    console.error(`${TAG} ✗ 根拠の無い言い切りが基準線より増えた記事 ${increased.length} 件:`);
    for (const inc of increased) {
      console.error(`  ${inc.file}: 基準線 ${inc.base} → 今 ${inc.now}`);
      for (const h of hitsByFile[inc.file] ?? []) console.error(`    ${h.line} 行目「${h.match}」 ${h.text}`);
    }
    console.error('  採点基準は公表されていない。筆者の目安は「目安」「おすすめ」と書き、採点の結果を言い切らない。');
    console.error('  以前の書き方を引用する行（お詫びと訂正）だけ、行末に <!-- overclaim-ok: 理由 --> を付ける。');
    return { code: 1 };
  }
  if (unreadable.length) return { code: 1 };

  console.log(`${TAG} ✓ ${checked} 記事を検査・基準線（${Object.keys(baseline).length} 記事）より増えた記事なし`);
  return { code: 0 };
}

if (isCliEntry(import.meta.url)) runAsCli(run);

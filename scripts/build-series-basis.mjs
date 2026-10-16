#!/usr/bin/env node
/**
 * build-series-basis.mjs — 書籍の網羅の判定から、書籍の全項目の割り当て（config/content-series-basis.json）を作る
 * ---------------------------------------------------------------------------
 * なぜ: 割り当て（本の全項目 → シリーズの章・ほかの記事・使わない）は、本の情報が漏れなく行き先を持つことを
 * check-content-series で機械に見張らせる台帳。2026-10-16 時点で 27 冊中 5 冊（シリーズの根拠にした本）にしか無く、
 * 残りの本は「展開済み」でも、どの項目がどの記事に入ったか・何を使わなかったかを台帳で追えなかった。
 * 判定（Drive の coverage/verdict.json）と展開計画から機械で作り、シリーズの章へ結ぶ所だけ人が直す。
 * 決め方は scripts/lib/series-basis-build.mjs。「当時のサイトの範囲の外」で使わなかった項目には revisit を付け、
 * シリーズを作るときに判定し直す候補として数える（check-content-series が本ごとに件数を出す）。
 *
 * 前提: 候補表と判定を手元に取り戻しておく（node scripts/drive-vault-sync.mjs --pull --group reference-book-coverage --commit）。
 *
 * CLI:
 *   node scripts/build-series-basis.mjs                     # 台帳に無い本を全部、下見（書かない）
 *   node scripts/build-series-basis.mjs --book <id>         # 1 冊だけ（台帳にある本は --replace が要る）
 *   node scripts/build-series-basis.mjs --commit            # 書く
 * exit: 0 = 書けた・下見できた / 1 = 割り当てられない項目がある（記事が無い） / 2 = 検査不成立（候補表が無い・対象 0 冊）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { buildBookBasis } from './lib/series-basis-build.mjs';
import { REPO_ROOT as ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const TAG = '[build-series-basis]';
const args = parseCliArgs({ book: { type: 'string', multiple: true }, commit: { type: 'boolean' }, replace: { type: 'boolean' } });

const refs = readDataset(ROOT, 'config.reference-sources').sources;
const basis = readDataset(ROOT, 'config.content-series-basis');
const books = refs.filter((s) => ['commercial-book', 'operator-owned'].includes(s.class) && s.bookBundle?.directory);
const targets = (args.book?.length ? books.filter((s) => args.book.includes(s.id)) : books.filter((s) => !basis.books[s.id]));
if (args.book?.length && targets.length !== args.book.length) { console.error(`${TAG} 参考文献の台帳に無い本: ${args.book.filter((b) => !books.some((s) => s.id === b)).join(', ')}`); process.exit(2); }
if (targets.length === 0) { console.log(`${TAG} 台帳に無い本は 0 冊（全冊が割り当て済み）`); process.exit(0); }

const resolveArticle = (key) => {
  for (const rel of [`${key}/article.mdx`, `${key}.mdx`]) if (existsSync(join(SITE_CONTENT_ROOT, ...rel.split('/')))) return `content/site/${rel}`;
  return null;
};

let built = 0, skipped = 0, unresolvedTotal = 0;
for (const src of targets) {
  if (basis.books[src.id] && !args.replace) { console.log(`${TAG} ${src.id}: 台帳にある（作り直すなら --replace）`); skipped++; continue; }
  const dir = join(ROOT, 'content', 'sources', 'books', src.bookBundle.directory, 'coverage');
  const candFile = join(dir, 'candidates.json'), verdictFile = join(dir, 'verdict.json');
  if (!existsSync(candFile)) { console.log(`${TAG} ${src.id}: 候補表が手元に無い（未判定の本か、node scripts/drive-vault-sync.mjs --pull --group reference-book-coverage --commit が要る）`); skipped++; continue; }
  const candidates = JSON.parse(readFileSync(candFile, 'utf8'));
  const verdict = existsSync(verdictFile) ? JSON.parse(readFileSync(verdictFile, 'utf8')) : { units: [], plan: [] };
  const r = buildBookBasis(candidates, verdict, resolveArticle);
  unresolvedTotal += r.unresolved.length;
  console.log(`${TAG} ${src.id}: 項目 ${candidates.units.length} / 記事 ${r.counts.article} / 使わない ${r.counts.excluded}（うち判定し直す候補 ${r.counts.revisit}）${r.unresolved.length ? ` / 割り当てられない ${r.unresolved.length}: ${r.unresolved.slice(0, 8).join(',')}` : ''}`);
  if (r.unresolved.length) continue;
  basis.books[src.id] = { units: r.units, pages: r.pages };
  built++;
}
console.log(`${TAG} 対象 ${targets.length} 冊 / 作った ${built} 冊 / 飛ばした ${skipped} 冊 / 割り当てられない項目 ${unresolvedTotal}${args.commit ? '' : '（下見のため書いていない。書くなら --commit）'}`);
if (built === 0 && unresolvedTotal === 0 && skipped === targets.length) process.exit(2);
if (args.commit && built > 0) writeDataset(ROOT, 'config.content-series-basis', basis);
if (unresolvedTotal > 0) process.exit(1);

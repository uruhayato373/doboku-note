#!/usr/bin/env node
/**
 * egov-laws.mjs — 記事の e-Gov 法令検索へのリンクと参考文献の台帳の法令を、e-Gov 法令 API の写し
 * （config/egov-laws.json）で照合する。照合の中身は scripts/lib/egov-laws.mjs。
 *
 * 使い方: npm run egov-laws [-- --sync | --drift]
 *   （既定）  手元の写しと照合する（通信しない・CI）。記事のリンクの法令 ID と条、台帳の法令の egov を見る
 *   --sync   記事がリンクする法令・法令ページの法令（lawId・lawFamily）・参考文献と計画・施策の台帳の法令を
 *            e-Gov 法令 API から取り直して写しを書く（どこからも指されない法令は写しから消える）
 *   --drift  写しより後に改正が施行された法令と、それにリンクする記事を出す（通信する・ops）。
 *            改正を記事に反映したら --sync で写しを進める
 *
 * exit: 0 違反なし / 1 違反あり・改正あり / 2 検査不成立（記事 0 本・取得失敗が支配的）
 */
import { relative } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listSiteMdx } from './lib/mdx-files.mjs';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';
import { egovLinksOf, fetchEgovLaw, linkIssues, registryIssues, amendedSince, referencedLawIds } from './lib/egov-laws.mjs';

const NAME = 'egov-laws';
const args = parseCliArgs({ sync: { type: 'boolean' }, drift: { type: 'boolean' } });
const files = listSiteMdx({ allowMissing: true }).map((abs) => ({ abs, rel: relative(REPO_ROOT, abs).split('\\').join('/') }));
const sources = readDataset(REPO_ROOT, 'config.reference-sources').sources;
const current = readDatasetIf(REPO_ROOT, 'config.egov-laws');

if (files.length === 0) {
  console.error(`[${NAME}] 検査不成立: 記事が 0 本`);
  process.exitCode = 2;
} else if (args.sync) sync();
else if (args.drift) drift();
else check();

function referencedIds() {
  const docs = files.map((f) => {
    const text = readFileSync(f.abs, 'utf8');
    return { text, data: matter(text).data };
  });
  const policies = readDatasetIf(REPO_ROOT, 'config.policy-registry')?.policies ?? [];
  return referencedLawIds({ docs, sources, policies });
}

function fetchAll(ids) {
  const out = {};
  for (const id of ids) out[id] = fetchEgovLaw(id);
  return out;
}

function sync() {
  const ids = referencedIds();
  const got = fetchAll(ids);
  const failed = Object.entries(got).filter(([, v]) => v.error && !v.missing);
  const missing = Object.entries(got).filter(([, v]) => v.missing);
  console.log(`[${NAME}] 法令 ${ids.length} 本を取得 / 取得失敗 ${failed.length} / e-Gov に無い ID ${missing.length}`);
  for (const [id] of missing) console.error(`  ✗ ${id}: e-Gov に無い法令 ID（記事か台帳の ID を直す）`);
  if (fetchFailDominant(failed.length, ids.length)) {
    console.error(`[${NAME}] 検査不成立: 取得失敗が多い（${failed.length}/${ids.length}）。写しは書かない`);
    process.exitCode = 2;
    return;
  }
  const laws = {};
  for (const [id, v] of Object.entries(got)) {
    if (!v.error) laws[id] = v;
    else if (current?.laws?.[id]) laws[id] = current.laws[id]; // 一時的な取得失敗は前の写しを残す
  }
  writeDataset(REPO_ROOT, 'config.egov-laws', {
    schemaVersion: 1,
    description: '記事がリンクする e-Gov の法令と、法令ページ・参考文献の台帳・計画・施策の台帳が指す法令の写し（法令 ID・題名・法令番号・最新の改正の施行日・本則の条）。npm run egov-laws -- --sync が書く',
    fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    laws,
  });
  console.log(`[${NAME}] 写しを書いた（${Object.keys(laws).length} 法令）`);
  process.exitCode = missing.length ? 1 : 0;
}

function check() {
  if (!current) {
    console.error(`[${NAME}] 検査不成立: e-Gov の写し（config.egov-laws）が無い（npm run egov-laws -- --sync）`);
    process.exitCode = 2;
    return;
  }
  const { issues: li, links } = linkIssues(files, current.laws);
  const { issues: ri, checked } = registryIssues(sources, current.laws);
  console.log(`[${NAME}] 記事 ${files.length} 本・e-Gov へのリンク ${links} か所 / 参考文献の台帳の法令 ${checked} 件を、写し ${Object.keys(current.laws).length} 法令（${current.fetchedAt}）と照合`);
  for (const i of [...li, ...ri]) console.error(`  ✗ ${i}`);
  console.log(`[${NAME}] ${li.length + ri.length ? '✗ FAIL' : '✓ PASS'}（違反 ${li.length + ri.length} 件）`);
  process.exitCode = li.length + ri.length ? 1 : 0;
}

function drift() {
  if (!current) {
    console.error(`[${NAME}] 検査不成立: e-Gov の写し（config.egov-laws）が無い`);
    process.exitCode = 2;
    return;
  }
  const ids = Object.keys(current.laws);
  const fresh = fetchAll(ids);
  const failed = Object.values(fresh).filter((v) => v.error).length;
  if (fetchFailDominant(failed, ids.length)) {
    console.error(`[${NAME}] 検査不成立: 取得失敗が多い（${failed}/${ids.length}）`);
    process.exitCode = 2;
    return;
  }
  const amended = amendedSince(current.laws, fresh);
  console.log(`[${NAME}] 法令 ${ids.length} 本の改正を確認（取得失敗 ${failed}）/ 写しより後に施行された改正 ${amended.length} 本`);
  for (const a of amended) {
    const citing = files.filter((f) => egovLinksOf(readFileSync(f.abs, 'utf8')).some((l) => l.lawId === a.lawId)).map((f) => f.rel);
    console.log(`  ! ${a.title}: ${a.before ?? '不明'} → ${a.now} 施行の改正。リンクする記事 ${citing.length} 本`);
    for (const c of citing.slice(0, 20)) console.log(`      ${c}`);
  }
  if (amended.length) console.log(`[${NAME}] 記事を改正に合わせて確かめたら npm run egov-laws -- --sync で写しを進める`);
  process.exitCode = amended.length ? 1 : 0;
}

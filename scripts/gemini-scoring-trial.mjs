#!/usr/bin/env node
/**
 * gemini-scoring-trial.mjs — Gemini（無料枠）の一次採点が、Claude の評価役の採点とどこまで一致するかを試す（DN-0939）。
 *
 * 流入（GSC の表示回数）の多い公開記事を、評価役ごとに選ぶ（cem-qa＝総監のキーワード解説、guide-qa＝試験ガイドと建設部門の
 * 論文テーマ解説、civil-construction-qa の校正モード＝土木・コンクリの教科書）。Gemini には全件を、同じ評価役の採点基準の文章・
 * 同じ軸の名前・機械チェック（lint-mdx-mobile）の結果と一緒に渡す。そのうち評価役ごとの上位（標本）だけを Claude の評価役でも採点し
 * （親がサブエージェントで回して record で取り込む）、軸ごとの一致率を出す。送るのは公開済みのサイト記事だけ
 * （記憶 feedback_gemini_text_public_only）。過去の採点ファイルは 2026-08-22 の履歴の切り詰めより前の版を取り出せないので使わない。
 *
 *   npm run gemini-scoring-trial -- select [--limit 100] [--sample-each 8]   対象と標本を選び、記録を作り直す
 *   npm run gemini-scoring-trial -- run [--max N] [--model gemini-3.8-flash] [--interval-ms 6000]
 *                                                             未採点の対象を Gemini で採点する（途中で止めても続きから）
 *   npm run gemini-scoring-trial -- record --file <json>      Claude の評価役の採点（[{rel, scores}]）を取り込む
 *   npm run gemini-scoring-trial -- compare [--model …]       そのモデルの軸ごとの一致率を出し、記録に書く（無料枠の 1 日の回数はモデルごと。
 *                                                             gemini-3.8-flash は 20 回／日だった）
 *
 * 記録: .claude/state/quality/gemini-trial.json（台帳 state.gemini-trial）。過去問は対象にしない（past-exam-qa の軸の名前が採点ファイルと
 * 違い、今回の比較の外に置く）。
 * 終了コード: 0 = 成功 / 1 = 失敗（API の拒否・読めない応答が多い） / 2 = 対象 0 件・材料が無い（検査不成立）
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { REPO_ROOT, CLAUDE_ROOT, DOCS_ROOT } from './lib/repository-paths.mjs';
import { listSiteMdx } from './lib/mdx-files.mjs';
import { readDatasetIf, readLatest } from './lib/dataset-io.mjs';
import { writeJson } from './lib/json-io.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { geminiInteract, parseJsonReply, sleepMs } from './lib/gemini-api.mjs';
import { countMetrics, stripFrontmatter } from './lib/page-quality-profiles.mjs';

const TRIAL_FILE = datasetPath('state.gemini-trial');
const DEFAULT_MODEL = 'gemini-3.8-flash';
/** 合否ライン（quality-cycle 共通） */
const PASS = 2.0;
/**
 * 採用の基準: 件数 8 以上・完全一致 70% 以上に加えて、Claude が 3 未満を付けた軸（直すべき軸）を Gemini も 3 未満にできた割合（検出率）が
 * 70% 以上で、その件数が 3 以上の軸だけを一次採点に使う。両方が満点の一致だけで率が高く見えるのを除くため（2026-11-02 の試行で、
 * 完全一致が高い軸でも見逃しが多かった）。
 */
const ADOPT_EXACT = 0.7;
const ADOPT_MIN_N = 8;
const ADOPT_DETECT = 0.7;
const ADOPT_MIN_FLAGGED = 3;

/** 評価役ごとの軸（採点ファイルのキー）・重み・採点基準の文章の置き場 */
const FAMILIES = {
  'cem-qa': {
    axes: { structure: '構造', mobile: 'モバイル視認性', principle: 'コンテンツ原則', reference: '参考資料', linking: '関連付け' },
    weights: { structure: 0.3, mobile: 0.25, principle: 0.2, reference: 0.15, linking: 0.1 },
    rubric: { file: join(DOCS_ROOT, 'editorial', '02_採点ルーブリック方針.md'), from: '## 5 軸ルーブリック', to: '## 採点フロー' },
  },
  'civil-construction-qa': {
    axes: { structure: '構造', principle: 'テキスト原則', mobile: 'モバイル視認性', figures: '図表の適切性', reference: '参考資料・関連付け' },
    weights: { structure: 0.2, principle: 0.2, mobile: 0.3, figures: 0.15, reference: 0.15 },
    rubric: { file: join(CLAUDE_ROOT, 'agents', 'civil-construction-qa.md'), from: '### Mode R', to: '**手順**' },
  },
  'guide-qa': {
    axes: { intro: '導入の質', readability: '読みやすさ・文体', volume: 'ボリューム・網羅', funnel: 'コンバージョン導線・末尾', mobile: 'モバイル視認性・構造' },
    weights: { intro: 0.25, readability: 0.2, volume: 0.2, funnel: 0.2, mobile: 0.15 },
    rubric: { file: join(CLAUDE_ROOT, 'agents', 'guide-qa.md'), from: '## 品質ルーブリック（ガイド5軸）', to: '### 実務・法令モード' },
  },
};
/** 記事の評価役（config/page-quality-profiles.json の割り当てのうち、今回の比較に入れるもの）。外れは null */
export function familyOf({ category, group }) {
  if (group === 'keyword' && category === 'pe-comprehensive-management') return 'cem-qa';
  if (group === 'keyword' && category === 'pe-construction') return 'guide-qa';
  if (group === 'guide' && !['civil-practice', 'laws'].includes(category)) return 'guide-qa';
  if (group === 'textbook') return 'civil-construction-qa';
  return null;
}

/** 加重合計（どれか 1 軸でも 0 点なら 1.0 にクランプ＝各評価役の共通規則） */
export function weightedScore(scores, weights) {
  if (Object.values(scores).some((v) => v === 0)) return 1.0;
  return Math.round(Object.entries(weights).reduce((a, [k, w]) => a + (scores[k] ?? 0) * w, 0) * 100) / 100;
}

/**
 * 軸ごとの一致率。pairs は {family, claude:{scores}, gemini:{scores}}。
 * flagged は Claude が 3 未満を付けた件数、detect はそのうち Gemini も 3 未満にした割合（直すべき軸を拾えるか）。
 * @returns {Record<string, Record<string, {n:number, exact:number, within1:number, meanDiff:number, flagged:number, detect:number|null}>>}
 */
export function agreement(pairs) {
  const out = {};
  for (const p of pairs) {
    for (const axis of Object.keys(FAMILIES[p.family].axes)) {
      const c = p.claude.scores[axis];
      const g = p.gemini.scores[axis];
      if (typeof c !== 'number' || typeof g !== 'number') continue;
      const cell = ((out[p.family] ??= {})[axis] ??= { n: 0, exact: 0, within1: 0, diffSum: 0, flagged: 0, detected: 0 });
      cell.n += 1;
      cell.exact += c === g ? 1 : 0;
      cell.within1 += Math.abs(c - g) <= 1 ? 1 : 0;
      cell.diffSum += g - c;
      if (c < 3) { cell.flagged += 1; cell.detected += g < 3 ? 1 : 0; }
    }
  }
  for (const fam of Object.values(out)) {
    for (const [axis, c] of Object.entries(fam)) {
      fam[axis] = { n: c.n, exact: round(c.exact / c.n), within1: round(c.within1 / c.n), meanDiff: round(c.diffSum / c.n), flagged: c.flagged, detect: c.flagged ? round(c.detected / c.flagged) : null };
    }
  }
  return out;
}
const round = (x) => Math.round(x * 100) / 100;

// ---- 材料 ---------------------------------------------------------------------------------------

const toRel = (abs) => relative(REPO_ROOT, abs).split(sep).join('/');

function rubricText(family) {
  const { file, from, to } = FAMILIES[family].rubric;
  const text = readFileSync(file, 'utf8');
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error(`${toRel(file)} に採点基準の節（${from}〜${to}）が見つからない`);
  return text.slice(start, end).trim();
}

/** GSC の URL → 記事ファイル（URL の末尾の段か「記事型-末尾」＝記事のディレクトリ名。同名が複数なら URL に資格名を含む方） */
function urlToRelIndex() {
  const byDir = new Map();
  for (const abs of listSiteMdx({ articleOnly: true })) {
    const rel = toRel(abs);
    const dir = rel.split('/').at(-2);
    (byDir.get(dir) ?? byDir.set(dir, []).get(dir)).push(rel);
  }
  return (url) => {
    const segs = new URL(url).pathname.split('/').filter(Boolean);
    // ディレクトリ名は「記事型-名前」のことがある（/exam/<資格>/textbook/scraper ↔ textbook-scraper）
    const list = byDir.get(segs.at(-1)) ?? byDir.get(`${segs.at(-2)}-${segs.at(-1)}`) ?? [];
    return list.length === 1 ? list[0] : (list.find((rel) => segs.includes(rel.split('/')[2])) ?? null);
  };
}

/** lint は置き場（資格のディレクトリ名）で規則を切り替えるので、同じ相対パスの形で .tmp に置いて検査する */
const LINT_ROOT = join(REPO_ROOT, '.tmp', 'gemini-trial');

function lintFindings(rel, raw) {
  const file = join(LINT_ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, raw);
  let out = '';
  try {
    out = execFileSync('node', [join(CLAUDE_ROOT, 'scripts', 'lint-mdx-mobile.mjs'), file], { cwd: REPO_ROOT, encoding: 'utf8' });
  } catch (e) {
    out = String(e.stdout ?? '');
  }
  const lines = out.split('\n').filter((l) => /^\[(HIGH|MEDIUM|LOW)\]/.test(l));
  return lines.length ? lines.join('\n') : '指摘なし';
}

function buildPrompt(page, raw) {
  const fam = FAMILIES[page.family];
  const numbered = raw.split(/\r?\n/).map((l, i) => `${i + 1}: ${l}`).join('\n');
  const keys = Object.entries(fam.axes).map(([k, label]) => `"${k}"（${label}）`).join('・');
  return [
    'あなたは土木・建設系の資格試験対策サイトの記事を採点する評価者です。次の採点基準に厳密に従い、各軸を 0〜3 の整数で採点してください。',
    'リンク先の実在や画像ファイルの中身は確かめられないので、本文に書かれた形と件数から判断してください。',
    '',
    '## 採点基準',
    rubricText(page.family),
    '',
    '## 機械チェック（lint-mdx-mobile）の結果',
    lintFindings(page.rel, raw),
    `本文の字数（frontmatter・タグ・記号・空白を除く）: ${countMetrics(stripFrontmatter(raw)).chars} 字`,
    '',
    `## 採点する記事（${page.rel}・行番号つき）`,
    numbered,
    '',
    '## 出力',
    `JSON だけを返してください。軸のキーは ${keys} の 5 つです。`,
    '{"scores":{"<軸のキー>":0〜3の整数,…},"issues":[{"axis":"<軸のキー>","line":行番号,"severity":"HIGH|MEDIUM|LOW","problem":"40字以内"}]}',
    'issues は重大な順に最大 5 件。',
  ].join('\n');
}

// ---- コマンド -----------------------------------------------------------------------------------

function select({ limit, sampleEach }) {
  const gsc = readLatest(REPO_ROOT, 'gsc.reports');
  const rows = gsc?.data?.reports?.page?.rows;
  if (!rows?.length) { console.error('[gemini-trial] 検査不成立: GSC のページ別データが無い'); process.exit(2); }
  const relOf = urlToRelIndex();
  const impressions = new Map();
  let unmatched = 0;
  for (const r of rows) {
    const rel = relOf(r.keys[0]);
    if (!rel) { unmatched += 1; continue; }
    impressions.set(rel, (impressions.get(rel) ?? 0) + r.impressions);
  }
  const counts = { gscPages: rows.length, unmatched, otherTypes: 0, unpublished: 0 };
  const pages = [];
  const sampled = {};
  for (const [rel, imp] of [...impressions].sort((a, b) => b[1] - a[1])) {
    const fm = matter(readFileSync(join(REPO_ROOT, rel), 'utf8')).data;
    const family = familyOf({ category: rel.split('/')[2], group: fm.group });
    if (!family) { counts.otherTypes += 1; continue; }
    if (fm.published === false) { counts.unpublished += 1; continue; }
    sampled[family] = (sampled[family] ?? 0) + 1;
    pages.push({ rel, impressions: imp, family, claudeSample: sampled[family] <= sampleEach, claude: null, gemini: {} });
    if (pages.length >= limit) break;
  }
  if (!pages.length) { console.error('[gemini-trial] 検査不成立: 対象が 0 件', counts); process.exit(2); }
  const trial = { schemaVersion: 1, _doc: 'Gemini の一次採点と Claude の評価役の採点の比較（DN-0939・scripts/gemini-scoring-trial.mjs）', selectedAt: new Date().toISOString(), gscReport: gsc.file, counts, pages, comparison: null };
  writeJson(REPO_ROOT, TRIAL_FILE, trial);
  const byFamily = pages.reduce((a, p) => ({ ...a, [p.family]: (a[p.family] ?? 0) + 1 }), {});
  console.log(`[gemini-trial] ${pages.length} 件を選んだ ${JSON.stringify(byFamily)}・Claude の標本 ${pages.filter((p) => p.claudeSample).length} 件`);
  console.log(`  GSC ${counts.gscPages} URL（記事に結べない ${counts.unmatched}）/ 比較の外の種類 ${counts.otherTypes} / 非公開 ${counts.unpublished}`);
}

function record({ file }) {
  const trial = readDatasetIf(REPO_ROOT, 'state.gemini-trial');
  if (!trial?.pages?.length || !file) { console.error('[gemini-trial] 検査不成立: select の記録か --file が無い'); process.exit(2); }
  const results = JSON.parse(readFileSync(file, 'utf8'));
  let taken = 0;
  const rejected = [];
  for (const r of results) {
    const page = trial.pages.find((p) => p.rel === r.rel);
    const keys = page && Object.keys(FAMILIES[page.family].axes);
    const scores = keys && Object.fromEntries(keys.map((k) => [k, r.scores?.[k]]));
    if (!scores || Object.values(scores).some((v) => !Number.isInteger(v) || v < 0 || v > 3)) { rejected.push(r.rel); continue; }
    page.claude = { evaluator: page.family, scores, weighted: weightedScore(scores, FAMILIES[page.family].weights), at: new Date().toISOString() };
    taken += 1;
  }
  writeJson(REPO_ROOT, TRIAL_FILE, trial);
  console.log(`[gemini-trial] Claude の採点を ${taken} 件取り込んだ${rejected.length ? `・読めない ${rejected.length} 件（${rejected.join(', ')}）` : ''}`);
  if (rejected.length) process.exitCode = 1;
}

function run({ max, model, intervalMs }) {
  const trial = readDatasetIf(REPO_ROOT, 'state.gemini-trial');
  if (!trial?.pages?.length) { console.error('[gemini-trial] 検査不成立: 先に select を回す'); process.exit(2); }
  // 一致率に要る標本（Claude でも採点する記事）を先に回す
  // gemini はモデルごとに持つ（{ <model>: 結果 }）。同じ標本を別のモデルで採点して比べられる
  const todo = trial.pages.filter((p) => !p.gemini[model]).sort((x, y) => Number(y.claudeSample) - Number(x.claudeSample)).slice(0, max);
  let done = 0;
  let failed = 0;
  for (const page of todo) {
    const raw = readFileSync(join(REPO_ROOT, page.rel), 'utf8');
    const started = Date.now();
    const res = geminiInteract({ model, input: buildPrompt(page, raw), onRetry: (status, waitMs) => console.log(`    … HTTP ${status}・${Math.round(waitMs / 1000)} 秒待って再試行`) });
    if (!res.ok) {
      failed += 1;
      console.error(`  ✗ ${page.rel}: ${res.error}`);
      if (res.status === 429 || res.status === 402 || res.status === 403) { console.error('[gemini-trial] 回数の上限か拒否で止める（続きは次回 run）'); break; }
      continue;
    }
    const reply = parseJsonReply(res.text);
    const scores = reply?.scores && Object.fromEntries(Object.keys(FAMILIES[page.family].axes).map((k) => [k, reply.scores[k]]));
    if (!scores || Object.values(scores).some((v) => !Number.isInteger(v) || v < 0 || v > 3)) {
      failed += 1;
      console.error(`  ✗ ${page.rel}: 応答の JSON を読めない`);
      continue;
    }
    page.gemini[model] = { scores, weighted: weightedScore(scores, FAMILIES[page.family].weights), issues: (reply.issues ?? []).slice(0, 5), at: new Date().toISOString(), tokens: res.usage?.total_tokens ?? null };
    writeJson(REPO_ROOT, TRIAL_FILE, trial);
    done += 1;
    console.log(`  ✓ ${page.rel} Gemini ${page.gemini[model].weighted}（${page.gemini[model].tokens ?? "?"} トークン・${Math.round((Date.now() - started) / 1000)} 秒）`);
    if (done < todo.length) sleepMs(intervalMs);
  }
  const left = trial.pages.filter((p) => !p.gemini[model]).length;
  console.log(`[gemini-trial] 採点 ${done} 件・失敗 ${failed} 件・残り ${left} 件（対象 ${todo.length} 件を実行）`);
  if (done === 0 && failed > 0) process.exit(1);
}

function compare({ model }) {
  const trial = readDatasetIf(REPO_ROOT, 'state.gemini-trial');
  const pairs = (trial?.pages ?? []).filter((p) => p.gemini?.[model] && p.claude).map((p) => ({ ...p, gemini: p.gemini[model] }));
  if (!pairs.length) { console.error('[gemini-trial] 検査不成立: Gemini と Claude の両方の採点がある記事が 0 件'); process.exit(2); }
  const axes = agreement(pairs);
  const passAgree = round(pairs.filter((p) => (p.claude.weighted >= PASS) === (p.gemini.weighted >= PASS)).length / pairs.length);
  const weightedMae = round(pairs.reduce((a, p) => a + Math.abs(p.claude.weighted - p.gemini.weighted), 0) / pairs.length);
  const adopted = [];
  for (const [family, cells] of Object.entries(axes)) {
    for (const [axis, c] of Object.entries(cells)) {
      if (c.n >= ADOPT_MIN_N && c.exact >= ADOPT_EXACT && c.flagged >= ADOPT_MIN_FLAGGED && c.detect >= ADOPT_DETECT) adopted.push(`${family}.${axis}`);
    }
  }
  (trial.comparison ??= {})[model] = { at: new Date().toISOString(), pairs: pairs.length, passAgree, weightedMae, rule: `${ADOPT_MIN_N} 件以上・完全一致 ${ADOPT_EXACT * 100}% 以上・Claude が 3 未満の ${ADOPT_MIN_FLAGGED} 件以上のうち検出率 ${ADOPT_DETECT * 100}% 以上の軸を採用`, axes, adopted };
  writeJson(REPO_ROOT, TRIAL_FILE, trial);
  console.log(`[gemini-trial] ${model}: 比べた記事 ${pairs.length} 件 / 合否の一致 ${passAgree * 100}% / 加重合計の平均の差 ${weightedMae}`);
  for (const [family, cells] of Object.entries(axes)) {
    console.log(`\n■ ${family}`);
    for (const [axis, c] of Object.entries(cells)) {
      const mark = adopted.includes(`${family}.${axis}`) ? '採用' : '不採用';
      console.log(`  ${axis.padEnd(12)} n=${String(c.n).padStart(3)} 完全一致 ${Math.round(c.exact * 100)}% / ±1 ${Math.round(c.within1 * 100)}% / 平均の差 ${c.meanDiff >= 0 ? '+' : ''}${c.meanDiff} / 検出 ${c.flagged ? `${Math.round(c.detect * c.flagged)}/${c.flagged}` : '-'} → ${mark}`);
    }
  }
}

if (isCliEntry(import.meta.url)) {
  const flags = parseCliArgs({ limit: { type: 'integer', default: 100 }, 'sample-each': { type: 'integer', default: 8 }, file: { type: 'string' }, max: { type: 'integer', default: 100 }, model: { type: 'string', default: DEFAULT_MODEL }, 'interval-ms': { type: 'integer', default: 6000 } });
  const [command] = flags._;
  if (command === 'select') select(flags);
  else if (command === 'run') run(flags);
  else if (command === 'record') record(flags);
  else if (command === 'compare') compare(flags);
  else { console.error('使い方: npm run gemini-scoring-trial -- select|run|record|compare'); process.exit(2); }
}

#!/usr/bin/env node
/**
 * inspection-cycle.mjs — URL 検査を 1 日の上限（1,900 件）を超えて全件に届かせる周回の入口（DN-0825・index-coverage.yml が呼ぶ）。
 * 判定は scripts/lib/inspection-cycle.mjs（純関数）。ここはファイルの読み書きだけ。
 *
 * Usage:
 *   node .claude/scripts/inspection-cycle.mjs plan --sitemap .tmp/all-urls.txt --mode new|continue|auto \
 *     --out .tmp/inspect-urls.txt --carry .tmp/inspection-carry.json [--outputs "$GITHUB_OUTPUT"]
 *     直前の batch（データセット gsc.url-inspection の最新）を見て、今回検査する URL と引き継ぐ結果を書く。
 *     出力: action（new・continue・skip）・inspect_count・carried_count・remaining・runs
 *   node .claude/scripts/inspection-cycle.mjs merge --sitemap .tmp/all-urls.txt --carry .tmp/inspection-carry.json \
 *     [--fresh <今回の batch>] [--outputs "$GITHUB_OUTPUT"]
 *     引き継いだ結果と今回の batch を今の sitemap に対する 1 つの batch にして、今回の batch を書き換える
 *     （今回 1 件も検査しなかったときは --fresh を付けず、新しい batch を書く）。
 *     出力: path・partial・completed・total
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { parseCliArgs } from '../../scripts/lib/cli-args.mjs';
import { datasetPath, latestFile } from '../../scripts/lib/datasets.mjs';
import { mergeBatch, planInspection } from '../../scripts/lib/inspection-cycle.mjs';
import { readJson, writeJson } from '../../scripts/lib/json-io.mjs';
import { REPO_ROOT } from '../../scripts/lib/repository-paths.mjs';

const TAG = '[inspection-cycle]';

const readLines = (file) => readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);

function emit(outputs, values) {
  const text = Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n');
  console.log(text);
  if (outputs) appendFileSync(outputs, `${text}\n`);
}

function fail(msg) {
  console.error(`${TAG} ✗ ${msg}`);
  process.exit(2);
}

const args = parseCliArgs({
  sitemap: { type: 'string' },
  mode: { type: 'string' },
  out: { type: 'string' },
  carry: { type: 'string' },
  fresh: { type: 'string' },
  outputs: { type: 'string' },
});
const cmd = args._[0];
if (!args.sitemap || !args.carry) fail('--sitemap と --carry が要る');
const sitemap = readLines(args.sitemap);
// 検査ゼロを PASS と呼ばない: sitemap が読めなければ周回も完了も決められない
if (sitemap.length === 0) fail(`${args.sitemap} に URL が 0 件（sitemap を読めていない）`);

if (cmd === 'plan') {
  if (!['new', 'continue', 'auto'].includes(args.mode)) fail('--mode は new・continue・auto のどれか');
  if (!args.out) fail('--out が要る');
  const priorPath = latestFile(REPO_ROOT, 'gsc.url-inspection');
  const prior = priorPath ? readJson(REPO_ROOT, priorPath) : null;
  const plan = planInspection({ sitemap, prior, mode: args.mode, now: Date.now() });
  writeFileSync(args.out, plan.toInspect.length ? `${plan.toInspect.join('\n')}\n` : '');
  writeFileSync(args.carry, JSON.stringify({ cycle: plan.cycle, carried: plan.carried }));
  console.log(`${TAG} sitemap ${sitemap.length} 件 / 直前の batch ${priorPath ?? 'なし'}（${prior ? `${prior.completed}/${prior.total}${prior.partial ? ' 未完了' : ' 完了'}` : '—'}）`);
  console.log(`${TAG} ${plan.action}: 今回 ${plan.toInspect.length} 件を検査・引き継ぎ ${plan.carried.length} 件・残り ${plan.remaining} 件${plan.cycle ? `（周回 ${plan.cycle.runs} 回目・開始 ${plan.cycle.startedAt}）` : ''}`);
  emit(args.outputs, {
    action: plan.action,
    inspect_count: plan.toInspect.length,
    carried_count: plan.carried.length,
    remaining: plan.remaining,
    runs: plan.cycle?.runs ?? 0,
  });
} else if (cmd === 'merge') {
  const { cycle, carried } = JSON.parse(readFileSync(args.carry, 'utf8'));
  if (!cycle) fail('引き継ぎに cycle が無い（plan が skip だった回に merge を呼んだ）');
  const fresh = args.fresh ? readJson(REPO_ROOT, args.fresh).results : [];
  const path = args.fresh || datasetPath('gsc.url-inspection', { ts: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) });
  const doc = mergeBatch({ sitemap, carried, fresh, cycle, generatedAt: new Date().toISOString() });
  writeJson(REPO_ROOT, path, doc);
  console.log(`${TAG} 引き継ぎ ${carried.length} 件＋今回 ${fresh.length} 件 → ${doc.completed}/${doc.total}${doc.partial ? ' 未完了（次の実行が続ける）' : ' 完了'} → ${path}`);
  emit(args.outputs, { path, partial: doc.partial, completed: doc.completed, total: doc.total });
} else {
  fail('plan か merge を指定する');
}

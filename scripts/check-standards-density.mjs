#!/usr/bin/env node
/**
 * check-standards-density.mjs — build 済み out/standards/** の密度ゲート（説明文の量・一覧リンク数・出典表示・アフィリエイト）。
 *
 * なぜ要るか: /standards の入口ページが説明文で膨らみ、一覧（読者が押すもの）が下に押し下げられるのを防ぐ。
 * 閾値は config/standards-page-density.json、判定は scripts/lib/standards-density.mjs。
 * 罠: out/ は trailingSlash なし（standards/kinki.html）。data・compare・part-NN は対象外。
 *
 * Usage: node scripts/check-standards-density.mjs [--out out] [--json]
 * exit: 0 合格 / 1 違反あり / 2 検査不成立（out/standards が無い・設定のテンプレートが 1 ページも検査できない）
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { templateOf, checkPage } from './lib/standards-density.mjs';

const TAG = '[check-standards-density]';

function main() {
  const f = parseCliArgs({ out: { type: 'string', default: 'out' }, json: { type: 'boolean' } });
  const outDir = resolve(REPO_ROOT, f.out);
  const dir = resolve(outDir, 'standards');
  if (!existsSync(dir)) {
    console.error(`${TAG} ${relative(REPO_ROOT, dir) || dir} が無い（build 前・検査不成立）`);
    process.exitCode = 2;
    return;
  }
  const rules = readDataset(REPO_ROOT, 'config.standards-page-density');
  const templates = Object.keys(rules.proseBeforeContent.maxChars);
  const files = [...listFiles(dir, { ext: '.html' }), ...(existsSync(outDir + '/standards.html') ? [outDir + '/standards.html'] : [])];

  const stats = Object.fromEntries(templates.map((t) => [t, { target: 0, checked: 0, failed: 0 }]));
  const findings = [];
  let skipped = 0;
  for (const file of files) {
    const rel = relative(outDir, file).replaceAll('\\', '/');
    const template = templateOf(rel);
    if (!template || !stats[template]) { skipped++; continue; }
    stats[template].target++;
    const page = checkPage(readFileSync(file, 'utf8'), template, rules);
    stats[template].checked++;
    if (page.length) {
      stats[template].failed++;
      for (const x of page) findings.push({ path: rel, template, ...x });
    }
  }

  const empty = templates.filter((t) => stats[t].checked === 0);
  const result = { templates: stats, skipped, findings, inconclusive: empty };
  if (f.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const t of templates) console.log(`${TAG} ${t.padEnd(8)} 対象 ${stats[t].target} / 検査 ${stats[t].checked} / 違反ページ ${stats[t].failed}`);
    console.log(`${TAG} 対象外 ${skipped} ページ（data・compare・part-NN など）`);
    for (const x of findings.slice(0, 50)) console.error(`  ✗ ${x.path} [${x.template}] ${x.message}`);
    if (findings.length > 50) console.error(`  … ほか ${findings.length - 50} 件`);
    for (const t of empty) console.error(`${TAG} ${t} が 0 ページ（検査不成立）`);
  }
  if (empty.length) process.exitCode = 2;
  else if (findings.length) process.exitCode = 1;
}

main();

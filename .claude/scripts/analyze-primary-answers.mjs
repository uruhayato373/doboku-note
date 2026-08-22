#!/usr/bin/env node
/**
 * analyze-primary-answers.mjs
 *
 * 技術士総合技術監理部門 択一式試験 R03-R07 の正答番号分布を集計。
 * 各年度 40 問 × 5 年 = 200 問の正答が選択肢 1〜5 のどれに偏っているかを
 * χ² 検定で評価し、外部被リンク獲得用の独自データとして公開する。
 *
 * 出力: .claude/state/primary-answer-distribution.json
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const POSTS = join(ROOT, "content/site/pe-comprehensive-management");
const OUT = join(ROOT, ".claude/state/primary-answer-distribution.json");

function loadPrimaries() {
  const out = [];
  for (const dir of readdirSync(POSTS)) {
    const m = dir.match(/^r(\d{2})-primary$/);
    if (!m) continue;
    const path = join(POSTS, dir, "article.mdx");
    if (!existsSync(path)) continue;
    out.push({ year: `R${m[1]}`, path });
  }
  out.sort((a, b) => a.year.localeCompare(b.year));
  return out;
}

function extractAnswers(mdx) {
  // `**正答：N**` または `**正答:N**` （全角/半角コロン両対応）
  const re = /\*\*正答[：:](\d)\*\*/g;
  const nums = [];
  let m;
  while ((m = re.exec(mdx)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 5) nums.push(n);
  }
  return nums;
}

function chiSquared(observed, expected) {
  // 期待度数との差の平方を期待度数で割った和
  let chi = 0;
  for (let i = 0; i < observed.length; i++) {
    const diff = observed[i] - expected[i];
    chi += (diff * diff) / expected[i];
  }
  return chi;
}

function main() {
  const primaries = loadPrimaries();
  console.log(`Found ${primaries.length} primary files`);

  const byYear = {};
  const total = [0, 0, 0, 0, 0]; // index 0-4 → choice 1-5

  for (const p of primaries) {
    const mdx = readFileSync(p.path, "utf8");
    const nums = extractAnswers(mdx);
    const dist = [0, 0, 0, 0, 0];
    for (const n of nums) dist[n - 1]++;
    byYear[p.year] = { count: nums.length, dist, raw: nums };
    for (let i = 0; i < 5; i++) total[i] += dist[i];
  }

  const totalCount = total.reduce((a, b) => a + b, 0);
  const expectedPerChoice = totalCount / 5;
  const expectedYearly = {};
  for (const [year, data] of Object.entries(byYear)) {
    expectedYearly[year] = data.count / 5;
  }

  // χ² 検定（自由度 4、有意水準 5% の臨界値 = 9.488）
  const expectedAll = new Array(5).fill(expectedPerChoice);
  const chiTotal = chiSquared(total, expectedAll);
  const chiPerYear = {};
  for (const [year, data] of Object.entries(byYear)) {
    const exp = new Array(5).fill(expectedYearly[year]);
    chiPerYear[year] = {
      chi: chiSquared(data.dist, exp),
      expected: expectedYearly[year],
    };
  }

  // 各番号 × 年度のマトリクス
  const matrix = {};
  for (const num of [1, 2, 3, 4, 5]) {
    matrix[num] = {};
    for (const [year, data] of Object.entries(byYear)) {
      matrix[num][year] = data.dist[num - 1];
    }
  }

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      years: primaries.map((p) => p.year),
      total_questions: totalCount,
    },
    overall: {
      distribution: total,
      expected_per_choice: expectedPerChoice,
      chi_squared: chiTotal,
      chi_critical_5pct: 9.488,
      uniform_p_value_judgment:
        chiTotal < 9.488 ? "均等と矛盾しない (p > 0.05)" : "均等から有意に乖離 (p < 0.05)",
      most_frequent: total.indexOf(Math.max(...total)) + 1,
      least_frequent: total.indexOf(Math.min(...total)) + 1,
    },
    by_year: Object.fromEntries(
      Object.entries(byYear).map(([year, data]) => [
        year,
        {
          count: data.count,
          distribution: data.dist,
          chi_squared: chiPerYear[year].chi,
          expected_per_choice: chiPerYear[year].expected,
          most_frequent: data.dist.indexOf(Math.max(...data.dist)) + 1,
          least_frequent: data.dist.indexOf(Math.min(...data.dist)) + 1,
        },
      ])
    ),
    matrix_by_choice_year: matrix,
  };

  writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(`✅ ${OUT}`);
  console.log(`\nOverall (${totalCount} questions):`);
  console.log(`  Choice  1: ${total[0]}`);
  console.log(`  Choice  2: ${total[1]}`);
  console.log(`  Choice  3: ${total[2]}`);
  console.log(`  Choice  4: ${total[3]}`);
  console.log(`  Choice  5: ${total[4]}`);
  console.log(`  Expected per choice: ${expectedPerChoice.toFixed(1)}`);
  console.log(`  χ² = ${chiTotal.toFixed(3)} (critical 9.488 @ df=4, α=0.05)`);
  console.log(`  → ${output.overall.uniform_p_value_judgment}`);
  console.log(`\nMost frequent: ${output.overall.most_frequent}, Least frequent: ${output.overall.least_frequent}`);
  console.log(`\nBy year:`);
  for (const [year, data] of Object.entries(output.by_year)) {
    console.log(`  ${year}: ${data.distribution.join(",")} (n=${data.count}, χ²=${data.chi_squared.toFixed(2)})`);
  }
}

main();

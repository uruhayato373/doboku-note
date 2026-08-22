/**
 * hub 強化対象の特定 + 現状分析
 *
 * GSC page データから hub 候補（pillar / keyword-2026 / exam-index / guide）を抽出し、
 * impressions / position / CTR を比較して強化優先度を出力する。
 *
 * Usage:
 *   node .claude/scripts/analyze-hubs.mjs --page-data .claude/state/metrics/gsc/gsc-page-2026-04-27T11-15-23.json
 */

import { readFileSync, writeFileSync } from "fs";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { pageData: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--page-data") opts.pageData = args[++i];
  }
  return opts;
}

const HUB_PATTERNS = [
  { name: "PE pillar (5管理)", regex: /\/pe-comprehensive-management-(economic|human-resource|information|safety|social-environment)-management-pillar/ },
  { name: "PE keyword-2026", regex: /\/pe-comprehensive-management-keyword-2026/ },
  { name: "PE exam-index", regex: /\/pe-comprehensive-management-exam-index/ },
  { name: "PE management-tradeoffs", regex: /\/pe-comprehensive-management-management-tradeoffs/ },
  { name: "PE 過去問 hub", regex: /\/pe-comprehensive-management-(h|r)\d{2}-(primary|secondary)$/ },
  { name: "civil guide", regex: /\/civil-construction-1-guide-/ },
  { name: "civil textbook", regex: /\/civil-construction-1-textbook-/ },
  { name: "civil primary hub", regex: /\/civil-construction-1-primary-(h|r)\d{2}-[ab]$/ },
  { name: "サイトトップ・カテゴリ", regex: /\/(category|search|about)|^https:\/\/doboku-note\.com\/?$/ },
];

function classifyHub(url) {
  for (const p of HUB_PATTERNS) {
    if (p.regex.test(url)) return p.name;
  }
  return null;
}

function priorityForHub(row) {
  // 強化優先度判定:
  //   - position > 10: 圏外（強化対象だが伸びしろ大、HIGH）
  //   - position 5-10 + impressions > 30: 強化で 5 位以内に上げられる可能性（HIGH）
  //   - position 1-5 + impressions > 30: 既に上位、維持（OK）
  //   - impressions < 10: データ不足
  const { impressions, position } = row;
  if (impressions < 10) return { level: "DATA_LOW", reason: "impressions少（90日<10）" };
  if (position > 20) return { level: "HIGH", reason: `圏外 (pos ${position.toFixed(1)})、改善余地大` };
  if (position > 10) return { level: "HIGH", reason: `2 ページ目 (pos ${position.toFixed(1)})、強化で1ページ目入り狙う` };
  if (position > 5) return { level: "MEDIUM", reason: `下位 (pos ${position.toFixed(1)})、強化で上位狙う` };
  if (position > 3) return { level: "LOW", reason: `上位 (pos ${position.toFixed(1)})、維持` };
  return { level: "EXCELLENT", reason: `トップ (pos ${position.toFixed(1)})` };
}

function main() {
  const opts = parseArgs();
  if (!opts.pageData) {
    console.error("Usage: --page-data <file>");
    process.exit(2);
  }

  const data = JSON.parse(readFileSync(opts.pageData, "utf-8"));
  const rows = data.rows || [];

  // hub に該当する行を抽出
  const hubRows = [];
  for (const r of rows) {
    const url = r.keys[0];
    const hub = classifyHub(url);
    if (hub) {
      const p = priorityForHub(r);
      hubRows.push({
        url,
        hub,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
        priority: p.level,
        reason: p.reason,
      });
    }
  }

  // 優先度順にソート（HIGH→MEDIUM→LOW→EXCELLENT→DATA_LOW、同一優先度内は impressions DESC）
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2, EXCELLENT: 3, DATA_LOW: 4 };
  hubRows.sort((a, b) => order[a.priority] - order[b.priority] || b.impressions - a.impressions);

  // hub カテゴリ別集計
  const byHub = {};
  for (const r of hubRows) {
    if (!byHub[r.hub]) byHub[r.hub] = { count: 0, sum_impr: 0, sum_clicks: 0, avg_pos: 0 };
    byHub[r.hub].count++;
    byHub[r.hub].sum_impr += r.impressions;
    byHub[r.hub].sum_clicks += r.clicks;
    byHub[r.hub].avg_pos += r.position * r.impressions; // 加重平均
  }
  for (const k of Object.keys(byHub)) {
    byHub[k].avg_pos = byHub[k].sum_impr > 0 ? byHub[k].avg_pos / byHub[k].sum_impr : 0;
  }

  // MD 生成
  const lines = [];
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  lines.push(`## hub 強化現状分析（${ts} UTC）`);
  lines.push(``);
  lines.push(`Issue #28 戦略転換を踏まえ、既存 hub の現状 GSC パフォーマンスを確認。`);
  lines.push(``);
  lines.push(`**対象**: 過去 90 日 impressions>0 の ${rows.length} URL から、hub 該当 ${hubRows.length} URL を抽出。`);
  lines.push(``);

  lines.push(`### hub カテゴリ別集計（加重平均 position）`);
  lines.push(``);
  lines.push(`| カテゴリ | URL 数 | 合計 impressions | 合計 clicks | 加重平均 position |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  const sortedHubs = Object.entries(byHub).sort((a, b) => b[1].sum_impr - a[1].sum_impr);
  for (const [k, v] of sortedHubs) {
    lines.push(`| ${k} | ${v.count} | ${v.sum_impr} | ${v.sum_clicks} | ${v.avg_pos.toFixed(1)} |`);
  }
  lines.push(``);

  lines.push(`### 強化優先度別 URL リスト`);
  lines.push(``);

  for (const level of ["HIGH", "MEDIUM", "LOW", "EXCELLENT", "DATA_LOW"]) {
    const subset = hubRows.filter((r) => r.priority === level);
    if (subset.length === 0) continue;
    lines.push(`#### ${level}（${subset.length} 件）`);
    lines.push(``);
    lines.push(`| URL | hub | impr | clicks | CTR | pos | 理由 |`);
    lines.push(`|---|---|---:|---:|---:|---:|---|`);
    for (const r of subset.slice(0, 20)) {
      const slug = r.url.replace("https://doboku-note.com", "");
      lines.push(
        `| \`${slug}\` | ${r.hub} | ${r.impressions} | ${r.clicks} | ${(r.ctr * 100).toFixed(1)}% | ${r.position.toFixed(1)} | ${r.reason} |`,
      );
    }
    if (subset.length > 20) lines.push(`| ... 他 ${subset.length - 20} 件 | | | | | | |`);
    lines.push(``);
  }

  lines.push(`### 推奨アクション`);
  lines.push(``);
  const highCount = hubRows.filter((r) => r.priority === "HIGH").length;
  const mediumCount = hubRows.filter((r) => r.priority === "MEDIUM").length;
  if (highCount > 0) {
    lines.push(`#### 即時強化対象（HIGH ${highCount} 件）`);
    lines.push(``);
    lines.push(`これらは impressions が立っているのに position が 10 位以下 = **「Google が認識してるが評価が低い」** 状態。`);
    lines.push(`コンテンツ強化（タイトル・H2 構造・FAQ・内部リンク・リード文）で即座に position が動く可能性が高い。`);
    lines.push(``);
    lines.push(`具体的な強化策:`);
    lines.push(`1. **タイトル / seoTitle の見直し**: 検索クエリと整合しているか`);
    lines.push(`2. **FAQ 追加**: スキーマ構造化データで rich snippet 取得`);
    lines.push(`3. **リード文（最初の 200 字）の改善**: position 上位の競合を参考に`);
    lines.push(`4. **内部リンク被リンクの増加**: 関連する spoke から hub へのリンク追加`);
    lines.push(``);
  }
  if (mediumCount > 0) {
    lines.push(`#### 次段階（MEDIUM ${mediumCount} 件）`);
    lines.push(``);
    lines.push(`position 5-10 = 1 ページ目の下位。HIGH 対応後、効果検証を経て展開。`);
    lines.push(``);
  }
  lines.push(`#### EXCELLENT / LOW（${hubRows.filter((r) => r.priority === "EXCELLENT" || r.priority === "LOW").length} 件）`);
  lines.push(``);
  lines.push(`既に上位。原則として **触らない**。SEO は「動いていないものを動かす」よりも「動いているものを壊さない」方が大事。`);
  lines.push(``);

  // 出力
  const tsFile = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = `.tmp/hub-analysis-${tsFile}.json`;
  const mdPath = `.tmp/hub-analysis-${tsFile}.md`;
  writeFileSync(jsonPath, JSON.stringify({ summary: byHub, hubs: hubRows }, null, 2), "utf-8");
  writeFileSync(mdPath, lines.join("\n"), "utf-8");

  console.log(`JSON: ${jsonPath}`);
  console.log(`MD:   ${mdPath}`);
  console.log(`\nPriority breakdown:`);
  for (const level of ["HIGH", "MEDIUM", "LOW", "EXCELLENT", "DATA_LOW"]) {
    const n = hubRows.filter((r) => r.priority === level).length;
    if (n > 0) console.log(`  ${level}: ${n}`);
  }
}

main();

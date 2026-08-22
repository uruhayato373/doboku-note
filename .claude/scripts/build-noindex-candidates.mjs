/**
 * noindex 候補リスト生成
 *
 * 入力:
 *   - URL Inspection 結果（verdict=PASS）
 *   - Search Analytics page データ（impressions>0 のページ）
 *
 * 出力: PASS かつ 過去 90 日 impressions=0 = 戦略資産でない幽霊ページ
 *       URL パターン別に分類 + 優先度判定 + Issue 投稿用 MD
 *
 * Usage:
 *   node .claude/scripts/build-noindex-candidates.mjs \
 *     --inspection-glob ".claude/state/metrics/url-inspection/inspection-batch-2026-04-27*.json" \
 *     --page-data .claude/state/metrics/gsc/gsc-page-2026-04-27T11-15-23.json
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { inspectionGlob: null, pageData: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--inspection-glob") opts.inspectionGlob = args[++i];
    else if (args[i] === "--page-data") opts.pageData = args[++i];
  }
  return opts;
}

function classifyPattern(url) {
  if (url.includes("/civil-construction-1-primary-")) return "civil-primary";
  if (url.includes("/civil-construction-1-secondary-")) return "civil-secondary";
  if (url.includes("/civil-construction-1-textbook-")) return "civil-textbook";
  if (url.includes("/civil-construction-1-guide-")) return "civil-guide";
  if (url.match(/\/pe-comprehensive-management-(h|r)\d{2}-(primary|secondary)/)) return "pe-past-exam";
  if (url.includes("-pillar")) return "pe-pillar";
  if (url.includes("/pe-comprehensive-management-")) return "pe-keyword";
  return "other";
}

function priorityForPattern(pattern, slug) {
  // 戦略資産（保護対象）
  // - pillar / guide / textbook 系: 主要 hub なので impressions=0 でも保持
  // - 主要過去問（最近5年）: 受験期に流入見込みあるので保持
  // - exam-index, keyword-2026 等の hub
  if (pattern === "pe-pillar") return { priority: "PROTECT", reason: "ピラーは戦略資産" };
  if (pattern === "civil-guide") return { priority: "PROTECT", reason: "civil guide は試験ガイド hub" };
  if (pattern === "civil-textbook") return { priority: "PROTECT", reason: "civil textbook は教科書本体" };
  if (slug.includes("exam-index") || slug.includes("keyword-2026") || slug.includes("strategy"))
    return { priority: "PROTECT", reason: "サイト hub" };

  // 直近過去問は保護
  if (pattern === "pe-past-exam") {
    const m = slug.match(/(h|r)(\d{2})-(primary|secondary)/);
    if (m) {
      const era = m[1];
      const yy = parseInt(m[2], 10);
      // R03+, H30+ は保護（受験期に流入見込み）
      if (era === "r" || (era === "h" && yy >= 28)) {
        return { priority: "PROTECT", reason: "直近 5 年過去問 = 受験期流入対象" };
      }
      return { priority: "MEDIUM", reason: "古い過去問（H27 以前）" };
    }
  }
  if (pattern === "civil-primary" || pattern === "civil-secondary") {
    const m = slug.match(/(h|r)(\d{2})/);
    if (m) {
      const era = m[1];
      const yy = parseInt(m[2], 10);
      if (era === "r" || (era === "h" && yy >= 28)) {
        return { priority: "PROTECT", reason: "直近 civil 過去問 = 受験期流入対象" };
      }
      return { priority: "MEDIUM", reason: "古い civil 過去問" };
    }
    return { priority: "MEDIUM", reason: "civil 過去問" };
  }

  // PE キーワード: 既に hub から内部リンクされている = 完全な孤立ではない
  // → MEDIUM 優先（一括 noindex すると関連リンクの destination が消える）
  if (pattern === "pe-keyword") {
    return { priority: "MEDIUM", reason: "PE キーワードは内部リンク先として機能" };
  }

  return { priority: "LOW", reason: "判定保留" };
}

async function main() {
  const opts = parseArgs();

  const files = await glob(opts.inspectionGlob);
  const passUrls = [];
  const allInspected = new Set();
  for (const f of files) {
    const d = JSON.parse(readFileSync(f, "utf-8"));
    for (const r of d.results || []) {
      allInspected.add(r.url);
      if (r.index?.verdict === "PASS") passUrls.push(r.url);
    }
  }

  console.log(`PASS verdict URLs: ${passUrls.length}`);

  const pageData = JSON.parse(readFileSync(opts.pageData, "utf-8"));
  const impressionMap = new Map();
  for (const r of pageData.rows || []) {
    impressionMap.set(r.keys[0], { impressions: r.impressions, clicks: r.clicks });
  }
  console.log(`Pages with impressions>0 (90d): ${impressionMap.size}`);

  // PASS かつ impressions=0 = phantom = noindex 候補
  const phantoms = passUrls.filter((u) => !impressionMap.has(u));
  console.log(`Phantom PASS pages: ${phantoms.length}`);

  // 分類
  const classified = phantoms.map((url) => {
    const pattern = classifyPattern(url);
    const slug = url.replace("https://doboku-note.com/docs/", "");
    const { priority, reason } = priorityForPattern(pattern, slug);
    return { url, pattern, slug, priority, reason };
  });

  // 集計
  const byPriority = { PROTECT: [], MEDIUM: [], LOW: [] };
  const byPattern = {};
  for (const c of classified) {
    byPriority[c.priority].push(c);
    if (!byPattern[c.pattern]) byPattern[c.pattern] = { PROTECT: 0, MEDIUM: 0, LOW: 0, total: 0 };
    byPattern[c.pattern][c.priority]++;
    byPattern[c.pattern].total++;
  }

  // MD 生成
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  const lines = [];
  lines.push(`## noindex 化候補リスト（${ts} UTC）`);
  lines.push(``);
  lines.push(`Issue #28 診断「インデックス済 + 90 日 impressions=0 = 89% 幽霊」を踏まえた noindex 化候補。`);
  lines.push(``);
  lines.push(`**対象**: 検査済 URL のうち verdict=PASS（インデックス済）かつ過去 90 日 impressions=0 のページ。`);
  lines.push(``);
  lines.push(`### サマリ`);
  lines.push(``);
  lines.push(`| 優先度 | 件数 | 意味 |`);
  lines.push(`|---|---:|---|`);
  lines.push(`| **PROTECT** | ${byPriority.PROTECT.length} | 戦略資産。impressions=0 でも保持（pillar/guide/textbook/直近過去問） |`);
  lines.push(`| **MEDIUM** | ${byPriority.MEDIUM.length} | 段階的判断対象。古い過去問・PE キーワードなど |`);
  lines.push(`| **LOW** | ${byPriority.LOW.length} | 即 noindex 候補（その他低価値ページ） |`);
  lines.push(`| **合計** | ${classified.length} | |`);
  lines.push(``);

  lines.push(`### URL パターン別`);
  lines.push(``);
  lines.push(`| パターン | PROTECT | MEDIUM | LOW | 合計 |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const [p, b] of Object.entries(byPattern).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${p} | ${b.PROTECT} | ${b.MEDIUM} | ${b.LOW} | ${b.total} |`);
  }
  lines.push(``);

  lines.push(`### 判定ロジック`);
  lines.push(``);
  lines.push(`| パターン | 判定 |`);
  lines.push(`|---|---|`);
  lines.push(`| pe-pillar | PROTECT（5 ピラーは戦略 hub） |`);
  lines.push(`| civil-guide | PROTECT（試験ガイド hub） |`);
  lines.push(`| civil-textbook | PROTECT（教科書本体） |`);
  lines.push(`| 直近過去問（R03+, H28+） | PROTECT（受験期流入見込み） |`);
  lines.push(`| 古い過去問（H27 以前） | MEDIUM |`);
  lines.push(`| pe-keyword | MEDIUM（内部リンク先として機能） |`);
  lines.push(`| その他 | LOW |`);
  lines.push(``);

  lines.push(`### LOW 優先（即 noindex 候補）`);
  lines.push(``);
  if (byPriority.LOW.length === 0) {
    lines.push(`なし。すべて PROTECT または MEDIUM 判定。`);
  } else {
    lines.push(`| URL | パターン | 理由 |`);
    lines.push(`|---|---|---|`);
    for (const c of byPriority.LOW.slice(0, 50)) {
      lines.push(`| ${c.url} | ${c.pattern} | ${c.reason} |`);
    }
    if (byPriority.LOW.length > 50) {
      lines.push(`| ... 他 ${byPriority.LOW.length - 50} 件 | | |`);
    }
  }
  lines.push(``);

  lines.push(`### MEDIUM 段階判断（先頭 30 件）`);
  lines.push(``);
  lines.push(`<details>`);
  lines.push(`<summary>クリックで展開（全 ${byPriority.MEDIUM.length} 件中先頭 30 件）</summary>`);
  lines.push(``);
  lines.push(`| URL | パターン | 理由 |`);
  lines.push(`|---|---|---|`);
  for (const c of byPriority.MEDIUM.slice(0, 30)) {
    lines.push(`| ${c.url} | ${c.pattern} | ${c.reason} |`);
  }
  if (byPriority.MEDIUM.length > 30) {
    lines.push(`| ... 他 ${byPriority.MEDIUM.length - 30} 件 | | |`);
  }
  lines.push(``);
  lines.push(`</details>`);
  lines.push(``);

  lines.push(`### 推奨アプローチ`);
  lines.push(``);
  lines.push(`1. **Phase 1: PE キーワードの段階的縮小**`);
  lines.push(`   - PE キーワードのうち impressions=0 のものから、内部リンク被リンク数が低い（hub からも参照されない）ページを優先 noindex`);
  lines.push(`   - 内部リンク先として機能しているものは学習ガイドへ統合`);
  lines.push(``);
  lines.push(`2. **Phase 2: 古い過去問（H27 以前）の判断**`);
  lines.push(`   - H27 以前の過去問は受験期流入が薄い見込み`);
  lines.push(`   - 統合ページ（「総監過去問アーカイブ」等）にまとめて元ページは noindex`);
  lines.push(``);
  lines.push(`3. **Phase 3: 効果検証**`);
  lines.push(`   - 100-200 ページ noindex 後 1 ヶ月で GSC 計測`);
  lines.push(`   - 残ったページの impressions/clicks に正の変化が出るか確認（戦略資産集中の効果検証）`);
  lines.push(``);

  lines.push(`### noindex 実装方法`);
  lines.push(``);
  lines.push(`MDX frontmatter に \`published: false\` を設定すると \`getDoc()\` で除外されるが、これは「削除」相当（404 化）。`);
  lines.push(`真の noindex は \`<head><meta name="robots" content="noindex">\` を出力する仕組みが必要。`);
  lines.push(``);
  lines.push(`**実装案**:`);
  lines.push(``);
  lines.push(`- frontmatter に \`noindex: true\` を追加（新フィールド）`);
  lines.push(`- \`src/app/docs/[...slug]/page.tsx\` で \`generateMetadata\` に \`robots: { index: false }\` を設定`);
  lines.push(`- ページ自体は閲覧可能（内部リンク・直接アクセス時に表示）、検索エンジンのみ除外`);
  lines.push(``);

  // ファイル出力
  const tsFile = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = `.tmp/noindex-candidates-${tsFile}.json`;
  const mdPath = `.tmp/noindex-candidates-${tsFile}.md`;
  writeFileSync(
    jsonPath,
    JSON.stringify({ summary: { total: classified.length, byPriority: { PROTECT: byPriority.PROTECT.length, MEDIUM: byPriority.MEDIUM.length, LOW: byPriority.LOW.length } }, byPattern, candidates: classified }, null, 2),
    "utf-8",
  );
  writeFileSync(mdPath, lines.join("\n"), "utf-8");

  console.log(`\nJSON: ${jsonPath}`);
  console.log(`MD:   ${mdPath}`);
  console.log(`\nPriority breakdown:`);
  console.log(`  PROTECT: ${byPriority.PROTECT.length}`);
  console.log(`  MEDIUM:  ${byPriority.MEDIUM.length}`);
  console.log(`  LOW:     ${byPriority.LOW.length}`);
}

main().catch((e) => {
  console.error("Error:", e.stack || e.message);
  process.exit(1);
});

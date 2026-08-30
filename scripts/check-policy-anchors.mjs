/**
 * ポリシーアンカー整合チェック（決定が複数文書に散在するクラスタの横展開もれ防止）
 *
 * 背景: 1つの決定（例: 総監 per-persona R8予想を作る/作らない）が ADR・SKILL.md・checklist・
 *   戦略SoT に散在し、片方だけ更新して矛盾するドリフトが頻発（2026-06-16・横展開に3往復）。
 *   check-doc-coupling（台帳カップリング）・check-doc-refs（パス参照）では拾えない
 *   「同一決定の分散」をクラスタ単位で surface する。**意味照合はしない**（それは /doc-sync の領分）＝
 *   「1ファイルを触ったらクラスタ全体の整合を確認せよ」という決定的リマインダ。
 *
 * 台帳: .claude/config/policy-anchors.json
 *
 * Usage:
 *   node scripts/check-policy-anchors.mjs            … 全クラスタの files/anchor 実在を検証（registry rot 検出）
 *   node scripts/check-policy-anchors.mjs --staged   … staged に該当するクラスタだけ提示（pre-commit/フック用）
 *
 * exit 1: registry rot（files/anchor が実在しない）。exit 0: 正常（クラスタ提示は advisory）。
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const REGISTRY = ".claude/config/policy-anchors.json";
const staged = process.argv.includes("--staged");

let reg;
try {
  reg = JSON.parse(readFileSync(REGISTRY, "utf8"));
} catch (e) {
  console.error(`[check-policy-anchors] ✗ ${REGISTRY} を読めません: ${e.message}`);
  process.exit(1);
}

const policies = reg.policies || {};
const errors = [];

// registry rot: 全 files/anchor が実在するか（移動・改名で台帳が腐るのを防ぐ）
for (const [id, p] of Object.entries(policies)) {
  for (const f of [p.anchor, ...(p.files || [])]) {
    if (f && !existsSync(f)) {
      errors.push(`policy "${id}": ファイルが存在しません → ${f}（移動/改名したら policy-anchors.json も更新）`);
    }
  }
}
if (errors.length) {
  console.error("[check-policy-anchors] ✗ ポリシーアンカー台帳が陳腐化:");
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}

if (!staged) {
  console.log(`[check-policy-anchors] ✓ ${Object.keys(policies).length} ポリシークラスタの全ファイル実在を確認`);
  process.exit(0);
}

// --staged: staged ファイルに該当するクラスタを提示（advisory）
let stagedFiles = [];
try {
  stagedFiles = execFileSync("git", ['-c', 'core.quotepath=false', "diff", "--cached", "--name-only"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  /* git なし */
}

const hit = [];
for (const [id, p] of Object.entries(policies)) {
  const all = [...new Set([p.anchor, ...(p.files || [])])];
  if (stagedFiles.some((s) => all.includes(s))) hit.push([id, p, all]);
}

if (hit.length === 0) process.exit(0);

console.log("");
console.log("━━━ ポリシークラスタ 横展開リマインダ ━━━");
for (const [id, p, all] of hit) {
  console.log(`◆ ${id}: ${p.decision}`);
  console.log(`  真実源(anchor): ${p.anchor}`);
  console.log("  この決定を載せる全ファイル（1つ変えたら全部の整合を確認）:");
  all.forEach((f) => console.log(`    ${stagedFiles.includes(f) ? "● staged" : "○      "} ${f}`));
  console.log("  → 意味的な矛盾がないか /doc-sync または手動で横断確認してください。");
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━");
process.exit(0);

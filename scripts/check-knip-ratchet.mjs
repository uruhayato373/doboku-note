#!/usr/bin/env node
// デッドコードの**増加だけ**を止めるラチェットゲート。
//
// なぜ閾値でもレポートでもなくラチェットか（2026-08-16 新設）:
//   knip はこのリポジトリで false positive を出す（npm scripts 経由の呼び出し・
//   動的 import・スキルから叩かれる .mjs 等）。だから「未使用と出たら消す」は誤りで、
//   grep 裏取りが要る（memory: knip-dead-code-audit）。＝**機械では消せない**。
//   一方 report のまま置くと誰も読まず腐る。実際 knip は `scripts/batch-approve.mjs` の
//   壊れ import を報告し続けていたが ci:false のため 4 か月放置された。
//   そこで「既存分の返済は強制しないが、増やすことは許さない」ラチェットにする。
//   閾値（例: 60 件超で赤）は数字が恣意的になるので採らない。baseline は現状値。
//
// 判定: カテゴリ別件数が baseline を **1 でも超えたら** exit 1。
//   下回った場合は「返済済み」として baseline の更新を促す（赤にはしない）。
//
// baseline 更新: node scripts/check-knip-ratchet.mjs --update-baseline
//
// exit 0 = 増加なし / exit 1 = 増加あり or 検査不成立

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(ROOT, ".claude/state/quality/knip-baseline.json");
const UPDATE = process.argv.includes("--update-baseline");

// knip の見出し行「Unused files (48)」から カテゴリ→件数 を拾う。
function runKnip() {
  let out = "";
  try {
    out = execFileSync("npx", ["knip", "--no-progress"], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
      // Windows は npx が npx.cmd なので shell 無しだと ENOENT で「検査不成立」になり、
      // ローカルから --update-baseline すら打てない。コマンドは内部固定でユーザー入力を
      // 含まないため shell 経由で安全に起動できる（quality-audit.mjs と同じ扱い）。
      shell: process.platform === "win32",
    });
  } catch (e) {
    // knip は指摘があると非 0 で終了する。stdout があれば正常な検査結果。
    out = (e.stdout || "").toString();
    if (!out.trim()) {
      return { error: (e.stderr || e.message || String(e)).toString().trim().split("\n")[0] };
    }
  }
  const counts = {};
  for (const m of out.matchAll(/^([A-Z][A-Za-z ]+?)\s+\((\d+)\)\s*$/gm)) {
    counts[m[1].trim()] = Number(m[2]);
  }
  return { counts, raw: out };
}

const res = runKnip();

// 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）。
if (res.error) {
  console.error(`[check-knip-ratchet] 検査不成立: knip を実行できませんでした — ${res.error}`);
  console.error("  「増加なし」ではありません。knip 自体の破損を疑ってください。");
  process.exit(1);
}
if (Object.keys(res.counts).length === 0) {
  console.error("[check-knip-ratchet] 検査不成立: knip の出力からカテゴリを 1 件も抽出できませんでした。");
  console.error("  出力フォーマットの変更を疑ってください（「指摘ゼロ」ではありません）。");
  process.exit(1);
}

if (UPDATE) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _doc:
          "デッドコード ラチェットの baseline。knip のカテゴリ別件数。増加のみ CI で赤落ちさせ、" +
          "既存分は週次レビューの棚卸しで漸減させる。更新: node scripts/check-knip-ratchet.mjs --update-baseline",
        counts: res.counts,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("[check-knip-ratchet] baseline を更新しました:");
  for (const [k, v] of Object.entries(res.counts)) console.log(`  ${k}: ${v}`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`[check-knip-ratchet] baseline がありません: ${BASELINE}`);
  console.error("  初回は node scripts/check-knip-ratchet.mjs --update-baseline で作成してください。");
  process.exit(1);
}

const base = JSON.parse(readFileSync(BASELINE, "utf-8")).counts || {};
const keys = [...new Set([...Object.keys(base), ...Object.keys(res.counts)])].sort();

const worse = [];
const better = [];
for (const k of keys) {
  const now = res.counts[k] ?? 0;
  const was = base[k] ?? 0;
  if (now > was) worse.push({ k, was, now });
  else if (now < was) better.push({ k, was, now });
}

console.log(`[check-knip-ratchet] knip カテゴリ ${keys.length} 種を baseline と実比較`);
for (const k of keys) {
  const now = res.counts[k] ?? 0;
  const was = base[k] ?? 0;
  const mark = now > was ? "▲" : now < was ? "▼" : " ";
  console.log(`  ${mark} ${k}: ${now}（baseline ${was}）`);
}

if (better.length) {
  console.log(
    `\n[check-knip-ratchet] 返済を確認: ${better.map((b) => `${b.k} ${b.was}→${b.now}`).join(" / ")}` +
      "\n  → node scripts/check-knip-ratchet.mjs --update-baseline で baseline を締め直してください",
  );
}

if (worse.length) {
  console.error(`\n[check-knip-ratchet] FAIL: デッドコードが増えています。`);
  for (const w of worse) console.error(`  ▲ ${w.k}: ${w.was} → ${w.now}`);
  console.error(
    "\n  knip は false positive を出すので機械的に消さない（grep 裏取り必須）。" +
      "\n  正当な増加（新規の動的 import 等）なら knip.json の ignore か --update-baseline で承認する。",
  );
  process.exit(1);
}

console.log("\n[check-knip-ratchet] ✓ baseline からの増加はありません");
process.exit(0);

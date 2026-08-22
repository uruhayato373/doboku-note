#!/usr/bin/env node
/**
 * run-search-growth-audit.mjs — GSC UI 取得 → 正規化 → 突合 → SSOT ゲート の順に回す
 * ---------------------------------------------------------------------------
 * なぜシェル連鎖をやめたか（2026-07-30）:
 *   - `&&` だと取得が**部分成功**（exit 2）した時点で止まり、取れた分の正規化すらされない。
 *   - `;` は cmd.exe では区切りにならず、npm が `gsc-ui:fetch;` というスクリプト名を探して即死する
 *     （Windows で実測）。POSIX と Windows の両方で動く「失敗を許容する連鎖」はシェルでは書けない。
 * よって連鎖の意味（どの exit code なら続行するか）をコードで持つ。
 *
 * 取得の exit code:
 *   0 = 完全 / 2 = 不完全（部分成功・全ゼロ）→ **続行**（取れた分を正規化して突合する）
 *   3 = 未ログイン / 5 = property 不一致 / 6 = レポート到達不能 → **中断**（取り直しが必要）
 *
 * usage:
 *   npm run search-growth:audit
 *   npm run search-growth:audit -- --issues crawledNotIndexed,redirect   # 取得の引数はそのまま渡る
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from "node:child_process";

const passthrough = process.argv.slice(2);

/** 取得を中断すべき exit code（取り直しが必要な状態）。 */
const FATAL_FETCH_CODES = new Set([3, 5, 6]);
/** 起動そのものに失敗したときの内部コード（スクリプトの exit code とは別物）。 */
const LAUNCH_FAILED = 127;

/**
 * 各ステップは **node で直接**起動する（npm を介さない）。
 * Node 20 以降は `.cmd`（npm.cmd）を shell:false で spawn できず EINVAL になり、
 * shell:true にすると引数のクォート差が OS 依存になるため（Windows で実測）、
 * npm script 名ではなく実体スクリプトを呼ぶのが決定的。
 */
const STEPS = {
  "gsc-ui:fetch": "scripts/fetch-gsc-ui-csv.mjs",
  "google-console:normalize": "scripts/normalize-google-console-csv.mjs",
  "search-growth:report": "scripts/report-search-growth.mjs",
  "check-google-ui-ssot": "scripts/check-google-ui-ssot.mjs",
};

function run(name, args = []) {
  const script = STEPS[name];
  console.log(`\n▸ node ${script}${args.length ? " " + args.join(" ") : ""}`);
  const r = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", shell: false });
  if (r.error) {
    console.error(`[audit] ${name} の起動に失敗: ${r.error.message}`);
    return LAUNCH_FAILED;
  }
  return r.status ?? LAUNCH_FAILED;
}

const steps = [];

// 1. 取得（部分成功は許容）
const fetchCode = run("gsc-ui:fetch", passthrough);
steps.push({ step: "gsc-ui:fetch", code: fetchCode });
if (FATAL_FETCH_CODES.has(fetchCode)) {
  console.error(
    `\n[audit] ✗ 取得を中断（exit ${fetchCode}）。` +
      `${fetchCode === 3 ? " 未ログインです → `npm run google-console:login`" : ""}` +
      `${fetchCode === 5 ? " 対象プロパティが一致しません。" : ""}` +
      `${fetchCode === 6 ? " Page indexing レポートに到達できません（UI 変更の可能性）。" : ""}`,
  );
  process.exit(fetchCode);
}
if (fetchCode === 2) {
  console.log("\n[audit] 取得は不完全（部分成功）。取れた分だけ正規化して突合を続けます。");
}

// 2. 正規化（downloaded 0 件なら自分で exit 1 して止まる）
const normCode = run("google-console:normalize");
steps.push({ step: "google-console:normalize", code: normCode });
if (normCode === 1) {
  console.error("\n[audit] ✗ 正規化不成立（downloaded 0 件）。取得をやり直してください。");
  process.exit(1);
}

// 3. 突合レポート
const reportCode = run("search-growth:report");
steps.push({ step: "search-growth:report", code: reportCode });
if (reportCode !== 0) {
  console.error(`\n[audit] ✗ 突合レポートが失敗（exit ${reportCode}）。`);
  process.exit(reportCode);
}

// 4. SSOT 整合ゲート（「取得したつもり」で終われないようにする）
const gateCode = run("check-google-ui-ssot");
steps.push({ step: "check-google-ui-ssot", code: gateCode });

console.log("\n=== search-growth:audit サマリ ===");
for (const s of steps) console.log(`  ${s.code === 0 ? "OK  " : `exit${s.code}`} ${s.step}`);
const worst = steps.some((s) => s.code !== 0);
if (worst) {
  console.log("\n[audit] 完了（不完全あり）。上の exit を確認してください。");
  process.exit(2);
}
console.log("\n[audit] ✓ 全ステップ完全");
process.exit(0);

#!/usr/bin/env node
/**
 * report-automation-failure.mjs
 * ---------------------------------------------------------------------------
 * 自動化の失敗を GitHub Issue に記録する共通経路（作成 or 既存へコメント追記）。
 *
 * なぜ Issue か: 本 repo は「GitHub Issue は使わない」（タスク管理は docs/todo/）が原則。
 * 本スクリプトはその**限定例外**＝「自動化が失敗したことの記録」だけに使う。
 * 理由: job summary もクラウドルーティンの最終報告も**人が見に行かないと届かない**ため、
 * 沈黙した自動化ほど気づかれない（2026-07/08 の月次カバレッジ 2 回分の記録欠落がまさにこれ）。
 * Issue は通知が飛び open のまま残るので、能動チャネルとして機能する。
 * 真実源: .claude/knowledge/reference/information-architecture.md
 *
 * 重複防止: 同一 channel の open Issue があれば**新規作成せずコメント追記**する。
 * 毎週赤くなるたびに Issue が増える運用は、すぐ無視されるようになるため。
 * クローズは人間（復旧の実体検証を挟む＝自動クローズしない）。
 *
 * 使い方:
 *   node scripts/report-automation-failure.mjs --channel gsc-auto-review \
 *     --title "fetch-metrics 停止疑い（最新データ 9 日前）" --body-file /tmp/body.md
 *   node scripts/report-automation-failure.mjs --channel x --title y --body "..." --dry-run
 *
 * 要 `gh` CLI と GH_TOKEN（Actions では secrets.GITHUB_TOKEN、ルーティンでは既存の認証）。
 * exit 0 = 記録できた / exit 1 = 記録できなかった（呼び出し側のログに残す）
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LABEL = "automation-failure";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};
const DRY = args.includes("--dry-run");

const channel = flag("channel");
const titleText = flag("title");
const bodyFile = flag("body-file");
const bodyInline = flag("body");

if (!channel || !titleText) {
  console.error("usage: --channel <name> --title <text> [--body <text> | --body-file <path>] [--dry-run]");
  process.exit(1);
}

let body = bodyInline ?? "";
if (bodyFile) {
  try {
    body = readFileSync(bodyFile, "utf-8");
  } catch (e) {
    console.error(`[report-automation-failure] body-file を読めない: ${bodyFile}（${e.message}）`);
    process.exit(1);
  }
}

/** タイトル規約: `[auto] {channel}: {事象}`。前半が重複判定キーになる。 */
const prefix = `[auto] ${channel}:`;
const title = `${prefix} ${titleText}`;
const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const footer = `\n\n---\n記録: ${stamp} / channel: \`${channel}\`\nこの Issue は自動起票です。**復旧を確認した人がクローズ**してください（自動クローズしません）。`;

function gh(argv, opts = {}) {
  return execFileSync("gh", argv, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

if (DRY) {
  console.log(`[dry-run] title: ${title}`);
  console.log(`[dry-run] label: ${LABEL}`);
  console.log(`[dry-run] body:\n${body}${footer}`);
  process.exit(0);
}

// 1) 同一 channel の open Issue を探す（ラベル + タイトル前方一致）。
let existing = null;
try {
  const out = gh(["issue", "list", "--label", LABEL, "--state", "open", "--limit", "50", "--json", "number,title"]);
  const list = JSON.parse(out || "[]");
  existing = list.find((i) => typeof i.title === "string" && i.title.startsWith(prefix)) ?? null;
  console.log(`[report-automation-failure] open な ${LABEL} Issue ${list.length} 件を走査 → ${existing ? `既存 #${existing.number}` : "同 channel の既存なし"}`);
} catch (e) {
  // 走査に失敗したら「既存なし」と決めつけない（重複起票より、失敗を明示して止める方が安全）。
  console.error(`[report-automation-failure] Issue 一覧の取得に失敗: ${e.message}`);
  process.exit(1);
}

try {
  if (existing) {
    gh(["issue", "comment", String(existing.number), "--body", `**再発**: ${titleText}\n\n${body}${footer}`]);
    console.log(`[report-automation-failure] 既存 Issue #${existing.number} へコメント追記`);
  } else {
    const out = gh(["issue", "create", "--label", LABEL, "--title", title, "--body", `${body}${footer}`]);
    console.log(`[report-automation-failure] Issue 作成: ${out.trim()}`);
  }
} catch (e) {
  console.error(`[report-automation-failure] 記録に失敗: ${e.message}`);
  console.error(`  ラベル ${LABEL} が未作成の可能性 → gh label create ${LABEL} --description "自動化の失敗記録"`);
  process.exit(1);
}
process.exit(0);

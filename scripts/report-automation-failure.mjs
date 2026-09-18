#!/usr/bin/env node
/**
 * report-automation-failure.mjs
 * ---------------------------------------------------------------------------
 * 自動化の失敗を GitHub Issue に記録する共通経路（作成 or 既存へコメント追記）と、
 * 復旧時に同 channel の Issue を自動クローズする経路（--resolve）。
 *
 * なぜ Issue か: 本 repo は「GitHub Issue は使わない」（タスク管理は .claude/todo/）が原則。
 * 本スクリプトはその**限定例外**＝「自動化が失敗したことの記録」だけに使う。
 * 理由: job summary もクラウドルーティンの最終報告も**人が見に行かないと届かない**ため、
 * 沈黙した自動化ほど気づかれない（2026-07/08 の月次カバレッジ 2 回分の記録欠落がまさにこれ）。
 * Issue は通知が飛び open のまま残るので、能動チャネルとして機能する。
 * 真実源: .claude/knowledge/reference/information-architecture.md
 *
 * 重複防止: 同一 channel の open Issue があれば**新規作成せずコメント追記**する。
 * 毎週赤くなるたびに Issue が増える運用は、すぐ無視されるようになるため。
 *
 * クローズ（2026-09-18 に方針転換）: 起票した自動化が次に**成功したとき同 channel の open Issue を
 * 自動クローズ**する（--resolve）。それまでは「クローズは人間」だったが、復旧しても誰も閉じず
 * open 8 件・最古 43 日が溜まり、通知チャネルとして死んでいた（W37 レビュー「消化停止」）。
 * 自動クローズ後も 7 日超 open のものだけが慢性問題として週次レビューに残る。
 * --resolve を配線していない channel（人手ルーティンからの起票等）は従来どおり人が閉じる。
 *
 * 通知の到達（2026-09-18 追加）:
 *   - 起票時に Issue を担当者へ割り当てる（--assignee / 環境変数 AUTOMATION_ISSUE_ASSIGNEE /
 *     GitHub Actions 既定の GITHUB_REPOSITORY_OWNER）。割り当ては GitHub の通知メール
 *     （参加中の Issue）として届くので、Gmail 側の設定なしで受信箱に出る。--no-assignee で抑止。
 *   - SLACK_WEBHOOK_URL が設定されていれば、起票・再発・復旧を Incoming Webhook へも送る。
 *     未設定なら何もしない（secret を足すだけで有効になる）。送信失敗は警告のみで Issue 記録は止めない。
 *
 * 使い方:
 *   node scripts/report-automation-failure.mjs --channel gsc-auto-review \
 *     --title "fetch-metrics 停止疑い（最新データ 9 日前）" --body-file /tmp/body.md
 *   node scripts/report-automation-failure.mjs --channel x --title y --body "..." --dry-run
 *   node scripts/report-automation-failure.mjs --resolve --channel ops [--body "復旧 run: URL"]
 *
 * 要 `gh` CLI と GH_TOKEN（Actions では secrets.GITHUB_TOKEN、ルーティンでは既存の認証）。
 * exit 0 = 記録できた / exit 1 = 記録できなかった（呼び出し側のログに残す）
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const LABEL = "automation-failure";

/** タイトル規約: `[auto] {channel}: {事象}`。前半が重複判定キーになる。 */
export function issuePrefix(channel) {
  return `[auto] ${channel}:`;
}

/** open Issue 一覧から同 channel のものを探す（ラベルは呼び出し側で絞る）。 */
export function findExisting(list, channel) {
  const prefix = issuePrefix(channel);
  return list.find((i) => typeof i.title === "string" && i.title.startsWith(prefix)) ?? null;
}

/**
 * 担当者の決定。明示 > 環境変数 > Actions 既定（repo owner）。--no-assignee で null。
 * 組織所有の repo では GITHUB_REPOSITORY_OWNER が組織名になり assign できないので、
 * その場合は AUTOMATION_ISSUE_ASSIGNEE で人を指定する。
 */
export function resolveAssignee({ flag, noAssignee, env }) {
  if (noAssignee) return null;
  return flag || env.AUTOMATION_ISSUE_ASSIGNEE || env.GITHUB_REPOSITORY_OWNER || null;
}

/** Slack Incoming Webhook 向けの 1 行本文。Issue URL があれば添える。 */
export function slackText({ kind, channel, title, issueUrl }) {
  const head = { created: "🔴 自動化の失敗", recurred: "🔁 再発", resolved: "✅ 復旧" }[kind] ?? kind;
  return `${head} [${channel}] ${title}${issueUrl ? `\n${issueUrl}` : ""}`;
}

export async function postSlack(webhookUrl, text, fetchImpl = globalThis.fetch) {
  if (!webhookUrl) return { sent: false, reason: "SLACK_WEBHOOK_URL 未設定" };
  try {
    const res = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { sent: false, reason: `HTTP ${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

function gh(argv, opts = {}) {
  return execFileSync("gh", argv, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
  };
  const DRY = args.includes("--dry-run");
  const RESOLVE = args.includes("--resolve");

  const channel = flag("channel");
  const titleText = flag("title");
  const bodyFile = flag("body-file");
  const bodyInline = flag("body");
  const assignee = resolveAssignee({ flag: flag("assignee"), noAssignee: args.includes("--no-assignee"), env: process.env });
  const slackUrl = process.env.SLACK_WEBHOOK_URL || "";

  if (!channel || (!RESOLVE && !titleText)) {
    console.error("usage: --channel <name> --title <text> [--body <text> | --body-file <path>] [--assignee <login> | --no-assignee] [--dry-run]");
    console.error("       --resolve --channel <name> [--body <text> | --body-file <path>] [--dry-run]");
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

  const prefix = issuePrefix(channel);
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // ── --resolve: 同 channel の open Issue を復旧コメント付きでクローズ ──────────────
  if (RESOLVE) {
    const comment = `**復旧**: 同 channel の自動化が成功した（${stamp}）。${body ? `\n\n${body}` : ""}\n\n---\n自動クローズ（report-automation-failure --resolve / channel: \`${channel}\`）。再発すれば新しい Issue が起票される。`;
    if (DRY) {
      console.log(`[dry-run] resolve channel: ${channel}`);
      console.log(`[dry-run] comment:\n${comment}`);
      process.exit(0);
    }
    let existing = null;
    try {
      const out = gh(["issue", "list", "--label", LABEL, "--state", "open", "--limit", "50", "--json", "number,title,url"]);
      existing = findExisting(JSON.parse(out || "[]"), channel);
    } catch (e) {
      console.error(`[report-automation-failure] Issue 一覧の取得に失敗: ${e.message}`);
      process.exit(1);
    }
    if (!existing) {
      console.log(`[report-automation-failure] channel '${channel}' の open Issue なし — クローズ対象なし`);
      process.exit(0);
    }
    try {
      gh(["issue", "close", String(existing.number), "--comment", comment]);
      console.log(`[report-automation-failure] Issue #${existing.number} を復旧クローズ`);
    } catch (e) {
      console.error(`[report-automation-failure] クローズに失敗: ${e.message}`);
      process.exit(1);
    }
    const slack = await postSlack(slackUrl, slackText({ kind: "resolved", channel, title: existing.title.slice(prefix.length).trim(), issueUrl: existing.url }));
    if (!slack.sent && slackUrl) console.warn(`[report-automation-failure] Slack 送信失敗（Issue は処理済み）: ${slack.reason}`);
    process.exit(0);
  }

  // ── 起票 / 再発コメント ────────────────────────────────────────────────────────
  const title = `${prefix} ${titleText}`;
  const footer = `\n\n---\n記録: ${stamp} / channel: \`${channel}\`\nこの Issue は自動起票です。起票元の自動化が次に成功したとき自動クローズします（\`--resolve\` 配線済みの channel）。配線が無い channel は復旧を確認した人がクローズしてください。`;

  if (DRY) {
    console.log(`[dry-run] title: ${title}`);
    console.log(`[dry-run] label: ${LABEL}`);
    console.log(`[dry-run] assignee: ${assignee ?? "(なし)"}`);
    console.log(`[dry-run] slack: ${slackUrl ? "送信する" : "SLACK_WEBHOOK_URL 未設定"}`);
    console.log(`[dry-run] body:\n${body}${footer}`);
    process.exit(0);
  }

  // 1) 同一 channel の open Issue を探す（ラベル + タイトル前方一致）。
  let existing = null;
  try {
    const out = gh(["issue", "list", "--label", LABEL, "--state", "open", "--limit", "50", "--json", "number,title,url"]);
    const list = JSON.parse(out || "[]");
    existing = findExisting(list, channel);
    console.log(`[report-automation-failure] open な ${LABEL} Issue ${list.length} 件を走査 → ${existing ? `既存 #${existing.number}` : "同 channel の既存なし"}`);
  } catch (e) {
    // 走査に失敗したら「既存なし」と決めつけない（重複起票より、失敗を明示して止める方が安全）。
    console.error(`[report-automation-failure] Issue 一覧の取得に失敗: ${e.message}`);
    process.exit(1);
  }

  let issueUrl = existing?.url ?? null;
  let kind = existing ? "recurred" : "created";
  try {
    if (existing) {
      gh(["issue", "comment", String(existing.number), "--body", `**再発**: ${titleText}\n\n${body}${footer}`]);
      console.log(`[report-automation-failure] 既存 Issue #${existing.number} へコメント追記`);
    } else {
      const argv = ["issue", "create", "--label", LABEL, "--title", title, "--body", `${body}${footer}`];
      if (assignee) argv.push("--assignee", assignee);
      const out = gh(argv);
      issueUrl = out.trim().split("\n").pop();
      console.log(`[report-automation-failure] Issue 作成: ${issueUrl}${assignee ? `（担当: ${assignee}）` : ""}`);
    }
  } catch (e) {
    console.error(`[report-automation-failure] 記録に失敗: ${e.message}`);
    console.error(`  ラベル ${LABEL} が未作成の可能性 → gh label create ${LABEL} --description "自動化の失敗記録"`);
    console.error(`  担当者が assign できない（組織 repo 等）なら --no-assignee か AUTOMATION_ISSUE_ASSIGNEE で人を指定`);
    process.exit(1);
  }
  const slack = await postSlack(slackUrl, slackText({ kind, channel, title: titleText, issueUrl }));
  if (!slack.sent && slackUrl) console.warn(`[report-automation-failure] Slack 送信失敗（Issue は記録済み）: ${slack.reason}`);
  process.exit(0);
}

// import 時は実行しない（テストが純関数を読めるようにする）。
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) main();

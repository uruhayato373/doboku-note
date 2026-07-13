#!/usr/bin/env node
// 週次レビュー サイクルの「サイレント欠落」検知ガード。
//
// 目的: `/weekly-review` を回すクラウドルーティン（正典 = `doboku-note weekly PDCA`）が
//   停止・無効・cron ズレで発火しなくなっても、状態はクラウド側にしかなく repo からは
//   見えない。実際 2026-W27/W28 の 2 週分が silent に欠落した（W26 で更新が止まっていた）。
//   本ガードは「先週分の review md が存在するか」を毎週月曜に決定的に検査し、無ければ
//   赤落ちさせてルーティン停止を可視化する（r2-audit / check-ogp-coverage と同じ backstop 思想）。
//
// 修正方法（赤落ち時）: クラウドルーティンを対話セッション（デスクトップ/web アプリ）で
//   list-first（/routines）→ 無ければ /schedule で再作成、cron ズレなら update。
//   真実源: docs/reference/workflows.md「週次運用」/ .claude/skills/management/routines/SKILL.md
//
// exit 0 = 先週分あり（OK）/ exit 1 = 欠落（ルーティン要確認）。

import { existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = join(__dirname, "..", "docs", "reviews", "weekly");

// ISO 8601 週番号（月曜始まり・週の木曜が属する年が ISO 年）。
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Sun=0 → 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // その週の木曜へ移動
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function writeSummary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  }
}

const now = new Date();
// 先週（＝直近で完了した ISO 週）を対象にする。今 - 7 日は必ず前 ISO 週に落ちる。
const target = isoWeek(new Date(now.getTime() - 7 * 86400000));
const weekId = `${target.year}-W${String(target.week).padStart(2, "0")}`;
const file = join(REVIEW_DIR, `${weekId}-review.md`);
const relFile = `docs/reviews/weekly/${weekId}-review.md`;

const lines = [
  "## 週次レビュー サイクル ガード",
  "",
  `- 検査対象週: **${weekId}**`,
  `- 期待ファイル: \`${relFile}\``,
  "",
];

if (existsSync(file)) {
  lines.push(`OK: ${weekId} の週次レビューは生成済みです。`);
  writeSummary(lines);
  console.log(`OK: ${relFile} exists — 週次レビュー サイクルは回っています。`);
  process.exit(0);
} else {
  lines.push(
    `> **欠落**: ${weekId} の週次レビューがありません。`,
    ">",
    "> `/weekly-review` を回すクラウドルーティンが停止/無効/cron ズレの疑いがあります。",
    "> 対処: 対話セッションで `/routines`（list-first）→ 無ければ `/schedule` で再作成、",
    "> または既存を `update`（enabled/cron 是正）。真実源: `.claude/skills/management/routines/SKILL.md`"
  );
  writeSummary(lines);
  console.error(
    `週次レビュー欠落: ${relFile} が存在しません。` +
      `クラウドルーティン（doboku-note weekly PDCA）の発火状態を確認してください。`
  );
  process.exit(1);
}

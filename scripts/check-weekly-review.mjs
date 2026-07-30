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
//   真実源: .claude/knowledge/reference/workflows.md「週次運用」/ .claude/skills/management/routines/SKILL.md
//
// exit 0 = 先週分あり（OK）/ exit 1 = 欠落（ルーティン要確認）。

import { existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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

/**
 * ファイルが今存在しなくても「その週のレビューが生成されたことがあるか」を git 履歴で見る。
 *
 * なぜ必要か（2026-07-30 修正）: 週次レビューには **保持方針（最新週だけ残す）** があり、
 * W31 を作るコミットが W30 を削除する（実例: 58dfb22c1「旧W30は保持方針で削除」）。
 * 旧実装は「先週分のファイルが今あるか」だけを見ていたため、**サイクルが正常に回っていても
 * 毎週必ず赤くなる**構造だった（2026-07-20・07-27 の赤はこれが原因で、ルーティン停止ではない）。
 * 常に赤いゲートは読み飛ばされるようになり、本当の欠落を隠す。
 *
 * 履歴が浅い（shallow clone）と誤判定するので、取得できたかを区別して返す。
 * @returns {{ ok: boolean, reason: string }}
 */
function existedInHistory(relPath) {
  try {
    const out = execFileSync("git", ["log", "--all", "--diff-filter=A", "--format=%H %ad", "--date=short", "--", relPath], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out) return { ok: true, reason: `git 履歴に生成コミットあり（${out.split("\n")[0]}）` };
    // 履歴が浅いと「無い」と「見えない」を区別できないので shallow を明示的に検出する
    const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf-8" }).trim();
    if (shallow === "true") {
      return { ok: false, reason: "履歴が shallow で判定不能（checkout に fetch-depth: 0 が必要）" };
    }
    return { ok: false, reason: "git 履歴にも生成コミットが無い" };
  } catch (e) {
    return { ok: false, reason: `git 履歴を参照できなかった: ${e?.message ?? e}` };
  }
}

if (existsSync(file)) {
  lines.push(`OK: ${weekId} の週次レビューは生成済みです（ファイル実在）。`);
  writeSummary(lines);
  console.log(`OK: ${relFile} exists — 週次レビュー サイクルは回っています。`);
  process.exit(0);
}

// ファイルが無い → 保持方針で削除された可能性を git 履歴で確認する
const hist = existedInHistory(relFile);
if (hist.ok) {
  lines.push(
    `OK: ${weekId} の週次レビューは生成済みです（現在はファイル無し・**保持方針で削除**）。`,
    "",
    `- 根拠: ${hist.reason}`,
    "- 週次レビューは最新週だけを残す運用のため、翌週分の生成時に前週分が削除される。",
  );
  writeSummary(lines);
  console.log(`OK: ${relFile} は削除済みだが生成実績あり（${hist.reason}）— サイクルは回っています。`);
  process.exit(0);
}

lines.push(
  `> **欠落**: ${weekId} の週次レビューが生成された記録がありません。`,
  ">",
  `> 判定根拠: ファイル無し ＋ ${hist.reason}`,
  ">",
  "> **先に切り分ける**（いきなりルーティンを作らない）:",
  "> 1. 直近の週次レビューが誰の手で生成されているか — `git log --format='%ad %an' --date=short -- docs/reviews/weekly/`",
  ">    対話セッションで回っているなら routine は不要（作ると二重生成になる）",
  "> 2. routine を確認するときは **必ず list-first**（`/routines`）。`RemoteTrigger list` は",
  ">    ページングされ全件を返さないので、不在を確認できないなら **作成しない**",
  ">    （2026-05-30 の weekly-review 重複生成事故の再発防止）",
  "> 3. 真実源: `.claude/skills/management/routines/SKILL.md`",
);
writeSummary(lines);
console.error(
  `週次レビュー欠落: ${relFile} が存在せず、git 履歴にも生成記録がありません（${hist.reason}）。` +
    `ルーティンを作る前に「誰が生成しているか」を先に切り分けてください。`
);
process.exit(1);

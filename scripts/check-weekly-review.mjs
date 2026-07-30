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

import { existsSync, appendFileSync, readdirSync } from "node:fs";
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

/**
 * 判定は「**存在する中で最も新しい週**が、先週以降か」で行う（2026-07-30 改訂）。
 *
 * なぜファイル存在チェックではダメか: 週次レビューには **保持方針（最新週だけ残す）** があり、
 * W31 を作るコミットが W30 を削除する（実例: 58dfb22c1「旧W30は保持方針で削除」）。
 * 旧実装は「先週分のファイルが今あるか」を見ていたため、**サイクルが正常に回っていても
 * 翌週分が作られた瞬間に必ず赤くなる**構造だった（2026-07-20・07-27 の赤はこれが原因で、
 * クラウドルーティン停止ではない）。常に赤いゲートは読み飛ばされ、本当の欠落を隠す。
 *
 * なぜ git 履歴ではダメか: 一度は履歴（`git log --diff-filter=A`）で判定する実装にしたが、
 * `fetch-depth: 0` が必要になり、このリポジトリ（65,000 ファイル）では checkout が job の
 * 5 分タイムアウトを超えて **cancelled** になった（2026-07-30 実測）。判定のために CI を
 * 重くするのは筋が悪い。
 *
 * 最新週だけを見る方式なら履歴も全取得も不要で、かつ「何週も止まっている」を正しく検出できる:
 * 保持方針下でも最新週は必ず 1 つ残るので、それが先週より古ければ本物の停止。
 */
function latestReviewWeek() {
  if (!existsSync(REVIEW_DIR)) return null;
  const weeks = readdirSync(REVIEW_DIR)
    .map((f) => f.match(/^(\d{4})-W(\d{2})-review\.md$/))
    .filter(Boolean)
    .map((m) => ({ year: Number(m[1]), week: Number(m[2]), id: `${m[1]}-W${m[2]}` }));
  if (!weeks.length) return null;
  weeks.sort((a, b) => a.year - b.year || a.week - b.week);
  return weeks[weeks.length - 1];
}

/** 週の新旧比較（year, week の辞書順）。 */
const weekRank = (w) => w.year * 100 + w.week;

const latest = latestReviewWeek();
lines.push(`- 現存する最新レビュー: **${latest ? latest.id : "なし"}**`, "");

if (latest && weekRank(latest) >= weekRank(target)) {
  const note =
    latest.id === weekId
      ? "先週分がそのまま残っています"
      : `先週分（${weekId}）は保持方針で削除済みですが、より新しい ${latest.id} が存在します`;
  lines.push(`OK: 週次レビュー サイクルは回っています（${note}）。`);
  writeSummary(lines);
  console.log(`OK: 最新レビュー ${latest.id} >= 対象週 ${weekId} — サイクルは回っています（${note}）。`);
  process.exit(0);
}

lines.push(
  `> **停滞**: 最新の週次レビューが ${latest ? latest.id : "存在しません"}。対象週 ${weekId} に達していません。`,
  ">",
  "> **先に切り分ける**（いきなりルーティンを作らない）:",
  "> 1. 直近の週次レビューを誰が生成しているか確認 —",
  ">    `git log --format='%ad %an' --date=short -5 -- docs/reviews/weekly/`",
  ">    対話セッションで回っているなら routine は不要（作ると二重生成になる）",
  "> 2. routine を確認するときは **必ず list-first**（`/routines`）。`RemoteTrigger list` は",
  ">    ページングされ全件を返さないので、不在を確認できないなら **作成しない**",
  ">    （2026-05-30 の weekly-review 重複生成事故の再発防止）",
  "> 3. 真実源: `.claude/skills/management/routines/SKILL.md`",
);
writeSummary(lines);
console.error(
  `週次レビュー停滞: 最新レビューは ${latest ? latest.id : "なし"} で、対象週 ${weekId} に達していません。` +
    `ルーティンを作る前に「誰が生成しているか」を先に切り分けてください。`
);
process.exit(1);

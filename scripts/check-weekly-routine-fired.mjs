#!/usr/bin/env node
// クラウドルーティン `doboku-note weekly PDCA` が「実際に成果物を出したか」を検査する。
//
// なぜ check-weekly-review.mjs だけでは足りないか:
//   あちらは「週次レビューのファイルが存在するか」を見る。ところがレビューは**人手でも書ける**ので、
//   ルーティンが死んでいても対話セッションで補完すればガードは緑になる。実際 2026-07-31 以降
//   ルーティンは毎週発火しながら 3 回連続で成果物ゼロだったのに、W31/W32 が人手で書かれていたため
//   ガードは緑を出し続け、**13 日間（W33 欠落）まで誰も気づかなかった**（2026-08-16 実測）。
//   「成果物がある」と「自動化が生きている」は別の命題で、前者だけ見ると後者の死を見逃す。
//
// 何を見るか: ルーティンは成功すると必ず `claude/weekly-pdca-YYYY-Www` ブランチで PR を作る
//   （ルーティン本文の手順 6-8）。よって「対象週の PR が存在するか」が発火成功の決定的な証拠になる。
//   git 履歴は使わない（fetch-depth:0 が要り 65,000 ファイルの checkout が CI の 5 分制限を超える
//   ＝ 2026-07-30 実測。check-weekly-review.mjs の設計コメント参照）。gh の PR 検索なら履歴不要。
//
// 判定: 直近 2 週とも routine 産 PR が無ければ NG（＝持続的な死）。1 週だけなら OK に留める
//   ——たまたま人手で回した週を毎回赤くすると、常に赤いゲートは読み飛ばされて本物の欠落を隠す
//   （check-weekly-review.mjs が 2026-07-30 に学んだのと同じ轍を踏まない）。
//
// exit 0 = 発火している / exit 1 = 2 週連続で成果物なし / exit 2 = 検査不成立（gh 不通等）
//
// 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）: gh が叩けなければ **exit 2** を返し、
// 決して「異常なし」とは言わない。沈黙の検出器自身が沈黙するのが最悪だから。

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const WEEKS_TO_CHECK = 2;

/** ISO 8601 週番号（月曜始まり・週の木曜が属する年が ISO 年）。check-weekly-review.mjs と同一実装。 */
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

const weekIdOf = (date) => {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

const asJson = process.argv.includes("--json");
const now = new Date();

// 直近の「完了した」週から遡って WEEKS_TO_CHECK 週分。now-7d は必ず前 ISO 週に落ちる。
const targets = Array.from({ length: WEEKS_TO_CHECK }, (_, i) =>
  weekIdOf(new Date(now.getTime() - (i + 1) * 7 * 86400000)),
);

/** ルーティンが作る PR を head ブランチ名で引く。gh が使えなければ null（＝検査不成立）。 */
function fetchRoutinePrs() {
  try {
    const raw = execFileSync(
      "gh",
      ["pr", "list", "--state", "all", "--limit", "60", "--json", "number,headRefName,state,createdAt"],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return JSON.parse(raw);
  } catch (e) {
    return { error: (e.stderr || e.message || String(e)).trim().split("\n")[0] };
  }
}

const prs = fetchRoutinePrs();

if (prs.error || !Array.isArray(prs)) {
  const detail = prs.error || "gh の出力が配列ではありません";
  const out = {
    check: "weekly-routine-fired",
    inconclusive: true,
    reason: `gh で PR を取得できませんでした: ${detail}`,
    targets,
    inspected: 0,
  };
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    console.error(`[check-weekly-routine-fired] 検査不成立: ${out.reason}`);
    console.error("  対象週 " + targets.join(", ") + " を 1 件も検査していません（異常なしではありません）");
  }
  process.exit(2);
}

const results = targets.map((weekId) => {
  const branch = `claude/weekly-pdca-${weekId}`;
  const pr = prs.find((p) => p.headRefName === branch);
  return { weekId, branch, fired: Boolean(pr), pr: pr ? { number: pr.number, state: pr.state } : null };
});

const firedCount = results.filter((r) => r.fired).length;
const silent = firedCount === 0;

const out = {
  check: "weekly-routine-fired",
  inconclusive: false,
  weeksChecked: targets.length,
  prsInspected: prs.length,
  firedCount,
  silent,
  results,
  review: silent
    ? "ルーティン `doboku-note weekly PDCA`（trig_01Edgim5qXCiGwKtnL4AVEmM）を RemoteTrigger get で確認する。list はページ送りが効かないので get を使う（真実源: .claude/knowledge/reference/workflows.md「発火の信頼性」）"
    : null,
};

if (asJson) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const lines = [
    `[check-weekly-routine-fired] PR ${prs.length} 件を走査 / 対象週 ${targets.length} 週を実検査`,
    ...results.map(
      (r) => `  ${r.weekId}: ${r.fired ? `✓ routine 産 PR #${r.pr.number}（${r.pr.state}）` : "— routine 産 PR なし"}`,
    ),
  ];
  console.log(lines.join("\n"));
  if (silent) {
    console.error(
      `\n[check-weekly-routine-fired] NG: 直近 ${targets.length} 週とも routine の成果物がありません。` +
        "\n  レビュー自体は人手で書けるため check-weekly-review は緑のまま通ります（＝人手が死を隠す）。" +
        `\n  ${out.review}`,
    );
  } else {
    console.log(`\n[check-weekly-routine-fired] OK: 直近 ${targets.length} 週のうち ${firedCount} 週で発火を確認`);
  }
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## 週次ルーティンの発火（成果物ベース）",
      "",
      `- 走査した PR: ${prs.length} 件 / 実検査した週: ${targets.length}`,
      ...results.map((r) => `- ${r.weekId}: ${r.fired ? `発火（PR #${r.pr.number}）` : "**成果物なし**"}`),
      "",
      silent
        ? "> **沈黙**: 直近 2 週とも routine 産 PR がありません。レビューが存在していても、それは人手で書かれたものです。"
        : "> ルーティンは生きています。",
      "",
    ].join("\n") + "\n",
  );
}

process.exit(silent ? 1 : 0);

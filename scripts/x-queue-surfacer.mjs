#!/usr/bin/env node
/**
 * X 予約キュー投入 surfacer
 *
 * 目的: docs/sns/x/draft/ 配下の「コミット済みだが X 予約キューへ未投入」の下書きで、
 *       go-live（最初のツイートの予定日）が近いものを検出し「今週投入せよ」と列挙する。
 *       直前カウントダウンのように週次小分けで投入する運用（§11 凍結回避＝一括投入しない）で、
 *       次バッチの投入忘れ＝予約キューの穴を防ぐための週次 surfacer。
 *
 * 設計:
 *   - オフライン（status.json + tweets.md のみ・Playwright/外部 API 不要）。
 *     → 週次レビューのクラウドルーチン（ローカル creds 無し）でもそのまま動く。
 *   - 投入状態は status.json の SSOT で判定する（publish-x が投入時に scheduled_at を埋める）。
 *     status.json が無い or scheduled_at 未設定のツイート = 未投入。
 *   - go-live 日は tweets.md ヘッダ "— M/D 残りN日" の最小日付から読む。
 *   - 本スクリプトは surface のみ（投入はローカルの publish-x で人手）。
 *
 * 使い方:
 *   node scripts/x-queue-surfacer.mjs                 # 人間可読（週次レビュー Agent I が埋め込む）
 *   node scripts/x-queue-surfacer.mjs --json          # 機械可読
 *   node scripts/x-queue-surfacer.mjs --lookahead 10  # go-live 何日先まで「投入推奨」とするか（既定 8）
 *
 * exit code: 常に 0（surfacer は赤落ちさせない。CI ゲートではなく週次の促し）
 */
import fs from "fs";
import path from "path";

const DRAFT_DIR = path.resolve(process.cwd(), "docs/sns/x/draft");
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes("--json");
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const LOOKAHEAD_DAYS = Number(flag("--lookahead", "8"));

const NOW = new Date();
const DAY_MS = 86_400_000;

// "— M/D" を全部拾って Date 化（年は now 基準・半年以上過去なら翌年へ wrap）
function parseDatesFromMd(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf-8");
  const headers = raw.match(/^## Tweet \d+:.*$/gm) || [];
  const dates = [];
  for (const h of headers) {
    const m = h.match(/—\s*(\d{1,2})\/(\d{1,2})/);
    if (!m) continue;
    const month = Number(m[1]);
    const day = Number(m[2]);
    let d = new Date(NOW.getFullYear(), month - 1, day);
    if (d.getTime() < NOW.getTime() - 183 * DAY_MS) {
      d = new Date(NOW.getFullYear() + 1, month - 1, day);
    }
    dates.push(d);
  }
  return { count: headers.length, dates };
}

// status.json から「scheduled_at が埋まっているツイート数」を数える
function countQueued(statusPath) {
  if (!fs.existsSync(statusPath)) return { exists: false, queued: 0, posted: 0 };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
  } catch {
    return { exists: true, queued: 0, posted: 0, broken: true };
  }
  let queued = 0;
  let posted = 0;
  for (const t of Object.values(data.tweets || {})) {
    if (t.status === "posted") posted++;
    else if (t.scheduled_at) queued++; // scheduled / queued（投入済み or キュー実在）
  }
  return { exists: true, queued, posted };
}

const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const daysUntil = (d) => Math.ceil((d.getTime() - NOW.getTime()) / DAY_MS);

const drafts = [];
let coveredUntil = null; // 既存予約が埋まっている最終 go-live 日

if (fs.existsSync(DRAFT_DIR)) {
  for (const name of fs.readdirSync(DRAFT_DIR).sort()) {
    if (name.startsWith("_") || name.startsWith(".")) continue; // _archive 等は除外
    const dir = path.join(DRAFT_DIR, name);
    const mdPath = path.join(dir, "tweets.md");
    if (!fs.statSync(dir).isDirectory() || !fs.existsSync(mdPath)) continue;

    const { count, dates } = parseDatesFromMd(mdPath);
    if (count === 0) continue;
    const start = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    const end = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    const { exists, queued, posted } = countQueued(path.join(dir, "status.json"));

    const unqueued = count - queued - posted;
    const state = unqueued <= 0 ? "fully-queued" : queued + posted > 0 ? "partial" : "未投入";

    // 既存予約の充足ライン（fully/partial で end 日まで埋まっているとみなす）
    if (queued + posted > 0 && end && (!coveredUntil || end > coveredUntil)) coveredUntil = end;

    drafts.push({ name, count, queued, posted, unqueued, state, start, end });
  }
}

// 投入推奨の判定: 未投入分があり、go-live が lookahead 以内
const horizon = new Date(NOW.getTime() + LOOKAHEAD_DAYS * DAY_MS);
const due = drafts
  .filter((d) => d.unqueued > 0 && d.start && d.start <= horizon)
  .map((d) => ({
    ...d,
    overdue: d.start <= NOW,
    daysToGoLive: daysUntil(d.start),
  }))
  .sort((a, b) => a.start - b.start);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        now: NOW.toISOString(),
        lookahead_days: LOOKAHEAD_DAYS,
        covered_until: coveredUntil ? fmt(coveredUntil) : null,
        due: due.map((d) => ({
          draft: d.name,
          period: d.start ? `${fmt(d.start)}-${fmt(d.end)}` : null,
          tweets: d.count,
          unqueued: d.unqueued,
          days_to_go_live: d.daysToGoLive,
          overdue: d.overdue,
        })),
        all: drafts.map((d) => ({ draft: d.name, state: d.state, unqueued: d.unqueued })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

// 人間可読（週次レビュー Agent I がこのまま埋め込める）
const lines = [];
lines.push(`📮 X 予約キュー投入 surfacer — ${NOW.getFullYear()}/${fmt(NOW)}`);
lines.push(
  `   キュー充足: ${coveredUntil ? `${fmt(coveredUntil)} まで（残り ${daysUntil(coveredUntil)} 日）` : "なし（未投入のみ）"}` +
    `   lookahead: ${LOOKAHEAD_DAYS} 日`
);
lines.push("");

if (due.length === 0) {
  lines.push("✅ 投入待ちなし（lookahead 内に未投入の下書きはありません）");
} else {
  lines.push(`⚠ 今週投入すべき下書き: ${due.length} 件`);
  lines.push("");
  lines.push("| draft | 期間 | go-live | 未投入 | 状態 |");
  lines.push("|---|---|---|---|---|");
  for (const d of due) {
    const go = d.overdue ? `**${d.daysToGoLive <= 0 ? "本日/超過" : `あと${d.daysToGoLive}日`}**` : `あと${d.daysToGoLive}日`;
    const st = d.overdue ? "🔴 OVERDUE（穴リスク）" : "🟡 DUE";
    lines.push(`| ${d.name} | ${fmt(d.start)}-${fmt(d.end)} | ${go} | ${d.unqueued}/${d.count} | ${st} |`);
  }
  lines.push("");
  lines.push("投入手順（要ローカル＝.local/playwright-x-profile のある Mac）:");
  lines.push("  1. npm run x-schedule-guard -- --queue --max-per-day 2   # 緑を確認");
  lines.push("  2. npx tsx .claude/skills/social/publish-x/publish-x.ts <NNN> --tweets 1-<本数> <日時×本数>  # 時刻は±ジッタ・両試験で同時刻回避");
  lines.push("  3. npm run x-sync-status   # queued 昇格数 = 投入本数 を実査（偽成功検証）");
}

console.log(lines.join("\n"));
process.exit(0);

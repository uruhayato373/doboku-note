#!/usr/bin/env node
/**
 * gsc-local-routine.mjs — Mac の launchd（com.doboku-note.gsc-local）が毎日 1 回回す GSC のブラウザ作業
 * ---------------------------------------------------------------------------
 * なぜ Mac の launchd か（2026-09-24 ユーザー判断）:
 *   - 登録リクエストと理由別 UI CSV は API が無く、Google にログインしたブラウザでしか取れない
 *   - GitHub hosted runner で認証を復元すると Google が Mac 側まで全面失効させる（2026-09-21 実測）
 *   - self-hosted runner は公開リポジトリだと fork の PR に Mac 上でコードを実行されうる
 *   → 普段の Chrome のログイン（OS 標準 auth root の google プロファイル）を持つ Mac 自身で動かす。
 *   API で済む処理（sitemap 送信・URL 検査・検索成績）はクラウド CI（fetch-metrics / index-coverage）の担当。
 *
 * 1 回の実行でやること（scripts/scheduled/gsc-local.sh が専用 worktree＝最新の develop で呼ぶ）:
 *   1. 登録リクエスト: 順位表 priority-latest.txt の先頭から 10 件（--stop-at-limit・14 日以内の送信済みは
 *      gsc-request-indexing.mjs が除外）。前回の送信から 20 時間以内なら送らない
 *   2. 理由別 UI CSV（月次）: check-gsc-ui-due が DUE のときだけ fetch → normalize → check-google-ui-ssot
 *   3. 台帳（gsc-indexing・gsc-ui の追跡分）を commit して develop へ push
 *   未ログインなら macOS の通知で知らせる。見張りは CI 側（weekly-review-guard の check-gsc-indexing-due /
 *   check-gsc-ui-due）で、Mac が寝ていて動かなかった週もそこで DUE になる。
 *
 * CLI（専用 worktree のルートで実行する。人の checkout で叩くと今いるブランチに commit するので、
 *      ブランチに乗った HEAD では --dry-run 以外を拒否する）:
 *   node scripts/gsc-local-routine.mjs              # 本番（送信・commit・push）
 *   node scripts/gsc-local-routine.mjs --dry-run    # 送信せず URL 検査の診断だけ・commit しない
 *   node scripts/gsc-local-routine.mjs --no-push    # commit まで（push しない）
 * exit: 0 = 全部できた（送るものが無かったも含む）/ 1 = どこかで失敗・要ログイン
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  classifyIndexingResult,
  classifyUiFetchExit,
  decideIndexingRun,
} from "./lib/gsc-local-routine.mjs";

const DRY = process.argv.includes("--dry-run");
const NO_PUSH = process.argv.includes("--no-push");
const TAG = "[gsc-local]";
const DIR = ".claude/state/metrics/gsc-indexing";
const PRIORITY = `${DIR}/priority-latest.txt`;
const LATEST = `${DIR}/requests-latest.json`;
const HISTORY = `${DIR}/history.json`;
const LEDGER_PATHS = [DIR, ".claude/state/metrics/gsc-ui/last-run.json", ".claude/state/metrics/gsc-ui/ssot"];

const problems = [];
const done = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit", env: process.env }).status ?? 1;
const git = (args) => spawnSync("git", args, { encoding: "utf8" });

function notify(message) {
  if (process.platform !== "darwin") return;
  spawnSync("osascript", ["-e", `display notification "${message}" with title "doboku-note GSC"`]);
}

// 専用 worktree（detached HEAD）以外で送信・commit しない。人の作業ブランチに台帳 commit を混ぜない。
if (!DRY && git(["symbolic-ref", "-q", "HEAD"]).status === 0) {
  console.error(`${TAG} ✗ ブランチに乗った checkout では動かさない（今いるブランチに commit してしまう）。launchd（npm run gsc-local:install -- --run-now）から動かすか --dry-run で試す。`);
  process.exit(2);
}

// --- 1. 登録リクエスト --------------------------------------------------------
const decision = decideIndexingRun({ runs: readJson(HISTORY)?.runs ?? [], hasPriorityList: existsSync(PRIORITY) });
if (!decision.run) {
  console.log(`${TAG} 登録リクエスト: スキップ（${decision.reason}）`);
} else {
  const before = readJson(LATEST);
  const code = run("node", ["scripts/gsc-request-indexing.mjs", "--file", PRIORITY, "--stop-at-limit", ...(DRY ? [] : ["--commit"])]);
  const result = classifyIndexingResult({ exitCode: code, before, after: readJson(LATEST) });
  console.log(`${TAG} 登録リクエスト: ${result.outcome}（${result.detail}）`);
  if (result.outcome === "needs-login") {
    notify("Google に再ログインが必要: npm run google-console:login");
    problems.push("登録リクエスト: Google に未ログイン");
  } else if (result.outcome === "failed") {
    problems.push(`登録リクエスト: ${result.detail}`);
  } else {
    done.push(`登録リクエスト ${result.outcome}`);
  }
}

// --- 2. 理由別 UI CSV（月次） --------------------------------------------------
const dueOut = spawnSync("node", ["scripts/check-gsc-ui-due.mjs", "--json"], { encoding: "utf8" });
let gscUiDue = null;
try {
  gscUiDue = JSON.parse(dueOut.stdout).channels?.find((c) => c.channel === "gsc-ui")?.due ?? null;
} catch {
  problems.push("UI CSV: check-gsc-ui-due の結果を読めない（検査不成立）");
}
if (gscUiDue === false) {
  console.log(`${TAG} UI CSV: 期限内（月次・check-gsc-ui-due が OK）`);
} else if (gscUiDue === true && DRY) {
  console.log(`${TAG} UI CSV: 期限切れだが --dry-run のため取得しない`);
} else if (gscUiDue === true) {
  const fetched = classifyUiFetchExit(run("node", ["scripts/fetch-gsc-ui-csv.mjs"]));
  console.log(`${TAG} UI CSV 取得: ${fetched.outcome}`);
  if (fetched.normalize) {
    if (run("node", ["scripts/normalize-google-console-csv.mjs"]) !== 0) problems.push("UI CSV: 正規化に失敗");
    if (run("node", ["scripts/check-google-ui-ssot.mjs"]) !== 0) problems.push("UI CSV: SSOT の整合検査が赤");
  }
  if (fetched.outcome === "needs-login") {
    notify("Google に再ログインが必要: npm run google-console:login");
    problems.push("UI CSV: Google に未ログイン");
  } else if (fetched.outcome === "failed") {
    problems.push("UI CSV: 取得に失敗（fetch-gsc-ui-csv の出力を参照）");
  } else {
    done.push(`UI CSV ${fetched.outcome}`);
  }
}

// --- 3. 台帳を commit して develop へ push -------------------------------------
if (DRY) {
  console.log(`${TAG} --dry-run のため commit しない`);
} else {
  git(["add", "--", ...LEDGER_PATHS.filter((p) => existsSync(p))]);
  if (git(["diff", "--cached", "--quiet"]).status === 0) {
    console.log(`${TAG} 台帳に差分なし。commit しない`);
  } else {
    const stamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    const c = git(["commit", "-m", `chore(gsc-local): ${done.join("・") || "GSC 定期処理"} ${stamp} [skip ci]`]);
    if (c.status !== 0) {
      problems.push(`commit に失敗: ${(c.stderr || c.stdout).trim().slice(0, 300)}`);
    } else if (NO_PUSH) {
      console.log(`${TAG} --no-push のため push しない`);
    } else {
      // commit → fetch → rebase → push（CI の書き込み workflow と同じ順序）。他の書き込みと競合したら 1 回だけやり直す。
      let pushed = false;
      for (let attempt = 1; attempt <= 2 && !pushed; attempt += 1) {
        git(["fetch", "-q", "origin", "develop"]);
        if (git(["rebase", "-q", "origin/develop"]).status !== 0) {
          git(["rebase", "--abort"]);
          break;
        }
        pushed = git(["push", "-q", "origin", "HEAD:develop"]).status === 0;
      }
      if (pushed) console.log(`${TAG} develop へ push した`);
      else problems.push("develop への push に失敗（次回の実行は worktree を origin/develop に戻すので、この回の台帳は失われる）");
    }
  }
}

if (problems.length) {
  console.error(`${TAG} ✗ ${problems.length} 件の問題:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`${TAG} ✓ 完了（${done.join("・") || "送るもの・取るものは無かった"}）`);
}

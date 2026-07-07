/**
 * jobs.mjs — 投稿/予約アクションの実行層（P3）。
 *
 * 設計不変条件:
 *   1. **ホワイトリストのみ実行**: action id → 固定コマンド spec。任意コマンドは走らせない。
 *   2. **ガードは既存 CLI 側に残す**: UI は引数を組み立てるだけ。--commit ゲート・
 *      dobokunote assert・x-schedule-guard の BLOCK は各スクリプト内で発火する（UI は迂回不能）。
 *   3. **引数は厳格検証 + shell なし**: pack/draft/date/format を正規表現で検証し、
 *      spawn は shell:false・args 配列（シェル連結しない）。最終ガードで metachar を拒否。
 *   4. **同時 1 ジョブ**: Playwright 永続プロファイルの SingletonLock 衝突を防ぐ。
 *   5. **本番(commit)は明示フラグ必須**: mode!=='commit' の間は投稿系に --dry-run を強制付与。
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const isWin = process.platform === "win32";

// ─── バリデータ ────────────────────────────────────────────
const RE = {
  packRel: /^[A-Za-z0-9][A-Za-z0-9/_-]{0,120}$/, // instagram の相対パス（cem/exam-packs/r07/pack-01 等）
  draft: /^[0-9]{3}(-[A-Za-z0-9-]{1,80})?$/, // X ドラフト（"060" or "060-pe-...-w1"）
  dateJST: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, // 予約日時 JST
  dateYMD: /^\d{4}-\d{2}-\d{2}$/, // 投稿日（ig-status mark --date）
  format: /^(carousel|reels|stories)$/,
  tweetNo: /^([1-9]|[1-4][0-9]|50)$/, // 1..50
  url: /^https:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com|note\.com)\/[A-Za-z0-9/_.?=&%-]{1,200}$/,
  note: /^[\wぁ-んァ-ヶ一-龠々ー 　.,!?:_/()（）-]{1,60}$/u,
  articlePath: /^docs\/note\/[A-Za-z0-9ぁ-んァ-ヶ一-龠々ー/_.-]+\/article[A-Za-z0-9-]*\.md$/u,
};
// path traversal / シェル metachar の最終拒否（全 arg に適用）
const BAD = /(\.\.|[;&|`$<>(){}\n\r"'\\*])/;

function must(re, val, name) {
  if (typeof val !== "string" || !re.test(val)) throw new Error(`invalid ${name}: ${JSON.stringify(val)}`);
  return val;
}

// tsx スクリプトは npx 経由（win は npx.cmd）。node スクリプトは process.execPath。
const NPX = isWin ? "npx.cmd" : "npx";
const nodeCmd = (rel, args) => ({ exe: process.execPath, args: [join(ROOT, rel), ...args] });
const tsxCmd = (rel, args) => ({ exe: NPX, args: ["tsx", join(ROOT, rel), ...args] });

// ─── アクション ホワイトリスト ─────────────────────────────
// build(params, mode) → { exe, args } を返す。mode: 'dry' | 'commit'。
export const ACTIONS = {
  // IG 投稿済み状態を記録（browserless・低リスク）
  "ig-mark": {
    label: "IG 投稿済みを記録",
    needsBrowser: false,
    supportsCommit: true, // dry では何もせず表示、commit で posted.json 書込
    build(p, mode) {
      const pack = must(RE.packRel, p.pack, "pack");
      const fmt = must(RE.format, p.format || "carousel", "format");
      if (mode !== "commit") return null; // mark は dry 相当が無い（実行=書込）ので commit のみ
      const extra = [];
      if (p.url) extra.push(`--url=${must(RE.url, p.url, "url")}`);
      if (p.note) extra.push(`--note=${must(RE.note, p.note, "note")}`);
      if (p.date) extra.push(`--date=${must(RE.dateYMD, p.date, "date")}`);
      return nodeCmd("scripts/ig-status.mjs", ["mark", pack, fmt, ...extra]);
    },
  },
  "ig-unmark": {
    label: "IG 投稿記録を取消",
    needsBrowser: false,
    supportsCommit: true,
    build(p, mode) {
      const pack = must(RE.packRel, p.pack, "pack");
      if (mode !== "commit") return null;
      const args = ["unmark", pack];
      if (p.format) args.push(must(RE.format, p.format, "format"));
      return nodeCmd("scripts/ig-status.mjs", args);
    },
  },
  // X 予約ガード（門番・browserless。--queue は Playwright）
  "x-guard": {
    label: "X 予約ガード（凍結/二重投稿チェック）",
    needsBrowser: false,
    supportsCommit: false, // 常に読み取り検査
    build(p) {
      const args = [];
      if (p.queue) args.push("--queue");
      return nodeCmd("scripts/x-schedule-guard.mjs", args);
    },
  },
  // X 投稿（dry-run 必須 → 本番）
  "x-publish": {
    label: "X 投稿/予約",
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      const draft = must(RE.draft, p.draft, "draft");
      const args = [draft];
      if (p.dates) {
        for (const d of p.dates) args.push(must(RE.dateJST, d, "date"));
      }
      if (p.tweet) args.push("--tweet", must(RE.tweetNo, String(p.tweet), "tweet"));
      if (p.immediate) args.push("--immediate");
      if (mode !== "commit") args.push("--dry-run"); // dry を強制
      return tsxCmd(".claude/skills/social/publish-x/publish-x.ts", args);
    },
  },
  // X 予約の実キュー昇格（偽成功検証）。--dry で確認のみ
  "x-sync": {
    label: "X 予約→posted 昇格検証",
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      return nodeCmd("scripts/x-sync-status.mjs", mode === "commit" ? [] : ["--dry"]);
    },
  },
  // IG カルーセル予約投稿（Business Suite・dry-run 必須 → 本番）
  "ig-publish": {
    label: "IG カルーセル予約投稿",
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      const pack = must(RE.packRel, p.pack, "pack");
      const date = must(RE.dateJST, p.date, "date");
      const args = ["post", pack, "--schedule", date];
      if (mode !== "commit") args.push("--dry-run");
      return tsxCmd(".claude/skills/social/publish-ig-bs/publish-ig-bs.ts", args);
    },
  },
  // note 公開/予約（既定 draft、--commit で公開）
  "note-publish": {
    label: "note 公開/予約",
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      const article = must(RE.articlePath, p.article, "article");
      if (!existsSync(join(ROOT, article))) throw new Error(`article not found: ${article}`);
      const args = ["--article", article];
      if (mode === "commit") {
        args.push("--commit");
        if (p.date) args.push("--schedule", must(RE.dateJST, p.date, "date"));
      }
      // mode!=='commit' は --commit を付けない = note-publish 既定の下書き（安全）
      return nodeCmd("scripts/note-publish.mjs", args);
    },
  },
};

// ─── 実行状態（同時 1 ジョブ）───────────────────────────────
let current = null; // { id, action, mode, exe, args, code, done, buffer[], subscribers:Set }

export function jobStatus() {
  if (!current) return { running: false, last: null };
  return {
    running: !current.done,
    id: current.id,
    action: current.action,
    mode: current.mode,
    code: current.code,
    done: current.done,
    lines: current.buffer.length,
  };
}

/** action を検証・起動し job オブジェクトを返す。既に実行中なら例外。 */
export function startJob({ action, mode = "dry", params = {} }) {
  if (current && !current.done) throw new Error("別のジョブが実行中です（同時 1 本まで）");
  const spec = ACTIONS[action];
  if (!spec) throw new Error(`unknown action: ${action}`);
  if (mode === "commit" && !spec.supportsCommit) throw new Error(`${action} は commit 非対応`);

  const built = spec.build(params, mode);
  if (!built) throw new Error(`${action} は mode=${mode} で実行できません`);

  // 最終ガード: ユーザー由来 arg に危険文字が無いか（flag 形式は許可）。
  // 先頭の固定スクリプトパス（ROOT 配下の絶対パス・Windows は \ を含む）は信頼済みなので除外。
  for (const a of built.args) {
    const s = String(a);
    if (s.startsWith(ROOT)) continue; // 我々が組み立てた固定スクリプトパス
    if (/^--?[a-z-]+$/.test(s)) continue; // 素のフラグ（--dry-run 等）
    const val = s.replace(/^--?[a-z-]+=/, ""); // --key=value の value 側を検査
    if (BAD.test(val)) throw new Error(`unsafe argument blocked: ${a}`);
  }

  const job = {
    id: randomUUID().slice(0, 8),
    action,
    mode,
    exe: built.exe,
    args: built.args,
    code: null,
    done: false,
    buffer: [],
    subscribers: new Set(),
  };
  current = job;

  const emit = (line) => {
    job.buffer.push(line);
    for (const res of job.subscribers) {
      try { res.write(`data: ${JSON.stringify(line)}\n\n`); } catch { /* client gone */ }
    }
  };
  emit({ t: "start", action, mode, cmd: `${built.exe === process.execPath ? "node" : built.exe} ${built.args.map((a) => (a.startsWith(ROOT) ? a.slice(ROOT.length + 1) : a)).join(" ")}` });

  const child = spawn(built.exe, built.args, {
    cwd: ROOT,
    shell: false,
    env: process.env,
    windowsHide: true,
  });
  const onData = (stream) => (chunk) => {
    for (const l of chunk.toString("utf8").split(/\r?\n/)) {
      if (l.length) emit({ t: stream, line: l });
    }
  };
  child.stdout.on("data", onData("out"));
  child.stderr.on("data", onData("err"));
  child.on("error", (err) => { emit({ t: "err", line: `spawn error: ${err.message}` }); });
  child.on("close", (code) => {
    job.code = code;
    job.done = true;
    emit({ t: "end", code });
    for (const res of job.subscribers) { try { res.end(); } catch { /* noop */ } }
  });

  return job;
}

export function currentJob() {
  return current;
}

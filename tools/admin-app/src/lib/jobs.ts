import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { findRepoRoot } from './repo-root';

/**
 * jobs.ts — 投稿/予約アクションの実行層。tools/admin/lib/jobs.mjs を移植。
 *
 * 設計不変条件（旧実装から不変・UI からは迂回不能）:
 *   1. ホワイトリストのみ実行: action id → 固定コマンド spec。任意コマンドは走らせない。
 *   2. ガードは既存 CLI 側に残す: UI は引数を組み立てるだけ（--commit ゲート・dobokunote
 *      assert・x-schedule-guard の BLOCK は各スクリプト内で発火）。
 *   3. 引数は厳格検証 + shell なし: 正規表現検証 + spawn shell:false・args 配列。metachar 拒否。
 *   4. 同時 1 ジョブ: Playwright 永続プロファイルの SingletonLock 衝突を防ぐ。
 *   5. 本番(commit)は明示フラグ必須: mode!=='commit' の間は投稿系に --dry-run を強制付与。
 */

const isWin = process.platform === 'win32';

// ─── バリデータ ────────────────────────────────────────────
const RE = {
  packRel: /^[A-Za-z0-9][A-Za-z0-9/_-]{0,120}$/,
  draft: /^[0-9]{3}(-[A-Za-z0-9-]{1,80})?$/,
  dateJST: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  dateYMD: /^\d{4}-\d{2}-\d{2}$/,
  format: /^(carousel|reels|stories)$/,
  tweetNo: /^([1-9]|[1-4][0-9]|50)$/,
  url: /^https:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com|note\.com)\/[A-Za-z0-9/_.?=&%-]{1,200}$/,
  note: /^[\wぁ-んァ-ヶ一-龠々ー 　.,!?:_/()（）-]{1,60}$/u,
  articlePath: /^docs\/note\/[A-Za-z0-9ぁ-んァ-ヶ一-龠々ー/_.-]+\/article[A-Za-z0-9-]*\.md$/u,
};
// path traversal / シェル metachar の最終拒否（全 arg に適用）
const BAD = /(\.\.|[;&|`$<>(){}\n\r"'\\*])/;

function must(re: RegExp, val: unknown, name: string): string {
  if (typeof val !== 'string' || !re.test(val)) throw new Error(`invalid ${name}: ${JSON.stringify(val)}`);
  return val;
}

export interface JobParams {
  pack?: string;
  format?: string;
  url?: string;
  note?: string;
  date?: string;
  draft?: string;
  dates?: string[];
  tweet?: string | number;
  immediate?: boolean;
  queue?: boolean;
  article?: string;
}
export type JobMode = 'dry' | 'commit';
interface BuiltCommand {
  exe: string;
  args: string[];
}
interface ActionSpec {
  label: string;
  needsBrowser: boolean;
  supportsCommit: boolean;
  build: (p: JobParams, mode: JobMode) => BuiltCommand | null;
}

function ROOT(): string {
  return findRepoRoot();
}
const NPX = isWin ? 'npx.cmd' : 'npx';
const nodeCmd = (rel: string, args: string[]): BuiltCommand => ({ exe: process.execPath, args: [join(ROOT(), rel), ...args] });
const tsxCmd = (rel: string, args: string[]): BuiltCommand => ({ exe: NPX, args: ['tsx', join(ROOT(), rel), ...args] });

// ─── アクション ホワイトリスト ─────────────────────────────
export const ACTIONS: Record<string, ActionSpec> = {
  'ig-mark': {
    label: 'IG 投稿済みを記録',
    needsBrowser: false,
    supportsCommit: true,
    build(p, mode) {
      const pack = must(RE.packRel, p.pack, 'pack');
      const fmt = must(RE.format, p.format || 'carousel', 'format');
      if (mode !== 'commit') return null; // mark は dry 相当なし（実行=書込）
      const extra: string[] = [];
      if (p.url) extra.push(`--url=${must(RE.url, p.url, 'url')}`);
      if (p.note) extra.push(`--note=${must(RE.note, p.note, 'note')}`);
      if (p.date) extra.push(`--date=${must(RE.dateYMD, p.date, 'date')}`);
      return nodeCmd('scripts/ig-status.mjs', ['mark', pack, fmt, ...extra]);
    },
  },
  'ig-unmark': {
    label: 'IG 投稿記録を取消',
    needsBrowser: false,
    supportsCommit: true,
    build(p, mode) {
      const pack = must(RE.packRel, p.pack, 'pack');
      if (mode !== 'commit') return null;
      const args = ['unmark', pack];
      if (p.format) args.push(must(RE.format, p.format, 'format'));
      return nodeCmd('scripts/ig-status.mjs', args);
    },
  },
  'x-guard': {
    label: 'X 予約ガード（凍結/二重投稿チェック）',
    needsBrowser: false,
    supportsCommit: false,
    build(p) {
      const args: string[] = [];
      if (p.queue) args.push('--queue');
      return nodeCmd('scripts/x-schedule-guard.mjs', args);
    },
  },
  'x-publish': {
    label: 'X 投稿/予約',
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      const draft = must(RE.draft, p.draft, 'draft');
      const args = [draft];
      if (p.dates) for (const d of p.dates) args.push(must(RE.dateJST, d, 'date'));
      if (p.tweet) args.push('--tweet', must(RE.tweetNo, String(p.tweet), 'tweet'));
      if (p.immediate) args.push('--immediate');
      if (mode !== 'commit') args.push('--dry-run');
      return tsxCmd('.claude/skills/social/publish-x/publish-x.ts', args);
    },
  },
  'x-sync': {
    label: 'X 予約→posted 昇格検証',
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      return nodeCmd('scripts/x-sync-status.mjs', mode === 'commit' ? [] : ['--dry']);
    },
  },
  'ig-publish': {
    label: 'IG カルーセル予約投稿',
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      const pack = must(RE.packRel, p.pack, 'pack');
      const date = must(RE.dateJST, p.date, 'date');
      const args = ['post', pack, '--schedule', date];
      if (mode !== 'commit') args.push('--dry-run');
      return tsxCmd('.claude/skills/social/publish-ig-bs/publish-ig-bs.ts', args);
    },
  },
  'note-publish': {
    label: 'note 公開/予約',
    needsBrowser: true,
    supportsCommit: true,
    build(p, mode) {
      const article = must(RE.articlePath, p.article, 'article');
      if (!existsSync(join(ROOT(), article))) throw new Error(`article not found: ${article}`);
      const args = ['--article', article];
      if (mode === 'commit') {
        args.push('--commit');
        if (p.date) args.push('--schedule', must(RE.dateJST, p.date, 'date'));
      }
      return nodeCmd('scripts/note-publish.mjs', args);
    },
  },
};

export interface ActionMeta {
  id: string;
  label: string;
  needsBrowser: boolean;
  supportsCommit: boolean;
}
export function listActions(): ActionMeta[] {
  return Object.entries(ACTIONS).map(([id, a]) => ({
    id,
    label: a.label,
    needsBrowser: a.needsBrowser,
    supportsCommit: a.supportsCommit,
  }));
}

// ─── 実行状態（同時 1 ジョブ）───────────────────────────────
interface JobState {
  id: string;
  action: string;
  mode: JobMode;
  code: number | null;
  done: boolean;
  lines: number;
  child: ChildProcess | null;
}
let current: JobState | null = null;

export interface JobStatus {
  running: boolean;
  id?: string;
  action?: string;
  mode?: JobMode;
  code?: number | null;
  done?: boolean;
  lines?: number;
  last?: null;
}
export function jobStatus(): JobStatus {
  if (!current) return { running: false, last: null };
  return {
    running: !current.done,
    id: current.id,
    action: current.action,
    mode: current.mode,
    code: current.code,
    done: current.done,
    lines: current.lines,
  };
}

type SseEvent =
  | { t: 'start'; action: string; mode: JobMode; cmd: string }
  | { t: 'out' | 'err'; line: string }
  | { t: 'end'; code: number | null };

/**
 * action を検証・spawn し、SSE イベント（start/out/err/end）を流す Web ReadableStream を返す。
 * 検証失敗・実行中は例外（呼び出し側の route が 400/409 に変換）。
 */
export function startJobStream({ action, mode = 'dry', params = {} }: { action: string; mode?: JobMode; params?: JobParams }): ReadableStream<Uint8Array> {
  if (current && !current.done) throw Object.assign(new Error('別のジョブが実行中です（同時 1 本まで）'), { code: 'BUSY' });
  const spec = ACTIONS[action];
  if (!spec) throw new Error(`unknown action: ${action}`);
  if (mode === 'commit' && !spec.supportsCommit) throw new Error(`${action} は commit 非対応`);

  const built = spec.build(params, mode);
  if (!built) throw new Error(`${action} は mode=${mode} で実行できません`);

  const root = ROOT();
  // 最終ガード: ユーザー由来 arg に危険文字が無いか（固定スクリプトパス・素フラグは除外）。
  for (const a of built.args) {
    const s = String(a);
    if (s.startsWith(root)) continue; // 我々が組み立てた固定スクリプトパス
    if (/^--?[a-z-]+$/.test(s)) continue; // 素のフラグ
    const val = s.replace(/^--?[a-z-]+=/, ''); // --key=value の value 側
    if (BAD.test(val)) throw new Error(`unsafe argument blocked: ${a}`);
  }

  const job: JobState = { id: randomUUID().slice(0, 8), action, mode, code: null, done: false, lines: 0, child: null };
  current = job;

  const enc = new TextEncoder();
  const cmdStr = `${built.exe === process.execPath ? 'node' : built.exe} ${built.args
    .map((a) => (a.startsWith(root) ? a.slice(root.length + 1) : a))
    .join(' ')}`;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (ev: SseEvent) => {
        job.lines++;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          /* client gone */
        }
      };
      emit({ t: 'start', action, mode, cmd: cmdStr });

      const child = spawn(built.exe, built.args, { cwd: root, shell: false, env: process.env, windowsHide: true });
      job.child = child;
      const onData = (stream: 'out' | 'err') => (chunk: Buffer) => {
        for (const l of chunk.toString('utf8').split(/\r?\n/)) if (l.length) emit({ t: stream, line: l });
      };
      child.stdout?.on('data', onData('out'));
      child.stderr?.on('data', onData('err'));
      child.on('error', (err) => emit({ t: 'err', line: `spawn error: ${err.message}` }));
      child.on('close', (code) => {
        job.code = code;
        job.done = true;
        emit({ t: 'end', code });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      // クライアント切断でも子プロセスは走らせ切る（投稿の中断が状態不整合を生むため）。
      // ここでは購読解除のみ。job.done は close で確定する。
    },
  });
}

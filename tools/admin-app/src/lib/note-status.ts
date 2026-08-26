/**
 * note の公開状態・マガジン収録状態を「真実源から」読むための lib。
 *
 * 背景（2026-08-24）: 総監模範論文の R8 予想テーマ拡張で、ゼネコン/河川コンサルの記事 2 本ずつが
 *   repo に在るのにライブマガジン未収録のまま残り、SoT の件数表記も古いままだった。
 *   SoT↔ライブの 2 者突合では両方が同値で古びると永久に緑になる。三軸（repo 実数・SoT・ライブ）を
 *   一画面で並べて、**ズレと「そもそも判定できていない」を区別して見えるようにする**のがこの画面の目的。
 *
 * 方針（tools/admin-app/README.md）:
 *   - ライブ API は叩かない。ライブの値は CI（note-live-audit.yml 週次）が供給する
 *     `.claude/state/note/*.json` を読むだけ。
 *   - 判定ロジックは CLI 側に残し、ここは `--json` を実行して結果を表示するだけ。
 *   - **取得に失敗したら空ではなく `ok:false` を返す**（CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 *     空を返すと画面が全件緑になり、検査していないことが「問題なし」に化ける。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { findRepoRoot, repoPath } from './repo-root';

/** 週次供給＋2日バッファ。check-magazine-membership.mjs の STALE_DAYS と揃える。 */
export const STALE_DAYS = 9;

// ─── 三軸突合（check-magazine-membership --json）─────────

export interface MembershipRow {
  id: string;
  title: string;
  labels: string[];
  repoCount: number;
  extra: number;
  expected: number;
  declared: number | null;
  liveCount: number | null;
  ok: boolean;
  kind: string;
  detail: string;
  descWarn?: string;
}

export interface MembershipState {
  ok: boolean;
  error: string | null;
  rows: MembershipRow[];
  violations: MembershipRow[];
  unclassified: { label: string; count: number }[];
  unreferenced: string[];
  freshness: { ok: boolean; reason: string; ageDays: number | null; fetchedAt: string | null };
  articles: number;
}

const EMPTY = {
  rows: [] as MembershipRow[],
  violations: [] as MembershipRow[],
  unclassified: [] as { label: string; count: number }[],
  unreferenced: [] as string[],
  freshness: { ok: false, reason: '未取得', ageDays: null, fetchedAt: null },
  articles: 0,
};

/**
 * 三軸突合の結果を読む。
 *
 * `--ci` は付けない。CI モードは snapshot が腐っていると exit 2 で落ちるが、
 * 管理画面では「腐っている」こと自体を**表示したい**（落として何も見せないのは逆効果）。
 * 既定モードは軸 C を「未検査」扱いにして exit 0 のまま結果を返す。
 */
export function membershipState(): MembershipState {
  try {
    const out = execFileSync(
      process.execPath,
      [repoPath('scripts', 'check-magazine-membership.mjs'), '--json'],
      { cwd: findRepoRoot(), encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024 },
    );
    const d = JSON.parse(out) as Partial<MembershipState>;
    return {
      ok: true,
      error: null,
      rows: d.rows ?? [],
      violations: d.violations ?? [],
      unclassified: d.unclassified ?? [],
      unreferenced: d.unreferenced ?? [],
      freshness: d.freshness ?? EMPTY.freshness,
      articles: d.articles ?? 0,
    };
  } catch (e) {
    // exit 1（ズレあり）でも stdout に JSON は出ている。拾えるなら拾う。
    const err = e as { stdout?: string; message?: string };
    if (err.stdout) {
      try {
        const d = JSON.parse(err.stdout) as Partial<MembershipState>;
        return {
          ok: true,
          error: null,
          rows: d.rows ?? [],
          violations: d.violations ?? [],
          unclassified: d.unclassified ?? [],
          unreferenced: d.unreferenced ?? [],
          freshness: d.freshness ?? EMPTY.freshness,
          articles: d.articles ?? 0,
        };
      } catch {
        /* JSON でなければ下の ok:false へ落とす */
      }
    }
    return { ok: false, error: (err.message ?? String(e)).slice(0, 200), ...EMPTY };
  }
}

// ─── 記事別の公開状態（CI 供給の status-snapshot.json）─────────

export interface StatusSnapshot {
  ok: boolean;
  error: string | null;
  fetchedAt: string | null;
  ageDays: number | null;
  stale: boolean;
  tracked: number;
  untracked: number;
  inspected: number;
  drift: { rel: string; status: string }[];
  warn: { rel: string; status: string; live: string }[];
  noLive: { rel: string; status: string }[];
}

const EMPTY_STATUS = {
  fetchedAt: null,
  ageDays: null,
  stale: true,
  tracked: 0,
  untracked: 0,
  inspected: 0,
  drift: [],
  warn: [],
  noLive: [],
};

/**
 * 記事別のライブ公開状態。**ここは CLI を実行しない**——照合には note API への
 * 数百リクエストが要り、管理画面の役割ではない（README「ライブ API は叩かない」）。
 * CI（note-live-audit.yml 週次）が書いた snapshot を読むだけ。無ければ `ok:false`。
 */
export function statusSnapshot(now: number = Date.now()): StatusSnapshot {
  try {
    const raw = readFileSync(repoPath('.claude', 'state', 'note', 'status-snapshot.json'), 'utf8');
    const d = JSON.parse(raw) as Record<string, unknown>;
    const fetchedAt = (d.fetchedAt as string) ?? null;
    const t = fetchedAt ? Date.parse(fetchedAt) : NaN;
    const ageDays = Number.isNaN(t) ? null : Math.floor((now - t) / 86_400_000);
    return {
      ok: true,
      error: null,
      fetchedAt,
      ageDays,
      stale: ageDays == null || ageDays > STALE_DAYS,
      tracked: (d.tracked as number) ?? 0,
      untracked: (d.untracked as number) ?? 0,
      inspected: (d.inspected as number) ?? 0,
      drift: (d.drift as StatusSnapshot['drift']) ?? [],
      warn: (d.warn as StatusSnapshot['warn']) ?? [],
      noLive: (d.noLive as StatusSnapshot['noLive']) ?? [],
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200), ...EMPTY_STATUS };
  }
}
